import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined

/**
 * Erro que o Supabase devolve no endereço quando o link do e-mail falha
 * (ex.: link vencido). Lido antes de criar o cliente, que limpa o endereço.
 */
export const linkError: string | null = (() => {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.hash.slice(1) + '&' + window.location.search.slice(1))
  const msg = params.get('error_description') ?? params.get('error')
  if (!msg) return null
  history.replaceState(null, '', window.location.pathname)
  return msg.replace(/\+/g, ' ')
})()

/**
 * Cliente do Supabase. Fica nulo quando as variáveis não existem
 * (ex.: `npm run dev` sem .env), e aí o app segue no modo só local.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

/** Endereço para onde o link do e-mail volta. */
export function appUrl(): string {
  return window.location.origin + import.meta.env.BASE_URL
}
