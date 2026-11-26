import type { RealtimeChannel } from '@supabase/supabase-js'
import type { HomeData, OccurrenceState, Person, Settings, TaskTemplate } from '../lib/types'
import { supabase } from './supabase'

// ---------- Linhas das tabelas ----------

export interface TemplateRow {
  id: string
  title: string
  room: string
  frequency: TaskTemplate['frequency']
  priority: TaskTemplate['priority']
  special: boolean
  active: boolean
  closing: boolean
  owner: Person | null
  note?: string | null
}

export interface OccurrenceRow {
  key: string
  planned_date: string | null
  /** null = ninguém mexeu (vale o dono), 'none' = soltaram de propósito. */
  claimed_by: Person | 'none' | null
  done_by: Person | null
  done_on: string | null
}

export interface SettingsRow {
  id: 1
  daily_limit: number
  start_date: string
  show_summary: boolean
}

// ---------- Conversão entre o app e o banco ----------

export function templateToRow(t: TaskTemplate): TemplateRow {
  return {
    id: t.id,
    title: t.title,
    room: t.room,
    frequency: t.frequency,
    priority: t.priority,
    special: t.special,
    active: t.active,
    closing: t.closing ?? false,
    owner: t.owner ?? null,
    note: t.note?.trim() || null,
  }
}

export function rowToTemplate(r: TemplateRow): TaskTemplate {
  const t: TaskTemplate = {
    id: r.id,
    title: r.title,
    room: r.room,
    frequency: r.frequency,
    priority: r.priority,
    special: r.special,
    active: r.active,
  }
  if (r.closing) t.closing = true
  if (r.owner) t.owner = r.owner
  if (r.note) t.note = r.note
  return t
}

export function occToRow(key: string, s: OccurrenceState): OccurrenceRow {
  return {
    key,
    planned_date: s.plannedDate ?? null,
    claimed_by: s.claimedBy === null ? 'none' : (s.claimedBy ?? null),
    done_by: s.doneBy ?? null,
    done_on: s.doneOn ?? null,
  }
}

export function rowToOcc(r: OccurrenceRow): OccurrenceState {
  const s: OccurrenceState = {}
  if (r.planned_date) s.plannedDate = r.planned_date
  if (r.claimed_by === 'none') s.claimedBy = null
  else if (r.claimed_by) s.claimedBy = r.claimed_by
  if (r.done_by) s.doneBy = r.done_by
  if (r.done_on) s.doneOn = r.done_on
  return s
}

export function settingsToRow(s: Settings): SettingsRow {
  return { id: 1, daily_limit: s.dailyLimit, start_date: s.startDate, show_summary: s.showSummary }
}

export function rowToSettings(r: SettingsRow): Settings {
  return { dailyLimit: r.daily_limit, startDate: r.start_date, showSummary: r.show_summary }
}

// ---------- Diferença entre dois estados ----------

export interface Diff {
  upsertTemplates: TaskTemplate[]
  deleteTemplates: string[]
  upsertOccurrences: Record<string, OccurrenceState>
  deleteOccurrences: string[]
  settings?: Settings
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** O que precisa mudar no banco para ele sair de `base` e chegar em `next`. */
export function diff(base: HomeData, next: HomeData): Diff {
  const baseT = new Map(base.templates.map((t) => [t.id, t]))
  const nextIds = new Set(next.templates.map((t) => t.id))
  const upsertTemplates = next.templates.filter((t) => {
    const b = baseT.get(t.id)
    return !b || !same(templateToRow(b), templateToRow(t))
  })
  const deleteTemplates = base.templates.filter((t) => !nextIds.has(t.id)).map((t) => t.id)

  const upsertOccurrences: Record<string, OccurrenceState> = {}
  for (const [key, s] of Object.entries(next.occurrences)) {
    const b = base.occurrences[key]
    if (!b || !same(occToRow(key, b), occToRow(key, s))) upsertOccurrences[key] = s
  }
  const deleteOccurrences = Object.keys(base.occurrences).filter((k) => !(k in next.occurrences))

  const d: Diff = { upsertTemplates, deleteTemplates, upsertOccurrences, deleteOccurrences }
  if (!same(settingsToRow(base.settings), settingsToRow(next.settings))) d.settings = next.settings
  return d
}

export function isEmptyDiff(d: Diff): boolean {
  return (
    d.upsertTemplates.length === 0 &&
    d.deleteTemplates.length === 0 &&
    Object.keys(d.upsertOccurrences).length === 0 &&
    d.deleteOccurrences.length === 0 &&
    !d.settings
  )
}

/** Aplica uma diferença em cima de um estado. A ordem das tarefas é preservada. */
export function applyDiff(data: HomeData, d: Diff): HomeData {
  const del = new Set(d.deleteTemplates)
  const up = new Map(d.upsertTemplates.map((t) => [t.id, t]))
  const templates = data.templates.filter((t) => !del.has(t.id)).map((t) => up.get(t.id) ?? t)
  for (const t of d.upsertTemplates) if (!data.templates.some((x) => x.id === t.id)) templates.push(t)

  const occurrences = { ...data.occurrences, ...d.upsertOccurrences }
  for (const k of d.deleteOccurrences) delete occurrences[k]

  return { ...data, templates, occurrences, settings: d.settings ?? data.settings }
}

/** Mantém a ordem das tarefas que este celular já mostra; as novas vão para o fim. */
export function keepOrder(templates: TaskTemplate[], order: TaskTemplate[]): TaskTemplate[] {
  const pos = new Map(order.map((t, i) => [t.id, i]))
  return [...templates].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity))
}

export function isEmptyRemote(d: HomeData): boolean {
  return d.templates.length === 0 && Object.keys(d.occurrences).length === 0
}

// ---------- Banco ----------

function db() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

const PAGE = 1000

async function fetchAllRows<T>(table: string, order: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db()
      .from(table)
      .select('*')
      .order(order)
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) return rows
  }
}

/** Lê o estado inteiro da casa no banco. */
export async function fetchAll(): Promise<HomeData> {
  const [templates, occurrences, settings] = await Promise.all([
    fetchAllRows<TemplateRow>('templates', 'id'),
    fetchAllRows<OccurrenceRow>('occurrences', 'key'),
    db().from('settings').select('*').eq('id', 1).maybeSingle(),
  ])
  if (settings.error) throw settings.error
  if (!settings.data) throw new Error('A linha de ajustes não existe no banco')
  return {
    version: 1,
    templates: templates.map(rowToTemplate),
    occurrences: Object.fromEntries(occurrences.map((r) => [r.key, rowToOcc(r)])),
    settings: rowToSettings(settings.data as SettingsRow),
  }
}

function chunks<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Envia ao banco só o que mudou. Lança erro se algo falhar. */
export async function pushDiff(d: Diff): Promise<void> {
  const c = db()
  const check = ({ error }: { error: unknown }) => {
    if (error) throw error
  }
  for (const part of chunks(d.upsertTemplates.map(templateToRow))) check(await c.from('templates').upsert(part))
  const occRows = Object.entries(d.upsertOccurrences).map(([k, s]) => occToRow(k, s))
  for (const part of chunks(occRows)) check(await c.from('occurrences').upsert(part))
  if (d.settings) check(await c.from('settings').upsert(settingsToRow(d.settings)))
  for (const part of chunks(d.deleteOccurrences, 200)) check(await c.from('occurrences').delete().in('key', part))
  for (const part of chunks(d.deleteTemplates, 200)) check(await c.from('templates').delete().in('id', part))
}

export type RemoteChange =
  | { table: 'templates'; deleted: true; id: string }
  | { table: 'templates'; deleted: false; template: TaskTemplate }
  | { table: 'occurrences'; deleted: true; key: string }
  | { table: 'occurrences'; deleted: false; key: string; state: OccurrenceState }
  | { table: 'settings'; settings: Settings }

/**
 * Escuta as mudanças feitas no outro celular (Realtime).
 * `onStatus(true)` vem toda vez que a conexão (re)abre: bom momento para ler tudo de novo.
 */
export function subscribe(onChange: (c: RemoteChange) => void, onStatus: (connected: boolean) => void): () => void {
  const c = db()
  const channel: RealtimeChannel = c
    .channel('dia-casa')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, (p) => {
      if (p.eventType === 'DELETE') onChange({ table: 'templates', deleted: true, id: (p.old as TemplateRow).id })
      else onChange({ table: 'templates', deleted: false, template: rowToTemplate(p.new as TemplateRow) })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'occurrences' }, (p) => {
      if (p.eventType === 'DELETE') onChange({ table: 'occurrences', deleted: true, key: (p.old as OccurrenceRow).key })
      else {
        const r = p.new as OccurrenceRow
        onChange({ table: 'occurrences', deleted: false, key: r.key, state: rowToOcc(r) })
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (p) => {
      if (p.eventType !== 'DELETE') onChange({ table: 'settings', settings: rowToSettings(p.new as SettingsRow) })
    })
    .subscribe((status) => onStatus(status === 'SUBSCRIBED'))
  return () => {
    void c.removeChannel(channel)
  }
}

/** Quem é esta conta na casa. null = ainda não liberada em public.members. */
export async function fetchMember(userId: string): Promise<Person | null> {
  const { data, error } = await db().from('members').select('person').eq('user_id', userId).maybeSingle()
  if (error) throw error
  const p = (data as { person?: string } | null)?.person
  return p === 'ney' || p === 'cleide' ? p : null
}
