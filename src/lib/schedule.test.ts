import { describe, expect, it } from 'vitest'
import { addDays, endOfWeek, startOfWeek, weekday } from './dates'
import { dayView, describeFrequency, destinationDays, occursOn, suggestRedistribution } from './schedule'
import { demoData, emptyData } from './seed'
import type { HomeData } from './types'

const SUNDAY = '2026-11-08'
const WEDNESDAY = '2026-11-11'

describe('datas', () => {
  it('semana vai de segunda a domingo', () => {
    expect(weekday(SUNDAY)).toBe(0)
    expect(startOfWeek(SUNDAY)).toBe('2026-11-02')
    expect(endOfWeek(SUNDAY)).toBe(SUNDAY)
    expect(endOfWeek(WEDNESDAY)).toBe('2026-11-15')
  })
})

describe('frequências', () => {
  it('mensal cai no 1º sábado', () => {
    expect(occursOn({ kind: 'monthly', week: 1, weekday: 6 }, '2026-11-07')).toBe(true)
    expect(occursOn({ kind: 'monthly', week: 1, weekday: 6 }, '2026-11-14')).toBe(false)
  })
  it('quinzenal alterna semanas', () => {
    const f = { kind: 'biweekly' as const, weekday: 2 }
    expect(occursOn(f, '2026-11-03')).not.toBe(occursOn(f, '2026-11-10'))
    expect(occursOn(f, '2026-11-03')).toBe(occursOn(f, '2026-11-17'))
  })
  it('descreve em português', () => {
    expect(describeFrequency({ kind: 'weekly', weekdays: [4, 1] })).toBe('Segunda e quinta')
    expect(describeFrequency({ kind: 'weekly', weekdays: [6] })).toBe('Todo sábado')
  })
})

function withPast(start: string, today: string): HomeData {
  const d = emptyData(today)
  d.settings.startDate = start
  return d
}

describe('atrasos', () => {
  it('tarefa não feita vai para atrasadas, diária não acumula', () => {
    const d = withPast('2026-11-09', '2026-11-10') // segunda até terça
    const v = dayView(d, '2026-11-10')
    const ids = v.overdue.map((i) => i.task.id)
    expect(ids).toContain('banheiro-suite')
    expect(ids).not.toContain('louca')
  })

  it('o que sobra da semana continua na semana seguinte', () => {
    const d = withPast('2026-11-02', '2026-11-09')
    const v = dayView(d, '2026-11-09')
    expect(v.overdue.some((i) => i.occ.dueDate === '2026-11-06')).toBe(true)
  })

  it('tarefa feita hoje continua aparecendo como feita', () => {
    const d = withPast('2026-11-09', '2026-11-10')
    d.occurrences['banheiro-suite@2026-11-09'] = { doneBy: 'ney', doneOn: '2026-11-10' }
    const v = dayView(d, '2026-11-10')
    expect(v.overdue.some((i) => i.task.id === 'banheiro-suite')).toBe(false)
    expect(v.today.some((i) => i.task.id === 'banheiro-suite' && i.occ.doneBy === 'ney')).toBe(true)
  })
})

describe('redistribuição', () => {
  it('não sugere nada quando cabe no dia', () => {
    const d = emptyData(WEDNESDAY)
    expect(suggestRedistribution(d, WEDNESDAY, false)).toBeNull()
  })

  it('sugere mover o excesso para o resto da semana, mantendo prioridade alta', () => {
    const d = withPast('2026-11-09', WEDNESDAY)
    d.settings.dailyLimit = 2 // capacidade de 4 para os dois
    const s = suggestRedistribution(d, WEDNESDAY, false)!
    expect(s).not.toBeNull()
    expect(s.keep.length).toBeGreaterThanOrEqual(4) // as 4 diárias ficam
    for (const m of s.moves) {
      expect(m.to > WEDNESDAY).toBe(true)
      expect(m.to <= endOfWeek(WEDNESDAY)).toBe(true)
      expect(m.item.task.frequency.kind).not.toBe('daily')
    }
  })

  it('sozinho, a capacidade cai pela metade', () => {
    const d = withPast('2026-11-09', WEDNESDAY)
    const pair = suggestRedistribution(d, WEDNESDAY, false)
    const solo = suggestRedistribution(d, WEDNESDAY, true)
    expect((solo?.moves.length ?? 0)).toBeGreaterThanOrEqual(pair?.moves.length ?? 0)
    expect(solo?.capacity).toBe(d.settings.dailyLimit)
  })

  it('no domingo e no sábado, joga para a semana seguinte, sem domingo', () => {
    const days = destinationDays(SUNDAY)
    expect(days[0]).toBe(addDays(SUNDAY, 1))
    expect(days).toHaveLength(6)
    expect(destinationDays('2026-11-14')[0]).toBe('2026-11-16')
    expect(destinationDays(WEDNESDAY)).toEqual(['2026-11-12', '2026-11-13', '2026-11-14'])
  })

  it('tarefa assumida não é movida', () => {
    const d = withPast('2026-11-09', WEDNESDAY)
    d.settings.dailyLimit = 1
    d.occurrences['banheiro-suite@2026-11-09'] = { claimedBy: 'cleide' }
    const s = suggestRedistribution(d, WEDNESDAY, false)!
    expect(s.moves.some((m) => m.key === 'banheiro-suite@2026-11-09')).toBe(false)
  })
})

describe('dados de exemplo', () => {
  it('começam com algumas tarefas atrasadas', () => {
    const d = demoData(SUNDAY)
    expect(dayView(d, SUNDAY).overdue.length).toBeGreaterThan(0)
  })
})
