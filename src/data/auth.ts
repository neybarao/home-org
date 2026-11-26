import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Person } from '../lib/types'
import { fetchMember } from './remote'
import { loadMember, saveMember } from './repo'
import { linkError, supabase } from './supabase'

export type AuthState =
  | { kind: 'local' } // sem Supabase configurado: modo só neste celular
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'waiting'; email: string; userId: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; person: Person; email: string; userId: string }

const POLL_MS = 15_000

function friendly(e: unknown): string {
  if (!navigator.onLine) return 'Sem internet. Confira a conexão e tente de novo.'
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  if (/rate limit|too many|security purposes/i.test(msg)) return 'Muitos pedidos em pouco tempo. Espere um minuto e tente de novo.'
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered|already been registered|already exists/i.test(msg)) return 'Este e-mail já tem conta. Toque em "Já tenho conta" e entre com a senha.'
  if (/password should be at least|weak password/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/email not confirmed/i.test(msg)) return 'Este e-mail ainda não foi confirmado.'
  if (/expired|invalid/i.test(msg)) return 'O link venceu ou já foi usado. Entre com e-mail e senha.'
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
          setState((s) => (s.kind === 'error' ? s : { kind: 'signedOut' }))
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

  const signIn = useCallback(async (rawEmail: string, password: string) => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword({ email: rawEmail.trim().toLowerCase(), password })
    if (error) throw new Error(friendly(error))
  }, [])

  /** Cria a conta. Com "Confirm email" desligado no Supabase, já volta logado. */
  const signUp = useCallback(async (rawEmail: string, password: string) => {
    if (!supabase) return
    const { data, error } = await supabase.auth.signUp({ email: rawEmail.trim().toLowerCase(), password })
    if (error) throw new Error(friendly(error))
    // Sem identidades = o e-mail já existia (o Supabase não revela isso como erro).
    if (data.user && data.user.identities?.length === 0) throw new Error(friendly('already registered'))
    if (!data.session) throw new Error('Conta criada, mas o Supabase pediu confirmação por e-mail. Desligue "Confirm email" no painel.')
  }, [])

  const restart = useCallback(() => {
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
    setState({ kind: 'signedOut' })
  }, [])

  return { state, signIn, signUp, restart, retry, signOut }
}
