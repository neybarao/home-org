import { addDays, rangeISO, startOfWeek, type ISODate } from './dates'
import { buildOccurrences, carriesOver, isClosing, isExtra, isRegular } from './schedule'
import type { HomeData, Person } from './types'

/*
 * Conquistas do casal. Tudo sai do histórico que os dois celulares já dividem
 * (tarefas e ocorrências), então não precisa de tabela nova no banco: os dois
 * chegam às mesmas conquistas. Uma vez ganha, a conquista fica guardada no
 * aparelho e não some mais, mesmo que uma tarefa antiga seja apagada.
 *
 * Sequência aqui não é castigo: dia sem nada planejado não quebra, hoje ainda
 * em andamento não quebra, e o app mostra a melhor sequência, não um contador
 * que volta a zero.
 */

export type BadgeCategory = 'inicio' | 'sequencia' | 'constancia' | 'volume' | 'ritmo'

export const CATEGORIES: Record<BadgeCategory, { name: string; hint: string }> = {
  inicio: { name: 'Primeiros passos', hint: 'Para começar com o pé direito' },
  sequencia: { name: 'Sequência', hint: 'Dias plenos seguidos. Dia sem tarefa não quebra.' },
  constancia: { name: 'Constância', hint: 'Dias plenos no total, sem pressa' },
  volume: { name: 'Mãos à obra', hint: 'Tarefas feitas pelos dois, somadas' },
  ritmo: { name: 'Ritmo da casa', hint: 'Jeitos diferentes de cuidar da casa' },
}

/** Qual número do histórico cada conquista acompanha. */
export type Metric =
  | 'tasksDone' // tarefas feitas (qualquer tipo)
  | 'fullDays' // dias plenos no total
  | 'bestStreak' // maior sequência de dias plenos
  | 'closingDays' // dias com o fechamento completo
  | 'duoDays' // dias em que os dois fizeram alguma coisa
  | 'threeRingDays' // dias com os três anéis fechados
  | 'freeWeekends' // semanas com tudo de segunda a sábado feito até sábado
  | 'extrasDone' // tarefas extras feitas
  | 'specialsDone' // tarefas especiais feitas

export interface BadgeDef {
  id: string
  name: string
  /** Como ganhar, em uma frase. */
  how: string
  /** Frase de comemoração quando ganham. */
  cheer: string
  category: BadgeCategory
  metric: Metric
  target: number
  /** Número em destaque no desenho (fitinha), quando faz sentido. */
  number?: number
}

export const BADGES: BadgeDef[] = [
  // Primeiros passos
  { id: 'primeiro-raio', name: 'Primeiro raio', category: 'inicio', metric: 'tasksDone', target: 1, how: 'Marquem a primeira tarefa como feita.', cheer: 'O primeiro raio de sol da casa. Começou!' },
  { id: 'dia-pleno', name: 'Dia pleno', category: 'inicio', metric: 'fullDays', target: 1, how: 'Fechem um dia com 100% do Pra hoje e do Fechamento.', cheer: 'Um dia inteirinho em dia. Que sensação boa.' },
  { id: 'boa-noite', name: 'Boa noite', category: 'inicio', metric: 'closingDays', target: 1, how: 'Completem o Fechamento do dia pela primeira vez.', cheer: 'Casa arrumada antes de dormir. Amanhã começa leve.' },
  { id: 'em-dupla', name: 'Em dupla', category: 'inicio', metric: 'duoDays', target: 1, how: 'Os dois fazem pelo menos uma tarefa no mesmo dia.', cheer: 'Time completo. A casa é dos dois.' },

  // Sequência
  { id: 'embalo', name: 'Embalo', category: 'sequencia', metric: 'bestStreak', target: 3, number: 3, how: '3 dias plenos seguidos.', cheer: 'Três dias seguidos. Pegaram o embalo!' },
  { id: 'semana-redonda', name: 'Semana redonda', category: 'sequencia', metric: 'bestStreak', target: 7, number: 7, how: '7 dias plenos seguidos.', cheer: 'Uma semana inteira redondinha.' },
  { id: 'quinzena', name: 'Quinzena brilhante', category: 'sequencia', metric: 'bestStreak', target: 14, number: 14, how: '14 dias plenos seguidos.', cheer: 'Duas semanas brilhando. Isso já é hábito.' },
  { id: 'lua-cheia', name: 'Lua cheia', category: 'sequencia', metric: 'bestStreak', target: 30, number: 30, how: '30 dias plenos seguidos.', cheer: 'Um ciclo inteiro da lua com a casa em dia.' },
  { id: 'estacao', name: 'Estação', category: 'sequencia', metric: 'bestStreak', target: 90, number: 90, how: '90 dias plenos seguidos.', cheer: 'Uma estação inteira. Vocês são lenda.' },

  // Constância
  { id: 'broto', name: 'Broto', category: 'constancia', metric: 'fullDays', target: 10, number: 10, how: '10 dias plenos no total.', cheer: 'Dez dias plenos. O hábito brotou.' },
  { id: 'jardim', name: 'Jardim', category: 'constancia', metric: 'fullDays', target: 50, number: 50, how: '50 dias plenos no total.', cheer: 'Cinquenta dias plenos. Já é um jardim.' },
  { id: 'centenario', name: 'Centenário', category: 'constancia', metric: 'fullDays', target: 100, number: 100, how: '100 dias plenos no total.', cheer: 'Cem dias plenos. Árvore de raiz funda.' },

  // Mãos à obra
  { id: 'balde', name: 'Balde cheio', category: 'volume', metric: 'tasksDone', target: 50, number: 50, how: '50 tarefas feitas pelos dois.', cheer: 'Cinquenta tarefas. O balde encheu!' },
  { id: 'espuma', name: 'Espuma', category: 'volume', metric: 'tasksDone', target: 250, number: 250, how: '250 tarefas feitas pelos dois.', cheer: 'Duzentas e cinquenta. Bolha de sabão pra todo lado.' },
  { id: 'mil-sois', name: 'Mil sóis', category: 'volume', metric: 'tasksDone', target: 1000, number: 1000, how: '1.000 tarefas feitas pelos dois.', cheer: 'Mil tarefas. Mil sóis nascendo na casa.' },

  // Ritmo da casa
  { id: 'sono-tranquilo', name: 'Sono tranquilo', category: 'ritmo', metric: 'closingDays', target: 30, number: 30, how: 'Completem o Fechamento em 30 dias.', cheer: 'Trinta noites de casa em ordem. Durmam bem.' },
  { id: 'tres-aneis', name: 'Três anéis', category: 'ritmo', metric: 'threeRingDays', target: 1, how: 'Fechem Pra hoje, Fechamento e Extras no mesmo dia.', cheer: 'Os três anéis fechados. Dia de ouro.' },
  { id: 'fim-de-semana', name: 'Fim de semana livre', category: 'ritmo', metric: 'freeWeekends', target: 1, how: 'Terminem até sábado tudo o que era de segunda a sábado.', cheer: 'Fim de semana livre. Era isso que a gente queria.' },
  { id: 'jogo-de-cintura', name: 'Jogo de cintura', category: 'ritmo', metric: 'extrasDone', target: 10, number: 10, how: 'Façam 10 tarefas extras.', cheer: 'Dez imprevistos resolvidos. Que jogo de cintura.' },
  { id: 'cume', name: 'Cume', category: 'ritmo', metric: 'specialsDone', target: 5, number: 5, how: 'Façam 5 tarefas especiais (as grandes).', cheer: 'Cinco tarefas grandes. Vista lá de cima!' },
]

// ---------- Histórico dia a dia ----------

interface RingCount {
  done: number
  total: number
}

export interface DayStats {
  date: ISODate
  today: RingCount
  closing: RingCount
  extra: RingCount
  tasksDone: number
  extrasDone: number
  specialsDone: number
  doers: Set<Person>
}

/**
 * Todos os dias do início do app até hoje, numa passada só. Os anéis seguem
 * exatamente a regra de `dayProgress` (testado em badges.test.ts), mas sem
 * recalcular as ocorrências do zero para cada dia.
 */
export function dailyHistory(data: HomeData, today: ISODate): DayStats[] {
  const start = data.settings.startDate
  if (start > today) return []
  const days = rangeISO(start, today)
  const byDate = new Map<ISODate, DayStats>()
  for (const date of days) {
    byDate.set(date, {
      date,
      today: { done: 0, total: 0 },
      closing: { done: 0, total: 0 },
      extra: { done: 0, total: 0 },
      tasksDone: 0,
      extrasDone: 0,
      specialsDone: 0,
      doers: new Set(),
    })
  }

  const map = new Map(data.templates.map((t) => [t.id, t]))
  for (const occ of buildOccurrences(data, start, today)) {
    const task = map.get(occ.templateId)!
    if (occ.skippedBy) continue
    const dates = new Set([occ.plannedDate, occ.doneOn].filter(Boolean) as ISODate[])
    for (const date of dates) {
      const day = byDate.get(date)
      // Fora do intervalo, ou contado num dia antes de a tarefa existir (igual a dayProgress).
      if (!day || occ.dueDate > date) continue
      const doneHere = occ.doneOn === date
      const plannedHere = occ.plannedDate === date
      if (!plannedHere && !carriesOver(task)) continue

      if (isClosing(task)) {
        day.closing.total++
        if (occ.doneBy) day.closing.done++
      } else if (isExtra(task)) {
        day.extra.total++
        if (doneHere) day.extra.done++
      } else if (isRegular(task)) {
        day.today.total++
        if (doneHere) day.today.done++
      }

      if (doneHere && occ.doneBy) {
        day.tasksDone++
        day.doers.add(occ.doneBy)
        if (isExtra(task)) day.extrasDone++
        else if (task.special) day.specialsDone++
      }
    }
  }
  return days.map((d) => byDate.get(d)!)
}

const complete = (r: RingCount) => r.done === r.total

/** Dia pleno: tudo do Pra hoje e do Fechamento feito (e havia algo para fazer). */
export function isFullDay(d: DayStats): boolean {
  return d.today.total + d.closing.total > 0 && complete(d.today) && complete(d.closing)
}

/** Dia que não conta nem quebra a sequência: nada planejado. */
const isNeutral = (d: DayStats) => d.today.total + d.closing.total === 0

/**
 * Semanas com tudo o que estava planejado de segunda a sábado (fora as diárias)
 * feito até o sábado. Devolve a data em que cada uma ficou completa.
 */
export function freeWeekendDates(data: HomeData, today: ISODate): ISODate[] {
  const start = data.settings.startDate
  if (start > today) return []
  const map = new Map(data.templates.map((t) => [t.id, t]))
  const occs = buildOccurrences(data, start, today)
  const out: ISODate[] = []
  for (let monday = startOfWeek(start); monday <= today; monday = addDays(monday, 7)) {
    const saturday = addDays(monday, 5)
    let count = 0
    let lastDone: ISODate = monday
    let ok = true
    for (const occ of occs) {
      const t = map.get(occ.templateId)!
      if (!carriesOver(t) || isExtra(t) || occ.skippedBy) continue
      if (occ.plannedDate < monday || occ.plannedDate > saturday) continue
      count++
      if (!occ.doneBy || !occ.doneOn || occ.doneOn > saturday) {
        ok = false
        break
      }
      if (occ.doneOn > lastDone) lastDone = occ.doneOn
    }
    if (ok && count > 0) out.push(lastDone)
  }
  return out.sort()
}

// ---------- Avaliação ----------

export interface BadgeStatus {
  /** Data em que a meta foi batida pela primeira vez. Sem data = ainda não. */
  earnedOn?: ISODate
  /** Onde estão agora (para a barra de progresso), limitado à meta. */
  value: number
}

export type BadgeResults = Record<string, BadgeStatus>

/**
 * Percorre o histórico em ordem e anota em que dia cada meta foi batida.
 * As sequências usam a melhor de todas, então nunca "desfazem".
 */
export function evaluateBadges(data: HomeData, today: ISODate): BadgeResults {
  const history = dailyHistory(data, today)
  const weekends = freeWeekendDates(data, today)
  const totals: Record<Metric, number> = {
    tasksDone: 0,
    fullDays: 0,
    bestStreak: 0,
    closingDays: 0,
    duoDays: 0,
    threeRingDays: 0,
    freeWeekends: 0,
    extrasDone: 0,
    specialsDone: 0,
  }
  const results: BadgeResults = Object.fromEntries(BADGES.map((b) => [b.id, { value: 0 }]))
  const check = (date: ISODate) => {
    for (const b of BADGES) {
      const r = results[b.id]
      if (!r.earnedOn && totals[b.metric] >= b.target) r.earnedOn = date
    }
  }

  let streak = 0
  let w = 0
  for (const d of history) {
    totals.tasksDone += d.tasksDone
    totals.extrasDone += d.extrasDone
    totals.specialsDone += d.specialsDone
    if (d.doers.size >= 2) totals.duoDays++
    if (d.closing.total > 0 && complete(d.closing)) totals.closingDays++
    if (d.today.total > 0 && d.closing.total > 0 && d.extra.total > 0 && complete(d.today) && complete(d.closing) && complete(d.extra))
      totals.threeRingDays++

    if (isFullDay(d)) {
      totals.fullDays++
      streak++
      totals.bestStreak = Math.max(totals.bestStreak, streak)
    } else if (!isNeutral(d) && d.date !== today) {
      // Hoje ainda pode virar pleno; só um dia que já passou interrompe.
      streak = 0
    }
    while (w < weekends.length && weekends[w] <= d.date) {
      totals.freeWeekends++
      w++
    }
    check(d.date)
  }

  for (const b of BADGES) results[b.id].value = Math.min(b.target, totals[b.metric])
  return results
}
