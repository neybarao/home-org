// Datas como texto 'AAAA-MM-DD' no fuso local, para não sofrer com UTC.

export type ISODate = string

export function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12) // meio-dia evita problemas de horário de verão
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 0 = domingo ... 6 = sábado */
export function weekday(iso: ISODate): number {
  return fromISO(iso).getDay()
}

/** A semana vai de segunda a domingo. Retorna o domingo da semana da data. */
export function endOfWeek(iso: ISODate): ISODate {
  const wd = weekday(iso)
  return addDays(iso, wd === 0 ? 0 : 7 - wd)
}

export function startOfWeek(iso: ISODate): ISODate {
  const wd = weekday(iso)
  return addDays(iso, wd === 0 ? -6 : 1 - wd)
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000)
}

export function rangeISO(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/** Em qual semana do mês cai o dia (1 a 5). */
export function weekOfMonth(iso: ISODate): number {
  return Math.floor((fromISO(iso).getDate() - 1) / 7) + 1
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function longDate(iso: ISODate): string {
  const d = fromISO(iso)
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

/** "amanhã", "quarta", "seg, 16/11" */
export function relativeDay(iso: ISODate, today: ISODate): string {
  const diff = daysBetween(today, iso)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff === -1) return 'ontem'
  if (diff > 1 && iso <= endOfWeek(today)) return WEEKDAYS[weekday(iso)].toLowerCase()
  const d = fromISO(iso)
  return `${WEEKDAYS[d.getDay()].toLowerCase()}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
