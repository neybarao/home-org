import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Person } from '../lib/types'
import { fetchMember } from './remote'
import { loadMember, saveMember } from './repo'
import { appUrl, linkError, supabase } from './supabase'

export type AuthState =
  | { kind: 'local' } // sem Supabase configurado: modo só neste celular
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'sent'; email: string }
  | { kind: 'waiting'; email: string; userId: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; person: Person; email: string; userId: string }

const PENDING_KEY = 'home-org:pending-email'
const POLL_MS = 15_000

function pendingEmail(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}
function setPendingEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(PENDING_KEY, email)
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignora */
  }
}

function friendly(e: unknown): string {
  if (!navigator.onLine) return 'Sem internet. Confira a conexão e tente de novo.'
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  if (/rate limit|too many|security purposes/i.test(msg)) return 'Muitos pedidos em pouco tempo. Espere um minuto e tente de novo.'
  if (/expired|invalid/i.test(msg)) return 'O link ou código venceu ou já foi usado. Peça um novo.'
  return msg
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    if (!supabase) return { kind: 'local' }
    if (linkError) return { kind: 'error', message: friendly(linkError) }
    return { kind: 'loading' }
  })
  const sessionRef = useRef<Session | null>(null)

  /** Descobre quem é a conta na casa. Com cache, entra na hora e confere em segundo plano. */
  const resolve = useCallback(async (session: Session) => {
    const userId = session.user.id
    const email = session.user.email ?? ''
    setPendingEmail(null)
    const cached = loadMember(userId)
    if (cached) setState({ kind: 'ready', person: cached, email, userId })
    else setState((s) => (s.kind === 'waiting' ? s : { kind: 'loading' }))
    try {
      const person = await fetchMember(userId)
      if (sessionRef.current?.user.id !== userId) return
      saveMember(userId, person)
      setState(person ? { kind: 'ready', person, email, userId } : { kind: 'waiting', email, userId })
    } catch (e) {
      if (!cached) setState({ kind: 'error', message: friendly(e) })
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      sessionRef.current = session
      // Chamadas ao Supabase fora do callback, como pede a documentação do supabase-js.
      window.setTimeout(() => {
        if (session) {
          if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return
          void resolve(session)
        } else {
          setState((s) => {
            if (s.kind === 'error') return s
            const email = pendingEmail()
            return email ? { kind: 'sent', email } : { kind: 'signedOut' }
          })
        }
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [resolve])

  // Aguardando liberação: confere sozinha a cada 15 s e quando o app volta para a frente.
  useEffect(() => {
    if (state.kind !== 'waiting') return
    const check = () => sessionRef.current && void resolve(sessionRef.current)
    const id = window.setInterval(check, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state.kind, resolve])

  const sendLink = useCallback(async (rawEmail: string) => {
    if (!supabase) return
    const email = rawEmail.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: appUrl() } })
    if (error) throw new Error(friendly(error))
    setPendingEmail(email)
    setState({ kind: 'sent', email })
  }, [])

  /** Código do e-mail, para quando o link abre em outro navegador (ex.: app instalado no iPhone). */
  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return
    const { error } = await supabase.auth.verifyOtp({ email, token: code.replace(/\D/g, ''), type: 'email' })
    if (error) throw new Error(friendly(error))
  }, [])

  const restart = useCallback(() => {
    setPendingEmail(null)
    setState({ kind: 'signedOut' })
  }, [])

  const retry = useCallback(() => {
    if (sessionRef.current) void resolve(sessionRef.current)
    else restart()
  }, [resolve, restart])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const userId = sessionRef.current?.user.id
    await supabase.auth.signOut({ scope: 'local' })
    if (userId) saveMember(userId, null)
    setPendingEmail(null)
    setState({ kind: 'signedOut' })
  }, [])

  return { state, sendLink, verifyCode, restart, retry, signOut }
}
