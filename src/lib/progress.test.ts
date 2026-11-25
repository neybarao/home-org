import { describe, expect, it } from 'vitest'
import { dayProgress, hasWeekBefore, weekDays, weekProgress } from './progress'
import { buildOccurrences, dayView, pickOne, suggestRedistribution } from './schedule'
import { emptyData } from './seed'
import type { HomeData } from './types'

const MONDAY = '2026-11-09'
const TUESDAY = '2026-11-10'
const WEDNESDAY = '2026-11-11'

function withPast(start: string, today: string): HomeData {
  const d = emptyData(today)
  d.settings.startDate = start
  return d
}

describe('fechamento do dia', () => {
  it('fica fora do limite e nunca é sugerido para outro dia', () => {
    const d = withPast(MONDAY, WEDNESDAY)
    d.settings.dailyLimit = 1
    const s = suggestRedistribution(d, WEDNESDAY, false)!
    expect(s.moves.some((m) => m.item.task.closing)).toBe(false)
    expect(s.keep.some((i) => i.task.closing)).toBe(false)
  })

  it('não acumula de um dia para o outro', () => {
    const d = withPast(MONDAY, TUESDAY)
    const v = dayView(d, TUESDAY)
    expect(v.overdue.some((i) => i.task.closing)).toBe(false)
    expect(v.today.filter((i) => i.task.closing)).toHaveLength(3)
  })
})

describe('dono fixo', () => {
  it('a tarefa já nasce com o dono', () => {
    const d = withPast(MONDAY, MONDAY)
    d.templates = d.templates.map((t) => (t.id === 'banheiro-suite' ? { ...t, owner: 'cleide' } : t))
    const occ = buildOccurrences(d, MONDAY, MONDAY).find((o) => o.templateId === 'banheiro-suite')!
    expect(occ.claimedBy).toBe('cleide')
  })

  it('soltar de propósito vale mais que o dono', () => {
    const d = withPast(MONDAY, MONDAY)
    d.templates = d.templates.map((t) => (t.id === 'banheiro-suite' ? { ...t, owner: 'cleide' } : t))
    d.occurrences['banheiro-suite@2026-11-09'] = { claimedBy: null }
    const occ = buildOccurrences(d, MONDAY, MONDAY).find((o) => o.templateId === 'banheiro-suite')!
    expect(occ.claimedBy).toBeUndefined()
  })

  it('ter dono não impede a sugestão de mover a tarefa', () => {
    const d = withPast(MONDAY, WEDNESDAY)
    d.settings.dailyLimit = 1
    d.templates = d.templates.map((t) => (t.frequency.kind !== 'daily' ? { ...t, owner: 'ney' } : t))
    const s = suggestRedistribution(d, WEDNESDAY, false)!
    expect(s.moves.length).toBeGreaterThan(0)
  })
})

describe('por onde começo', () => {
  it('prefere o que é seu e ignora o que é do outro', () => {
    const d = withPast(MONDAY, WEDNESDAY)
    d.occurrences['sala-cozinha@2026-11-11'] = { claimedBy: 'cleide' }
    d.occurrences['fogao@2026-11-11'] = { claimedBy: 'ney' }
    expect(pickOne(d, WEDNESDAY, 'ney')!.task.id).toBe('fogao')
    for (let i = 0; i < 10; i++) expect(pickOne(d, WEDNESDAY, 'ney', i)!.task.id).not.toBe('sala-cozinha')
  })

  it('não sugere fechamento nem tarefa feita', () => {
    const d = withPast(WEDNESDAY, WEDNESDAY)
    for (let i = 0; i < 10; i++) {
      const p = pickOne(d, WEDNESDAY, 'ney', i)!
      expect(p.task.closing).toBeFalsy()
      expect(p.occ.doneBy).toBeUndefined()
    }
  })

  it('sem nada pendente, não sugere nada', () => {
    const d = withPast(WEDNESDAY, WEDNESDAY)
    d.templates = []
    expect(pickOne(d, WEDNESDAY, 'ney')).toBeNull()
  })
})

describe('progresso do dia', () => {
  it('conta o planejado e o feito no dia, separando o fechamento', () => {
    const d = withPast(MONDAY, MONDAY)
    d.occurrences['coco@2026-11-09'] = { doneBy: 'ney', doneOn: MONDAY }
    d.occurrences['louca@2026-11-09'] = { doneBy: 'cleide', doneOn: MONDAY }
    const p = dayProgress(d, MONDAY, MONDAY)
    // Segunda: cocô, alimentação, banheiro da suíte e roupa.
    expect(p.today).toEqual({ done: 1, total: 4 })
    expect(p.closing).toEqual({ done: 1, total: 3 })
    expect(p.done.map((i) => i.task.id).sort()).toEqual(['coco', 'louca'])
  })

  it('tarefa atrasada feita hoje conta para hoje, não para o dia em que venceu', () => {
    const d = withPast(MONDAY, TUESDAY)
    d.occurrences['banheiro-suite@2026-11-09'] = { doneBy: 'ney', doneOn: TUESDAY }
    expect(dayProgress(d, TUESDAY, TUESDAY).done.some((i) => i.task.id === 'banheiro-suite')).toBe(true)
    const monday = dayProgress(d, MONDAY, TUESDAY)
    expect(monday.done.some((i) => i.task.id === 'banheiro-suite')).toBe(false)
    expect(monday.missed.some((i) => i.task.id === 'banheiro-suite')).toBe(true)
  })

  it('tarefa adiada sai da conta do dia', () => {
    const d = withPast(MONDAY, MONDAY)
    d.occurrences['banheiro-suite@2026-11-09'] = { plannedDate: WEDNESDAY }
    expect(dayProgress(d, MONDAY, MONDAY).today.total).toBe(3)
  })

  it('antes do início e no futuro fica vazio', () => {
    const d = withPast(TUESDAY, TUESDAY)
    expect(dayProgress(d, MONDAY, TUESDAY).empty).toBe(true)
    expect(dayProgress(d, WEDNESDAY, TUESDAY).empty).toBe(true)
  })
})

describe('semana', () => {
  it('vai de segunda a domingo', () => {
    expect(weekDays(WEDNESDAY)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'])
  })

  it('conta só as tarefas que não são diárias', () => {
    const d = withPast(MONDAY, MONDAY)
    d.occurrences['banheiro-suite@2026-11-09'] = { doneBy: 'ney', doneOn: MONDAY }
    const w = weekProgress(d, MONDAY)
    expect(w.done).toBe(1)
    expect(w.total).toBeGreaterThan(10)
  })

  it('só deixa voltar até a semana em que o app começou', () => {
    const d = withPast(TUESDAY, WEDNESDAY)
    expect(hasWeekBefore(d, WEDNESDAY)).toBe(false)
    expect(hasWeekBefore(d, '2026-11-18')).toBe(true)
  })
})
