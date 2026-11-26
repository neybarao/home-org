// Dia: envia as notificações push.
// Chamadas:
//   {type:'vapid'}                    -> chave pública (o app precisa dela para se inscrever)
//   {type:'test'} + login do app      -> manda um aviso de teste para os celulares da pessoa
//   {type:'claim'} + x-dia-secret     -> gatilho do banco: alguém assumiu ou soltou uma tarefa
//   {type:'reminders'} + x-dia-secret -> pg_cron: lembrete do dia de quem chegou no horário
//
// Cópias de src/lib (dates, schedule, types) ficam em ./lib. Ao mudar a lógica de agenda
// no app, rode `npm run push:lib` e publique a função de novo.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { dayView } from './lib/schedule.ts'
import type { HomeData, OccurrenceState, Person, TaskTemplate } from './lib/types.ts'

const TZ = 'America/Campo_Grande'
// O service worker abre o próprio escopo do app; isto é só um fallback.
const APP_URL = 'https://neybarao.github.io/home-org/'
const NAMES: Record<Person, string> = { ney: 'Ney', cleide: 'Cleidi' }

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

interface Config {
  hook_secret: string
  vapid_public: string | null
  vapid_private: string | null
}

async function config(): Promise<Config & { vapid_public: string; vapid_private: string }> {
  const { data, error } = await admin.rpc('push_get_config')
  if (error) throw error
  let c = data as Config
  if (!c.vapid_public || !c.vapid_private) {
    // Primeira vez: gera as chaves aqui mesmo, sem ninguém precisar copiar segredo.
    const keys = webpush.generateVAPIDKeys()
    const { error: e } = await admin.rpc('push_set_vapid', { pub: keys.publicKey, priv: keys.privateKey })
    if (e) throw e
    const again = await admin.rpc('push_get_config')
    if (again.error) throw again.error
    c = again.data as Config
  }
  webpush.setVapidDetails('mailto:neybarao@gmail.com', c.vapid_public!, c.vapid_private!)
  return c as Config & { vapid_public: string; vapid_private: string }
}

interface Sub {
  endpoint: string
  user_id: string
  person: Person
  p256dh: string
  auth: string
  notify_claims: boolean
  reminder_enabled: boolean
  reminder_time: string
  last_reminder: string | null
}

interface Message {
  title: string
  body: string
  tag?: string
}

/** Envia para cada celular. Inscrição vencida (404/410) é apagada. */
async function send(subs: Sub[], msg: Message): Promise<number> {
  let sent = 0
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ ...msg, url: APP_URL }),
          { TTL: 60 * 60 * 6, urgency: 'normal' },
        )
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        else console.error('push falhou', code, (e as Error).message)
      }
    }),
  )
  return sent
}

function nowInTZ(): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

async function loadHome(): Promise<HomeData> {
  const [t, o, s] = await Promise.all([
    admin.from('templates').select('*'),
    admin.from('occurrences').select('*'),
    admin.from('settings').select('*').eq('id', 1).single(),
  ])
  if (t.error) throw t.error
  if (o.error) throw o.error
  if (s.error) throw s.error
  const templates: TaskTemplate[] = (t.data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    room: r.room,
    frequency: r.frequency,
    priority: r.priority,
    special: r.special,
    active: r.active,
    ...(r.closing ? { closing: true } : {}),
    ...(r.owner ? { owner: r.owner } : {}),
  }))
  const occurrences: Record<string, OccurrenceState> = {}
  for (const r of o.data ?? []) {
    const st: OccurrenceState = {}
    if (r.planned_date) st.plannedDate = r.planned_date
    if (r.claimed_by === 'none') st.claimedBy = null
    else if (r.claimed_by) st.claimedBy = r.claimed_by
    if (r.done_by) st.doneBy = r.done_by
    if (r.done_on) st.doneOn = r.done_on
    occurrences[r.key] = st
  }
  return {
    version: 1,
    templates,
    occurrences,
    settings: { dailyLimit: s.data.daily_limit, startDate: s.data.start_date, showSummary: s.data.show_summary },
  }
}

function reminderFor(home: HomeData, person: Person, today: string): Message | null {
  const view = dayView(home, today)
  const pending = [...view.today, ...view.overdue].filter((i) => !i.occ.doneBy)
  const mine = pending.filter((i) => i.occ.claimedBy === person)
  const free = pending.filter((i) => !i.occ.claimedBy)
  if (mine.length === 0 && free.length === 0) return null
  const parts: string[] = []
  if (mine.length) parts.push(mine.length === 1 ? '1 sua' : `${mine.length} suas`)
  if (free.length) parts.push(free.length === 1 ? '1 livre' : `${free.length} livres`)
  const first = (mine[0] ?? free[0]).task.title
  return {
    title: `Hoje: ${parts.join(' e ')}`,
    body: mine.length + free.length > 1 ? `Começa por: ${first}` : first,
    tag: `lembrete-${today}`,
  }
}

async function handleClaim(body: { actor: Person; kind: 'assumiu' | 'soltou'; key: string }) {
  const other: Person = body.actor === 'ney' ? 'cleide' : 'ney'
  const templateId = body.key.split('@')[0]
  const { data: t } = await admin.from('templates').select('title, owner').eq('id', templateId).maybeSingle()
  if (!t) return { sent: 0 }
  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('person', other).eq('notify_claims', true)
  if (!subs?.length) return { sent: 0 }
  const who = NAMES[body.actor]
  const msg: Message =
    body.kind === 'assumiu'
      ? t.owner === other
        ? { title: `${who} pegou uma tarefa sua`, body: t.title }
        : { title: `${who} assumiu`, body: t.title }
      : { title: `${who} soltou uma tarefa`, body: `${t.title} está livre` }
  return { sent: await send(subs as Sub[], { ...msg, tag: `claim-${body.key}` }) }
}

async function handleReminders() {
  const { date, time } = nowInTZ()
  const { data } = await admin.from('push_subscriptions').select('*').eq('reminder_enabled', true)
  const due = ((data ?? []) as Sub[]).filter((s) => {
    const at = s.reminder_time.slice(0, 5)
    // Chegou no horário hoje e ainda não mandou. Janela de 3 h para não avisar tarde demais.
    const [h, m] = at.split(':').map(Number)
    const [nh, nm] = time.split(':').map(Number)
    const late = nh * 60 + nm - (h * 60 + m)
    return late >= 0 && late < 180 && s.last_reminder !== date
  })
  if (!due.length) return { sent: 0 }
  const home = await loadHome()
  let sent = 0
  for (const s of due) {
    // Marca antes de enviar, para nunca mandar duas vezes no mesmo dia.
    await admin.from('push_subscriptions').update({ last_reminder: date }).eq('endpoint', s.endpoint)
    const msg = reminderFor(home, s.person, date)
    if (msg) sent += await send([s], msg)
  }
  return { sent }
}

async function handleTest(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'sem login' }, 401)
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user) return json({ error: 'login inválido' }, 401)
  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', data.user.id)
  if (!subs?.length) return json({ sent: 0 })
  const sent = await send(subs as Sub[], { title: 'Notificações ligadas', body: 'É assim que os avisos do Dia vão chegar.', tag: 'teste' })
  return json({ sent })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const c = await config()
    if (body.type === 'vapid') return json({ publicKey: c.vapid_public })
    if (body.type === 'test') return await handleTest(req)
    if (req.headers.get('x-dia-secret') !== c.hook_secret) return json({ error: 'não autorizado' }, 401)
    if (body.type === 'claim') return json(await handleClaim(body))
    if (body.type === 'reminders') return json(await handleReminders())
    return json({ error: 'tipo desconhecido' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})
