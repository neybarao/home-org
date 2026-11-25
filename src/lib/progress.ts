import { addDays, endOfWeek, rangeISO, startOfWeek, type ISODate } from './dates'
import { buildOccurrences, carriesOver, isClosing, isRegular, type DayItem } from './schedule'
import type { HomeData } from './types'

export interface Ring {
  done: number
  total: number
}

export interface DayProgress {
  date: ISODate
  /** Tarefas do dia: as planejadas para o dia e as feitas nele (inclusive atrasadas). */
  today: Ring
  /** Itens do fechamento do dia. */
  closing: Ring
  /** O que foi feito no dia, na ordem em que aparece. */
  done: DayItem[]
  /** Planejado para o dia e não feito nele. */
  missed: DayItem[]
  /** Antes do primeiro dia do app ou no futuro: não tem o que mostrar. */
  empty: boolean
}

export const ratio = (r: Ring) => (r.total === 0 ? 0 : Math.min(1, r.done / r.total))

/**
 * Progresso de um dia, com a mesma regra da tela Hoje: conta o que estava
 * planejado para o dia e o que foi feito nele. Tarefa adiada pela sugestão sai
 * da conta do dia, então num dia "só um de nós" a meta encolhe junto.
 */
export function dayProgress(data: HomeData, date: ISODate, today: ISODate): DayProgress {
  const empty: DayProgress = { date, today: { done: 0, total: 0 }, closing: { done: 0, total: 0 }, done: [], missed: [], empty: true }
  if (date < data.settings.startDate || date > today) return empty

  const map = new Map(data.templates.map((t) => [t.id, t]))
  // Uma tarefa atrasada feita neste dia pode ter vencido bem antes.
  const occs = buildOccurrences(data, data.settings.startDate, date)
  const done: DayItem[] = []
  const missed: DayItem[] = []
  const todayRing = { done: 0, total: 0 }
  const closingRing = { done: 0, total: 0 }

  for (const occ of occs) {
    const task = map.get(occ.templateId)!
    const doneHere = occ.doneOn === date
    const plannedHere = occ.plannedDate === date
    if (!doneHere && !plannedHere) continue
    // Diária de outro dia nunca conta aqui; ela não acumula.
    if (!plannedHere && !carriesOver(task)) continue

    if (isClosing(task)) {
      closingRing.total++
      if (occ.doneBy) closingRing.done++
    } else if (isRegular(task)) {
      todayRing.total++
      if (doneHere) todayRing.done++
    }
    if (doneHere) done.push({ occ, task })
    else if (plannedHere) missed.push({ occ, task }) // não feita, ou feita só em outro dia
  }

  return { date, today: todayRing, closing: closingRing, done, missed, empty: false }
}

/** Os sete dias (segunda a domingo) da semana da data. */
export function weekDays(date: ISODate): ISODate[] {
  return rangeISO(startOfWeek(date), endOfWeek(date))
}

/**
 * Andamento da semana, fora dos anéis: tarefas semanais, quinzenais e mensais
 * que vencem na semana, feitas ou não. Diárias ficam de fora, já estão nos anéis.
 */
export function weekProgress(data: HomeData, date: ISODate): Ring {
  const map = new Map(data.templates.map((t) => [t.id, t]))
  const occs = buildOccurrences(data, startOfWeek(date), endOfWeek(date))
  let done = 0
  let total = 0
  for (const occ of occs) {
    if (!carriesOver(map.get(occ.templateId)!)) continue
    total++
    if (occ.doneBy) done++
  }
  return { done, total }
}

/** Dá para voltar para a semana anterior? Só se ela tiver algum dia depois do início do app. */
export function hasWeekBefore(data: HomeData, date: ISODate): boolean {
  return endOfWeek(addDays(startOfWeek(date), -1)) >= data.settings.startDate
}
