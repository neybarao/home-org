import { useSyncExternalStore } from 'react'
import { todayISO } from '../lib/dates'
import { demoData } from '../lib/seed'
import type { HomeData, Move, OccurrenceState, Person, Settings, TaskTemplate } from '../lib/types'
import {
  applyDiff,
  diff,
  fetchAll,
  isEmptyDiff,
  isEmptyRemote,
  keepOrder,
  occToRow,
  pushDiff,
  subscribe,
  templateToRow,
  type RemoteChange,
} from './remote'
import { loadBase, localRepo, saveBase, type HomeRepo } from './repo'
import { supabase } from './supabase'

/*
 * Como os dados andam:
 * - `data` é o que a tela mostra. Fica salvo no localStorage (cache), então o app abre sem internet.
 * - `base` é o último estado conhecido do banco. O que difere entre `base` e `data` ainda não subiu.
 * - Cada mudança local sobe só a diferença. O que chega pelo Realtime atualiza `base` e,
 *   se aquela linha não tem mudança local pendente, também `data`.
 */

const repo: HomeRepo = localRepo

let data: HomeData = repo.load() ?? demoData(todayISO())
let base: HomeData | null = loadBase()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

function setData(next: HomeData) {
  data = next
  repo.save(data)
  notify()
}

function setBase(next: HomeData | null) {
  base = next
  saveBase(next)
}

function commit(next: HomeData) {
  setData(next)
  if (active) queue(flush)
}

function patchOcc(key: string, fn: (s: OccurrenceState) => OccurrenceState) {
  const current = data.occurrences[key] ?? {}
  commit({ ...data, occurrences: { ...data.occurrences, [key]: fn(current) } })
}

export function useHome(): HomeData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => data,
  )
}

// ---------- Status da sincronização ----------

export type SyncState = 'local' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error'
export interface SyncStatus {
  state: SyncState
  /** Momento da última sincronização completa (ms). */
  lastSync?: number
  message?: string
}

let status: SyncStatus = { state: supabase ? 'connecting' : 'local' }
const statusListeners = new Set<() => void>()

function setStatus(patch: Partial<SyncStatus> & { state: SyncState }) {
  status = { lastSync: status.lastSync, ...patch }
  statusListeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l)
      return () => statusListeners.delete(l)
    },
    () => status,
  )
}

// ---------- Sincronização ----------

let active = false
let unsubscribe: (() => void) | null = null
let retryTimer: number | undefined
let chain: Promise<void> = Promise.resolve()

/** Uma operação com o banco por vez, na ordem. */
function queue(fn: () => Promise<void>) {
  chain = chain.then(fn).catch(() => {})
}

function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

function failed(e: unknown) {
  if (!navigator.onLine) setStatus({ state: 'offline' })
  else setStatus({ state: 'error', message: errorMessage(e) })
  window.clearTimeout(retryTimer)
  retryTimer = window.setTimeout(() => active && queue(refresh), 15_000)
}

/** Lê tudo do banco e junta com as mudanças locais que ainda não subiram. */
async function refresh() {
  if (!active) return
  if (!navigator.onLine) return setStatus({ state: 'offline' })
  setStatus({ state: 'syncing' })
  try {
    const remote = await fetchAll()
    if (!active) return
    if (!base) {
      // Primeira vez neste celular.
      if (isEmptyRemote(remote)) {
        // Banco vazio: sobe o que este celular já tem (tarefas, histórico e ajustes).
        setBase(remote)
      } else {
        // O banco já tem a casa: ela vale mais que os dados de exemplo daqui.
        setBase(remote)
        setData({ ...remote, templates: keepOrder(remote.templates, data.templates) })
      }
    } else {
      const pending = diff(base, data)
      const merged = applyDiff(remote, pending)
      setBase(remote)
      setData({ ...merged, templates: keepOrder(merged.templates, data.templates) })
    }
    await flush()
  } catch (e) {
    failed(e)
  }
}

/** Envia o que mudou aqui e ainda não está no banco. */
async function flush() {
  if (!active || !base) return
  try {
    for (let i = 0; i < 5; i++) {
      const d = diff(base, data)
      if (isEmptyDiff(d)) {
        window.clearTimeout(retryTimer)
        return setStatus({ state: 'synced', lastSync: Date.now() })
      }
      setStatus({ state: 'syncing' })
      await pushDiff(d)
      if (!base) return
      setBase(applyDiff(base, d))
    }
  } catch (e) {
    failed(e)
  }
}

const sameJSON = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Mudança vinda do outro celular. */
function applyRemote(c: RemoteChange) {
  if (!base) return
  if (c.table === 'settings') {
    const pending = !sameJSON(base.settings, data.settings)
    setBase({ ...base, settings: c.settings })
    if (!pending) setData({ ...data, settings: c.settings })
    return
  }
  if (c.table === 'templates') {
    const id = c.deleted ? c.id : c.template.id
    const row = (t?: TaskTemplate) => (t ? templateToRow(t) : null)
    const b = base.templates.find((t) => t.id === id)
    const d = data.templates.find((t) => t.id === id)
    const pending = !sameJSON(row(b), row(d))
    const put = (list: TaskTemplate[]) => {
      if (c.deleted) return list.filter((t) => t.id !== id)
      return list.some((t) => t.id === id) ? list.map((t) => (t.id === id ? c.template : t)) : [...list, c.template]
    }
    setBase({ ...base, templates: put(base.templates) })
    if (!pending) setData({ ...data, templates: put(data.templates) })
    return
  }
  const key = c.key
  const row = (s?: OccurrenceState) => (s ? occToRow(key, s) : null)
  const pending = !sameJSON(row(base.occurrences[key]), row(data.occurrences[key]))
  const put = (occ: Record<string, OccurrenceState>) => {
    const next = { ...occ }
    if (c.deleted) delete next[key]
    else next[key] = c.state
    return next
  }
  setBase({ ...base, occurrences: put(base.occurrences) })
  if (!pending) setData({ ...data, occurrences: put(data.occurrences) })
}

function onVisible() {
  if (document.visibilityState === 'visible') queue(refresh)
}
function onOnline() {
  queue(refresh)
}
function onOffline() {
  setStatus({ state: 'offline' })
}

/** Liga a sincronização. Só depois do login e de a conta estar em public.members. */
export function startSync() {
  if (!supabase || active) return
  active = true
  setStatus({ state: 'connecting' })
  let first = true
  unsubscribe = subscribe(applyRemote, (connected) => {
    // Na primeira conexão e em cada reconexão do Realtime, lê tudo de novo:
    // pode ter mudado algo enquanto este celular estava desconectado.
    if (connected && !first) queue(refresh)
    first = false
  })
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  queue(refresh)
}

export function stopSync() {
  if (!active) return
  active = false
  unsubscribe?.()
  unsubscribe = null
  window.clearTimeout(retryTimer)
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  setStatus({ state: supabase ? 'connecting' : 'local' })
}

/** Lê tudo de novo agora (botão em Ajustes e puxar para atualizar). Resolve quando termina. */
export function syncNow(): Promise<void> {
  if (active) queue(refresh)
  return chain
}

// ---------- Ações ----------

export const actions = {
  /**
   * Assume a tarefa. Se já era sua, solta. Se era do outro, passa para você.
   * `current` é quem está com ela agora, contando o dono padrão.
   */
  claim(key: string, me: Person, current?: Person) {
    patchOcc(key, (s) => ({ ...s, claimedBy: current === me ? null : me }))
  },

  toggleDone(key: string, me: Person, today: string, current?: Person) {
    patchOcc(key, (s) =>
      s.doneBy
        ? { ...s, doneBy: undefined, doneOn: undefined }
        : { ...s, claimedBy: current ?? me, doneBy: current ?? me, doneOn: today },
    )
  },

  applyMoves(moves: Move[]) {
    const occurrences = { ...data.occurrences }
    // Quem tinha assumido solta; se a tarefa tem dono, continua com ele.
    for (const m of moves) occurrences[m.key] = { ...occurrences[m.key], plannedDate: m.to, claimedBy: undefined }
    commit({ ...data, occurrences })
  },

  saveTemplate(t: TaskTemplate) {
    const exists = data.templates.some((x) => x.id === t.id)
    commit({ ...data, templates: exists ? data.templates.map((x) => (x.id === t.id ? t : x)) : [...data.templates, t] })
  },

  /** Tarefa extra: de uma vez, só para o dia, fora do planejamento. */
  addExtra(title: string, date: string, owner?: Person) {
    const id = `extra-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const t: TaskTemplate = { id, title: title.trim(), room: 'Extra', frequency: { kind: 'once', date }, priority: 'normal', special: false, active: true }
    if (owner) t.owner = owner
    commit({ ...data, templates: [...data.templates, t] })
  },

  /** Apaga a tarefa extra e o que foi marcado nela. */
  removeExtra(id: string) {
    const occurrences = Object.fromEntries(Object.entries(data.occurrences).filter(([k]) => !k.startsWith(`${id}@`)))
    commit({ ...data, templates: data.templates.filter((x) => x.id !== id), occurrences })
  },

  deleteTemplate(id: string) {
    commit({ ...data, templates: data.templates.filter((x) => x.id !== id) })
  },

  setSettings(patch: Partial<Settings>) {
    commit({ ...data, settings: { ...data.settings, ...patch } })
  },

  resetDemo() {
    commit(demoData(todayISO()))
  },

  /** Zera o histórico e começa a contar a partir de hoje, mantendo as tarefas cadastradas. */
  startFresh() {
    commit({ ...data, occurrences: {}, settings: { ...data.settings, startDate: todayISO() } })
  },
}
