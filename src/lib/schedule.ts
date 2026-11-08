import { addDays, daysBetween, endOfWeek, rangeISO, startOfWeek, weekOfMonth, weekday, type ISODate } from './dates'
import type { Frequency, HomeData, Move, Occurrence, TaskTemplate } from './types'

const BIWEEKLY_ANCHOR = '2026-01-05' // uma segunda-feira qualquer, só para definir semanas pares e ímpares

export function occursOn(freq: Frequency, date: ISODate): boolean {
  const wd = weekday(date)
  switch (freq.kind) {
    case 'daily':
      return true
    case 'weekly':
      return freq.weekdays.includes(wd)
    case 'biweekly': {
      if (wd !== freq.weekday) return false
      const weeks = Math.floor(daysBetween(BIWEEKLY_ANCHOR, startOfWeek(date)) / 7)
      return weeks % 2 === 0
    }
    case 'monthly':
      return wd === freq.weekday && weekOfMonth(date) === freq.week
  }
}

/** Tarefas diárias não acumulam: a de hoje substitui a de ontem. */
export function carriesOver(t: TaskTemplate): boolean {
  return t.frequency.kind !== 'daily'
}

export function occurrenceKey(templateId: string, dueDate: ISODate) {
  return `${templateId}@${dueDate}`
}

export function buildOccurrences(data: HomeData, from: ISODate, to: ISODate): Occurrence[] {
  const out: Occurrence[] = []
  const start = from < data.settings.startDate ? data.settings.startDate : from
  if (start > to) return out
  const templates = data.templates.filter((t) => t.active)
  for (const date of rangeISO(start, to)) {
    for (const t of templates) {
      if (!occursOn(t.frequency, date)) continue
      const key = occurrenceKey(t.id, date)
      const state = data.occurrences[key] ?? {}
      out.push({ ...state, key, templateId: t.id, dueDate: date, plannedDate: state.plannedDate ?? date })
    }
  }
  return out
}

export interface DayItem {
  occ: Occurrence
  task: TaskTemplate
}

export interface DayView {
  /** Planejadas para hoje (pendentes e feitas). */
  today: DayItem[]
  /** De dias anteriores, ainda não feitas. */
  overdue: DayItem[]
}

const byPriority = (a: DayItem, b: DayItem) =>
  (a.task.priority === 'alta' ? 0 : 1) - (b.task.priority === 'alta' ? 0 : 1) ||
  a.occ.plannedDate.localeCompare(b.occ.plannedDate) ||
  a.task.title.localeCompare(b.task.title)

export function dayView(data: HomeData, today: ISODate): DayView {
  const map = new Map(data.templates.map((t) => [t.id, t]))
  // Tarefas só são adiadas para frente, então basta olhar do início até hoje.
  const occs = buildOccurrences(data, data.settings.startDate, today)
  const todayItems: DayItem[] = []
  const overdue: DayItem[] = []
  for (const occ of occs) {
    const task = map.get(occ.templateId)!
    if (occ.doneOn === today || (occ.plannedDate === today && !occ.doneBy)) {
      todayItems.push({ occ, task })
    } else if (!occ.doneBy && occ.plannedDate < today && carriesOver(task)) {
      overdue.push({ occ, task })
    }
  }
  return { today: todayItems.sort(byPriority), overdue: overdue.sort(byPriority) }
}

/** Quantas tarefas regulares (não especiais) estão planejadas para cada dia. */
export function loadByDay(data: HomeData, days: ISODate[]): Map<ISODate, number> {
  const load = new Map(days.map((d) => [d, 0]))
  if (days.length === 0) return load
  const map = new Map(data.templates.map((t) => [t.id, t]))
  for (const occ of buildOccurrences(data, data.settings.startDate, days[days.length - 1])) {
    if (occ.doneBy || !load.has(occ.plannedDate)) continue
    if (map.get(occ.templateId)!.special) continue
    load.set(occ.plannedDate, load.get(occ.plannedDate)! + 1)
  }
  return load
}

/**
 * Dias que podem receber tarefas: o resto desta semana, de segunda a sábado.
 * O domingo fica livre. Se não sobrar dia na semana, vai para a próxima.
 */
export function destinationDays(today: ISODate): ISODate[] {
  const notSunday = (d: ISODate) => weekday(d) !== 0
  const rest = rangeISO(addDays(today, 1), endOfWeek(today)).filter(notSunday)
  if (rest.length > 0) return rest
  const nextMonday = addDays(endOfWeek(today), 1)
  return rangeISO(nextMonday, endOfWeek(nextMonday)).filter(notSunday)
}

export interface Suggestion {
  capacity: number
  pending: number
  keep: DayItem[]
  moves: (Move & { item: DayItem })[]
}

/**
 * Quando há mais tarefas do que o combinado para hoje, sugere quais ficam
 * (prioridade alta e as mais antigas primeiro) e espalha o resto pelos dias
 * menos carregados. Diárias, especiais e tarefas já assumidas não se movem.
 */
export function suggestRedistribution(data: HomeData, today: ISODate, solo: boolean): Suggestion | null {
  const view = dayView(data, today)
  const capacity = data.settings.dailyLimit * (solo ? 1 : 2)
  const pending = [...view.overdue, ...view.today].filter((i) => !i.occ.doneBy && !i.task.special)
  if (pending.length <= capacity) return null

  const fixed = pending.filter((i) => !carriesOver(i.task) || i.occ.claimedBy)
  const movable = pending.filter((i) => !fixed.includes(i)).sort(byPriority)
  const keepCount = Math.max(0, capacity - fixed.length)
  const keep = [...fixed, ...movable.slice(0, keepCount)]
  const toMove = movable.slice(keepCount)
  if (toMove.length === 0) return null

  const days = destinationDays(today)
  const load = loadByDay(data, days)
  const moves = toMove.map((item) => {
    let best = days[0]
    for (const d of days) if (load.get(d)! < load.get(best)!) best = d
    load.set(best, load.get(best)! + 1)
    return { key: item.occ.key, to: best, item }
  })
  return { capacity, pending: pending.length, keep, moves }
}

export function describeFrequency(f: Frequency): string {
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  switch (f.kind) {
    case 'daily':
      return 'Todo dia'
    case 'weekly': {
      const days = [...f.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => names[d])
      if (days.length === 1) return `Toda ${days[0]}`.replace('Toda sábado', 'Todo sábado').replace('Toda domingo', 'Todo domingo')
      return `${days.slice(0, -1).join(', ')} e ${days[days.length - 1]}`.replace(/^./, (c) => c.toUpperCase())
    }
    case 'biweekly':
      return `A cada 15 dias, ${names[f.weekday]}`
    case 'monthly':
      return `${f.week}º ${names[f.weekday]} do mês`
  }
}
