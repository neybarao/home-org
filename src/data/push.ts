import type { Person } from '../lib/types'
import { supabase } from './supabase'

/*
 * Notificações push. O celular se inscreve com a chave pública que a função "push"
 * do Supabase gera, e a inscrição vira uma linha em push_subscriptions.
 * Quem manda os avisos é a função (gatilho do banco e pg_cron), veja supabase/push.sql.
 */

export interface PushPrefs {
  notify_claims: boolean
  reminder_enabled: boolean
  /** 'HH:MM' ou 'HH:MM:SS' */
  reminder_time: string
  /** Dia do último lembrete. Zerado ao trocar o horário, para valer já hoje. */
  last_reminder?: string | null
}

export interface PushRow extends PushPrefs {
  endpoint: string
}

export type PushSupport = 'ok' | 'install' | 'unsupported'

function standalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

export function pushSupport(): PushSupport {
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  // No iPhone, push só existe com o app instalado na tela inicial.
  if (ios && !standalone()) return 'install'
  return ok ? 'ok' : 'unsupported'
}

export function permission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

function db() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function registration() {
  return navigator.serviceWorker.ready
}

/** Inscrição deste celular, se existir e estiver no banco. */
export async function currentPush(): Promise<PushRow | null> {
  if (pushSupport() !== 'ok') return null
  const sub = await (await registration()).pushManager.getSubscription()
  if (!sub) return null
  const { data, error } = await db()
    .from('push_subscriptions')
    .select('endpoint, notify_claims, reminder_enabled, reminder_time')
    .eq('endpoint', sub.endpoint)
    .maybeSingle()
  if (error) throw error
  return (data as PushRow | null) ?? null
}

/** Pede permissão e inscreve este celular. Chamar direto no toque do botão. */
export async function enablePush(person: Person): Promise<PushRow> {
  // Primeira coisa, ainda dentro do toque: o iPhone só mostra o pedido assim.
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'denied' : 'dismissed')

  const { data: v, error: ve } = await db().functions.invoke<{ publicKey: string }>('push', { body: { type: 'vapid' } })
  if (ve || !v?.publicKey) throw ve ?? new Error('Sem chave do servidor')

  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(v.publicKey) })
  const json = sub.toJSON()

  const { data: session } = await db().auth.getSession()
  const { data, error } = await db()
    .from('push_subscriptions')
    .upsert(
      { endpoint: sub.endpoint, user_id: session.session?.user.id, person, p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      { onConflict: 'endpoint' },
    )
    .select('endpoint, notify_claims, reminder_enabled, reminder_time')
    .single()
  if (error) throw error
  return data as PushRow
}

export async function updatePush(endpoint: string, patch: Partial<PushPrefs>): Promise<void> {
  const { error } = await db().from('push_subscriptions').update(patch).eq('endpoint', endpoint)
  if (error) throw error
}

/** Desliga neste celular (também usado ao sair da conta). */
export async function disablePush(): Promise<void> {
  if (pushSupport() !== 'ok') return
  const sub = await (await registration()).pushManager.getSubscription()
  if (!sub) return
  await db().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function sendTestPush(): Promise<number> {
  const { data, error } = await db().functions.invoke<{ sent: number }>('push', { body: { type: 'test' } })
  if (error) throw error
  return data?.sent ?? 0
}
