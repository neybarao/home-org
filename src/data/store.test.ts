import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { HomeData } from '../lib/types'

// Ambiente mínimo de navegador para o store rodar no Node.
const mem = new Map<string, string>()
beforeAll(() => {
  Object.assign(globalThis, {
    window: Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} }),
    document: { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' },
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    },
  })
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
})

// Banco falso em memória.
let db: HomeData
let onRemote: ((c: unknown) => void) | null = null
vi.mock('./supabase', () => ({ supabase: {}, appUrl: () => '', linkError: null }))
vi.mock('./remote', async (orig) => {
  const real = await orig<typeof import('./remote')>()
  return {
    ...real,
    fetchAll: async () => structuredClone(db),
    pushDiff: async (d: import('./remote').Diff) => {
      db = real.applyDiff(db, structuredClone(d))
    },
    subscribe: (fn: (c: unknown) => void) => {
      onRemote = fn
      return () => {}
    },
  }
})

const tick = () => new Promise((r) => setTimeout(r, 20))

describe('store sincronizado', () => {
  it('banco vazio recebe os dados deste celular; mudanças sobem; Realtime chega', async () => {
    db = { version: 1, templates: [], occurrences: {}, settings: { dailyLimit: 3, startDate: '2026-11-26', showSummary: false } }
    const store = await import('./store')
    const { actions, startSync, stopSync } = store
    startSync()
    await tick()
    expect(db.templates.length).toBeGreaterThan(0)

    actions.claim('coco@2026-11-26', 'ney')
    await tick()
    expect(db.occurrences['coco@2026-11-26']).toEqual({ claimedBy: 'ney' })

    // A Cleide marcou outra tarefa no celular dela.
    onRemote?.({ table: 'occurrences', deleted: false, key: 'louca@2026-11-26', state: { doneBy: 'cleide', doneOn: '2026-11-26' } })
    const local = JSON.parse(mem.get('home-org:data')!) as HomeData
    expect(local.occurrences['louca@2026-11-26']).toEqual({ doneBy: 'cleide', doneOn: '2026-11-26' })

    // A Cleide mudou o limite no banco enquanto este celular estava fechado.
    db = { ...db, settings: { ...db.settings, dailyLimit: 5 } }
    store.syncNow()
    await tick()
    expect((JSON.parse(mem.get('home-org:data')!) as HomeData).settings.dailyLimit).toBe(5)
    stopSync()
  })
})
