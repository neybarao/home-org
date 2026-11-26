import { useState, type FormEvent, type ReactNode } from 'react'

const field = 'glass mt-2 h-14 w-full rounded-[20px] px-4 text-[16px] text-ink placeholder:text-muted'
const primary = 'pop h-14 w-full rounded-full bg-solid text-[16px] font-semibold text-on-solid disabled:opacity-50'
const secondary = 'pop h-12 w-full rounded-full font-semibold text-muted'

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-end px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),3rem)]">
      <h1 className="text-[2.25rem] leading-[1.1] font-light tracking-[-0.03em]">{title}</h1>
      {children}
    </div>
  )
}

function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null
  return (
    <p role="alert" className="mt-3 px-1 text-[14px] text-late">
      {children}
    </p>
  )
}

/** Envia ação assíncrona com estado de carregando e mensagem de erro. */
function useSubmit<A extends unknown[]>(fn: (...args: A) => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (...args: A) => {
    setBusy(true)
    setError(null)
    try {
      await fn(...args)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

export function SignInScreen({
  onSignIn,
  onSignUp,
}: {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}) {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, run } = useSubmit(mode === 'in' ? onSignIn : onSignUp)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (email.trim() && password) void run(email, password)
  }
  const up = mode === 'up'
  return (
    <Shell title={up ? 'Criar conta no Dia' : 'Entrar no Dia'}>
      <p className="mt-3 text-[17px] text-muted">
        {up ? 'Cada um cria a própria conta uma vez. Depois o app fica conectado neste celular.' : 'Use o e-mail e a senha que você criou.'}
      </p>
      <form onSubmit={submit} className="mt-8">
        <label className="block">
          <span className="px-1 text-[13px] font-medium text-muted">E-mail</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            placeholder="voce@exemplo.com"
          />
        </label>
        <label className="mt-4 block">
          <span className="px-1 text-[13px] font-medium text-muted">{up ? 'Crie uma senha (mínimo 6 caracteres)' : 'Senha'}</span>
          <input
            type="password"
            autoComplete={up ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </label>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={busy} className={`${primary} mt-6`}>
          {busy ? (up ? 'Criando…' : 'Entrando…') : up ? 'Criar conta' : 'Entrar'}
        </button>
      </form>
      <button type="button" onClick={() => setMode(up ? 'in' : 'up')} className={`${secondary} mt-2`}>
        {up ? 'Já tenho conta' : 'Primeira vez? Criar conta'}
      </button>
    </Shell>
  )
}

export function WaitingScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <Shell title="Quase lá">
      <p className="mt-3 text-[17px] text-muted">
        Você entrou como <span className="font-semibold text-ink">{email}</span>, mas esta conta ainda não foi liberada para a casa.
      </p>
      <p className="mt-3 text-[17px] text-muted">Assim que liberar, o app abre sozinho. Pode deixar esta tela aberta.</p>
      <div className="glass mt-8 flex items-center gap-3 rounded-[28px] px-5 py-4" aria-live="polite">
        <span className="size-2.5 animate-pulse rounded-full bg-accent" aria-hidden />
        <span className="text-[15px]">Aguardando liberação</span>
      </div>
      <button onClick={onSignOut} className={`${secondary} mt-6`}>
        Sair e entrar com outra conta
      </button>
    </Shell>
  )
}

export function AuthErrorScreen({ message, onRetry, onRestart }: { message: string; onRetry: () => void; onRestart: () => void }) {
  return (
    <Shell title="Não deu certo">
      <p className="mt-3 text-[17px] text-muted">{message}</p>
      <button onClick={onRetry} className={`${primary} mt-8`}>
        Tentar de novo
      </button>
      <button onClick={onRestart} className={`${secondary} mt-2`}>
        Voltar para o login
      </button>
    </Shell>
  )
}

export function LoadingScreen() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <span className="size-3 animate-pulse rounded-full bg-accent" aria-label="Carregando" />
    </div>
  )
}
