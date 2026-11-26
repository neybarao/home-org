import type { HomeData } from '../lib/types'

/**
 * Cache local dos dados da casa (localStorage). Com o Supabase ligado, o store.ts
 * sincroniza este cache com o banco; sem ele, o app funciona só neste aparelho.
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

/** Último estado conhecido do banco (Supabase). Serve para saber o que ainda não subiu. */
const BASE_KEY = 'home-org:base'

export function loadBase(): HomeData | null {
  try {
    const raw = localStorage.getItem(BASE_KEY)
    return raw ? (JSON.parse(raw) as HomeData) : null
  } catch {
    return null
  }
}

export function saveBase(base: HomeData | null) {
  try {
    if (base) localStorage.setItem(BASE_KEY, JSON.stringify(base))
    else localStorage.removeItem(BASE_KEY)
  } catch {
    /* ignora */
  }
}

/** Quem é a conta logada na casa (vem de public.members). Guardado para abrir sem internet. */
const MEMBER_KEY = 'home-org:member'

export function loadMember(userId: string): 'ney' | 'cleide' | null {
  try {
    const raw = localStorage.getItem(MEMBER_KEY)
    const v = raw ? (JSON.parse(raw) as { userId?: string; person?: string }) : null
    return v?.userId === userId && (v.person === 'ney' || v.person === 'cleide') ? v.person : null
  } catch {
    return null
  }
}

export function saveMember(userId: string, person: 'ney' | 'cleide' | null) {
  try {
    if (person) localStorage.setItem(MEMBER_KEY, JSON.stringify({ userId, person }))
    else localStorage.removeItem(MEMBER_KEY)
  } catch {
    /* ignora */
  }
}
