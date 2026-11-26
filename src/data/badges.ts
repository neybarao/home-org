import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { BADGES, evaluateBadges, type BadgeResults } from '../lib/badges'
import type { ISODate } from '../lib/dates'
import { isHydrated, useHome, useSyncStatus } from './store'

/*
 * Conquistas guardadas neste aparelho:
 * - earned: as que já foram ganhas e a data. Uma vez aqui, não saem mais,
 *   mesmo que a tarefa que ajudou a ganhar seja apagada depois.
 * - seen: as que já apareceram na comemoração neste celular.
 * O cálculo vem do histórico compartilhado, então os dois celulares chegam às
 * mesmas conquistas; cada um comemora uma vez.
 */

interface Saved {
  earned: Record<string, ISODate>
  seen: string[]
}

const KEY = 'home-org:badges'

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : {}
    return { earned: v.earned ?? {}, seen: v.seen ?? [] }
  } catch {
    return { earned: {}, seen: [] }
  }
}

let saved: Saved = load()
const listeners = new Set<() => void>()

function save(next: Saved) {
  saved = next
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    /* sem espaço ou modo privado: segue em memória */
  }
  listeners.forEach((l) => l())
}

function useSaved(): Saved {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => saved,
  )
}

export function markSeen(ids: string[]) {
  const seen = new Set(saved.seen)
  ids.forEach((id) => seen.add(id))
  save({ ...saved, seen: [...seen] })
}

export interface BadgesState {
  results: BadgeResults
  /** Data de cada conquista ganha (calculada ou guardada). */
  earned: Record<string, ISODate>
  /** Ganhas e ainda não comemoradas neste celular, na ordem em que foram ganhas. */
  unseen: string[]
  /** Os dados já são os da casa? Antes disso não comemora nada. */
  ready: boolean
}

export function useBadges(today: ISODate): BadgesState {
  const data = useHome()
  useSyncStatus() // reavalia quando a primeira leitura do banco termina
  const ready = isHydrated()
  const s = useSaved()
  const results = useMemo(() => evaluateBadges(data, today), [data, today])

  // Guarda o que acabou de ser ganho (só com os dados reais da casa).
  useEffect(() => {
    if (!ready) return
    const fresh = BADGES.filter((b) => results[b.id].earnedOn && !saved.earned[b.id])
    if (fresh.length === 0) return
    const earned = { ...saved.earned }
    for (const b of fresh) earned[b.id] = results[b.id].earnedOn!
    save({ ...saved, earned })
  }, [ready, results])

  return useMemo(() => {
    const earned: Record<string, ISODate> = { ...s.earned }
    if (ready) for (const b of BADGES) if (results[b.id].earnedOn && !earned[b.id]) earned[b.id] = results[b.id].earnedOn!
    const order = new Map(BADGES.map((b, i) => [b.id, i]))
    const unseen = Object.keys(earned)
      .filter((id) => order.has(id) && !s.seen.includes(id))
      .sort((a, b) => earned[a].localeCompare(earned[b]) || order.get(a)! - order.get(b)!)
    return { results, earned, unseen: ready ? unseen : [], ready }
  }, [results, s, ready])
}
