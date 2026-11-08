import { useSyncExternalStore } from 'react'
import { todayISO } from '../lib/dates'
import { demoData } from '../lib/seed'
import type { HomeData, Move, OccurrenceState, Person, Settings, TaskTemplate } from '../lib/types'
import { localRepo, type HomeRepo } from './repo'

const repo: HomeRepo = localRepo

let data: HomeData = repo.load() ?? demoData(todayISO())
const listeners = new Set<() => void>()

function commit(next: HomeData) {
  data = next
  repo.save(data)
  listeners.forEach((l) => l())
}

function patchOcc(key: string, fn: (s: OccurrenceState) => OccurrenceState) {
  const current = data.occurrences[key] ?? {}
  commit({ ...data, occurrences: { ...data.occurrences, [key]: fn(current) } })
}

export function useHome(): HomeData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => data,
  )
}

export const actions = {
  /** Assume a tarefa. Se já era sua, solta. Se era do outro, passa para você. */
  claim(key: string, me: Person) {
    patchOcc(key, (s) => ({ ...s, claimedBy: s.claimedBy === me ? undefined : me }))
  },

  toggleDone(key: string, me: Person, today: string) {
    patchOcc(key, (s) =>
      s.doneBy
        ? { ...s, doneBy: undefined, doneOn: undefined }
        : { ...s, claimedBy: s.claimedBy ?? me, doneBy: s.claimedBy ?? me, doneOn: today },
    )
  },

  applyMoves(moves: Move[]) {
    const occurrences = { ...data.occurrences }
    for (const m of moves) occurrences[m.key] = { ...occurrences[m.key], plannedDate: m.to, claimedBy: undefined }
    commit({ ...data, occurrences })
  },

  saveTemplate(t: TaskTemplate) {
    const exists = data.templates.some((x) => x.id === t.id)
    commit({ ...data, templates: exists ? data.templates.map((x) => (x.id === t.id ? t : x)) : [...data.templates, t] })
  },

  deleteTemplate(id: string) {
    commit({ ...data, templates: data.templates.filter((x) => x.id !== id) })
  },

  setSettings(patch: Partial<Settings>) {
    commit({ ...data, settings: { ...data.settings, ...patch } })
  },

  resetDemo() {
    commit(demoData(todayISO()))
  },

  /** Zera o histórico e começa a contar a partir de hoje, mantendo as tarefas cadastradas. */
  startFresh() {
    commit({ ...data, occurrences: {}, settings: { ...data.settings, startDate: todayISO() } })
  },
}
