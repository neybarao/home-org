import type { ISODate } from './dates.ts'

export type Person = 'ney' | 'cleide'

export const PEOPLE: Record<Person, { name: string; initial: string }> = {
  ney: { name: 'Ney', initial: 'N' },
  cleide: { name: 'Cleidi', initial: 'C' },
}

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekly'; weekdays: number[] } // 0 = domingo
  | { kind: 'biweekly'; weekday: number }
  | { kind: 'monthly'; week: number; weekday: number } // ex.: 1º sábado do mês
  | { kind: 'once'; date: ISODate } // tarefa extra: aparece só nesse dia, fora do planejamento

export type Priority = 'alta' | 'normal'

export interface TaskTemplate {
  id: string
  title: string
  room: string
  frequency: Frequency
  priority: Priority
  /** Tarefa grande, fora do limite diário (ex.: cortar a grama). */
  special: boolean
  active: boolean
  /** Rotina da noite (só para diárias). Fica fora do limite diário. */
  closing?: boolean
  /** Nota com mais detalhes (ex.: "usar o produto do armário de cima"). */
  note?: string
  /** Quem cuida dessa tarefa por padrão. Sem dono, fica livre para quem pegar. */
  owner?: Person
}

/** O que muda numa ocorrência depois de criada. */
export interface OccurrenceState {
  plannedDate?: ISODate
  /** null = alguém soltou a tarefa de propósito, mesmo ela tendo dono. */
  claimedBy?: Person | null
  doneBy?: Person
  doneOn?: ISODate
  /** Pulada de propósito (ex.: não tinha lixo para tirar). Sai da contagem. */
  skippedBy?: Person
  skippedOn?: ISODate
}

export interface Occurrence extends Omit<OccurrenceState, 'claimedBy'> {
  /** Quem está com a tarefa agora: quem assumiu ou, se ninguém mexeu, o dono. */
  claimedBy?: Person
  key: string
  templateId: string
  dueDate: ISODate
  plannedDate: ISODate
}

export interface Settings {
  /** Tarefas por pessoa por dia. Número ainda em aberto, ajustável. */
  dailyLimit: number
  /** Primeiro dia que o app considera. Nada antes disso fica atrasado. */
  startDate: ISODate
  /** Linha de resumo no topo de Hoje. Desligada por padrão. */
  showSummary: boolean
}

export interface HomeData {
  version: 1
  templates: TaskTemplate[]
  occurrences: Record<string, OccurrenceState>
  settings: Settings
}

export interface Move {
  key: string
  to: ISODate
}
