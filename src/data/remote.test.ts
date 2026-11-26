import { describe, expect, it } from 'vitest'
import { demoData } from '../lib/seed'
import type { HomeData } from '../lib/types'
import { applyDiff, diff, isEmptyDiff, keepOrder, occToRow, rowToOcc, rowToTemplate, templateToRow } from './remote'

const base = (): HomeData => demoData('2026-11-25')

describe('conversão de ocorrências', () => {
  it('claimedBy null vira "none" e undefined vira null', () => {
    expect(occToRow('k', { claimedBy: null }).claimed_by).toBe('none')
    expect(occToRow('k', {}).claimed_by).toBeNull()
    expect(occToRow('k', { claimedBy: undefined }).claimed_by).toBeNull()
    expect(occToRow('k', { claimedBy: 'cleide' }).claimed_by).toBe('cleide')
  })

  it('ida e volta preserva o estado', () => {
    for (const s of [{}, { claimedBy: null }, { claimedBy: 'ney' as const, doneBy: 'ney' as const, doneOn: '2026-11-25', plannedDate: '2026-11-26' }, { skippedBy: 'cleide' as const, skippedOn: '2026-11-26' }]) {
      expect(rowToOcc(occToRow('k', s))).toEqual(s)
    }
  })

  it('"none" volta como null (soltou de propósito)', () => {
    expect(rowToOcc({ key: 'k', planned_date: null, claimed_by: 'none', done_by: null, done_on: null })).toEqual({ claimedBy: null })
  })
})

describe('conversão de tarefas', () => {
  it('ida e volta preserva a tarefa', () => {
    for (const t of base().templates) expect(rowToTemplate(templateToRow(t))).toEqual(t)
  })

  it('guarda a nota e não grava nota vazia', () => {
    const t = { ...base().templates[0], note: 'Usar o produto do armário de cima' }
    expect(rowToTemplate(templateToRow(t))).toEqual(t)
    expect(templateToRow({ ...t, note: '   ' }).note).toBeNull()
  })
})

describe('diff', () => {
  it('sem mudança, diff vazio', () => {
    expect(isEmptyDiff(diff(base(), base()))).toBe(true)
  })

  it('envia só o que mudou', () => {
    const a = base()
    const b: HomeData = {
      ...a,
      templates: a.templates.slice(1).map((t, i) => (i === 0 ? { ...t, title: 'Novo nome' } : t)),
      occurrences: { ...a.occurrences, 'x@2026-11-25': { claimedBy: null } },
      settings: { ...a.settings, dailyLimit: 5 },
    }
    const d = diff(a, b)
    expect(d.deleteTemplates).toEqual([a.templates[0].id])
    expect(d.upsertTemplates.map((t) => t.title)).toEqual(['Novo nome'])
    expect(Object.keys(d.upsertOccurrences)).toEqual(['x@2026-11-25'])
    expect(d.settings?.dailyLimit).toBe(5)
    expect(applyDiff(a, d)).toEqual(b)
  })

  it('soltar a tarefa (undefined) depois de ter assumido conta como mudança', () => {
    const a: HomeData = { ...base(), occurrences: { k: { claimedBy: 'ney' } } }
    const b: HomeData = { ...a, occurrences: { k: { claimedBy: undefined } } }
    expect(Object.keys(diff(a, b).upsertOccurrences)).toEqual(['k'])
  })

  it('apagar o histórico apaga as ocorrências', () => {
    const a: HomeData = { ...base(), occurrences: { k1: {}, k2: { doneBy: 'cleide' } } }
    const d = diff(a, { ...a, occurrences: {} })
    expect(d.deleteOccurrences.sort()).toEqual(['k1', 'k2'])
  })

  it('mudança local pendente vence o que veio do banco', () => {
    const remote: HomeData = { ...base(), occurrences: { k: { doneBy: 'cleide' }, j: { claimedBy: 'cleide' } } }
    const lastKnown: HomeData = { ...base(), occurrences: { k: {} } }
    const local: HomeData = { ...base(), occurrences: { k: { doneBy: 'ney' } } }
    const merged = applyDiff(remote, diff(lastKnown, local))
    expect(merged.occurrences).toEqual({ k: { doneBy: 'ney' }, j: { claimedBy: 'cleide' } })
  })
})

describe('keepOrder', () => {
  it('mantém a ordem local e põe as novas no fim', () => {
    const [a, b, c] = base().templates
    const n = { ...a, id: 'nova' }
    expect(keepOrder([n, c, a, b], [a, b, c]).map((t) => t.id)).toEqual([a.id, b.id, c.id, 'nova'])
  })
})
