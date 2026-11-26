import { describe, expect, it } from 'vitest'
import { BADGES, dailyHistory, evaluateBadges, freeWeekendDates } from './badges'
import { addDays, rangeISO } from './dates'
import { dayProgress } from './progress'
import { buildOccurrences } from './schedule'
import { demoData, emptyData } from './seed'
import type { HomeData } from './types'

const MONDAY = '2026-11-09'

function withPast(start: string, today: string): HomeData {
  const d = emptyData(today)
  d.settings.startDate = start
  return d
}

/** Marca como feito tudo o que vence nos dias dados, no próprio dia. */
function doAll(d: HomeData, from: string, to: string, who: 'ney' | 'cleide' = 'ney') {
  for (const occ of buildOccurrences(d, from, to)) d.occurrences[occ.key] = { doneBy: who, doneOn: occ.dueDate }
}

describe('histórico', () => {
  it('dá os mesmos anéis que a tela de Progresso', () => {
    const today = '2026-11-26'
    const d = demoData(today)
    // Uma tarefa adiada e uma pulada, para cobrir os casos especiais.
    const [a, b] = buildOccurrences(d, d.settings.startDate, today).filter((o) => o.templateId === 'fogao' || o.templateId === 'roupa')
    d.occurrences[a.key] = { plannedDate: addDays(a.dueDate, 1), doneBy: 'ney', doneOn: addDays(a.dueDate, 2) }
    d.occurrences[b.key] = { skippedBy: 'cleide', skippedOn: b.dueDate }
    const history = dailyHistory(d, today)
    for (const day of history) {
      const p = dayProgress(d, day.date, today)
      expect([day.date, day.today, day.closing, day.extra]).toEqual([p.date, p.today, p.closing, p.extra])
    }
  })
})

describe('conquistas', () => {
  it('sem nada feito, nenhuma conquista', () => {
    const r = evaluateBadges(withPast(MONDAY, MONDAY), MONDAY)
    expect(BADGES.filter((b) => r[b.id].earnedOn)).toHaveLength(0)
  })

  it('primeira tarefa e dia pleno, com a data certa', () => {
    const d = withPast(MONDAY, '2026-11-11')
    d.occurrences['coco@2026-11-10'] = { doneBy: 'ney', doneOn: '2026-11-10' }
    doAll(d, '2026-11-11', '2026-11-11')
    const r = evaluateBadges(d, '2026-11-11')
    expect(r['primeiro-raio'].earnedOn).toBe('2026-11-10')
    expect(r['dia-pleno'].earnedOn).toBe('2026-11-11')
    expect(r['boa-noite'].earnedOn).toBe('2026-11-11')
    expect(r['em-dupla'].earnedOn).toBeUndefined()
  })

  it('em dupla quando os dois fazem algo no mesmo dia', () => {
    const d = withPast(MONDAY, MONDAY)
    d.occurrences['coco@2026-11-09'] = { doneBy: 'ney', doneOn: MONDAY }
    d.occurrences['louca@2026-11-09'] = { doneBy: 'cleide', doneOn: MONDAY }
    expect(evaluateBadges(d, MONDAY)['em-dupla'].earnedOn).toBe(MONDAY)
  })

  it('sequência: hoje em andamento não quebra; dia que passou quebra; a melhor fica', () => {
    const today = '2026-11-14'
    const d = withPast(MONDAY, today)
    doAll(d, MONDAY, '2026-11-11') // seg a qua plenos
    doAll(d, '2026-11-13', '2026-11-13') // quinta falhou, sexta plena
    const r = evaluateBadges(d, today)
    expect(r['embalo'].earnedOn).toBe('2026-11-11')
    expect(r['semana-redonda'].value).toBe(3)
  })

  it('dia sem nada planejado não quebra a sequência', () => {
    const today = '2026-11-11'
    const d = withPast(MONDAY, today)
    doAll(d, MONDAY, MONDAY)
    // Terça sem nenhuma tarefa ativa naquele dia: desliga tudo e marca só as de seg e qua.
    for (const occ of buildOccurrences(d, '2026-11-10', '2026-11-10')) d.occurrences[occ.key] = { skippedBy: 'ney', skippedOn: '2026-11-10' }
    // Fechamento não dá pra pular pela tela, mas aqui serve para zerar o dia.
    doAll(d, today, today)
    expect(evaluateBadges(d, today)['embalo'].value).toBe(2)
  })

  it('fim de semana livre: tudo de segunda a sábado feito até sábado', () => {
    const saturday = '2026-11-14'
    const d = withPast(MONDAY, saturday)
    expect(freeWeekendDates(d, saturday)).toHaveLength(0)
    for (const occ of buildOccurrences(d, MONDAY, saturday)) d.occurrences[occ.key] = { doneBy: 'cleide', doneOn: occ.dueDate }
    expect(freeWeekendDates(d, saturday)).toEqual([saturday])
    expect(evaluateBadges(d, saturday)['fim-de-semana'].earnedOn).toBe(saturday)
  })

  it('progresso das metas grandes fica limitado à meta', () => {
    const today = addDays(MONDAY, 13)
    const d = withPast(MONDAY, today)
    doAll(d, MONDAY, today)
    const r = evaluateBadges(d, today)
    expect(r['quinzena'].earnedOn).toBe(today)
    expect(r['lua-cheia'].value).toBe(14)
    expect(r['primeiro-raio'].value).toBe(1)
    expect(rangeISO(MONDAY, today)).toHaveLength(14)
  })

  it('ids únicos', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length)
    expect(BADGES).toHaveLength(20)
  })
})
