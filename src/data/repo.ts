import type { HomeData } from '../lib/types'

/**
 * Onde os dados da casa ficam guardados.
 * Hoje: só neste aparelho (localStorage), para validar a interface.
 * Depois: uma implementação com Supabase, para os dois celulares verem a mesma lista.
 */
export interface HomeRepo {
  load(): HomeData | null
  save(data: HomeData): void
}

const KEY = 'home-org:data'

export const localRepo: HomeRepo = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as HomeData) : null
    } catch {
      return null
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // Sem espaço ou modo privado: segue só em memória.
    }
  },
}

/** Quem está usando este celular. Fica só no aparelho, não é compartilhado. */
const ME_KEY = 'home-org:me'

export function loadMe(): 'ney' | 'cleide' | null {
  try {
    const v = localStorage.getItem(ME_KEY)
    return v === 'ney' || v === 'cleide' ? v : null
  } catch {
    return null
  }
}

export function saveMe(me: 'ney' | 'cleide') {
  try {
    localStorage.setItem(ME_KEY, me)
  } catch {
    /* ignora */
  }
}
