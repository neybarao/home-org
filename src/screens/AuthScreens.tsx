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

export function SignInScreen({ onSend }: { onSend: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const { busy, error, run } = useSubmit(onSend)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (email.trim()) void run(email)
  }
  return (
    <Shell title="Entrar no Dia">
      <p className="mt-3 text-[17px] text-muted">Mandamos um link para o seu e-mail. É só tocar nele para entrar, sem senha.</p>
      <form onSubmit={submit} className="mt-8">
        <label className="block">
          <span className="px-1 text-[13px] font-medium text-muted">Seu e-mail</span>
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
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={busy} className={`${primary} mt-6`}>
          {busy ? 'Enviando…' : 'Mandar link'}
        </button>
      </form>
    </Shell>
  )
}

export function CheckEmailScreen({
  email,
  onResend,
  onCode,
  onBack,
}: {
  email: string
  onResend: (email: string) => Promise<void>
  onCode: (email: string, code: string) => Promise<void>
  onBack: () => void
}) {
  const [code, setCode] = useState('')
  const [resent, setResent] = useState(false)
  const resend = useSubmit(async () => {
    await onResend(email)
    setResent(true)
  })
  const verify = useSubmit(onCode)
  const digits = code.replace(/\D/g, '')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (digits.length >= 6) void verify.run(email, digits)
  }
  return (
    <Shell title="Confira o seu e-mail">
      <p className="mt-3 text-[17px] text-muted">
        Mandamos um link para <span className="font-semibold text-ink">{email}</span>. Abra o e-mail neste celular e toque no link. Se não
        aparecer, olhe no spam.
      </p>

      <form onSubmit={submit} className="mt-8">
        <label className="block">
          <span className="px-1 text-[13px] font-medium text-muted">Se o e-mail tiver um código, digite aqui</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={10}
            className={`${field} tabular tracking-[0.2em]`}
            placeholder="000000"
          />
        </label>
        <ErrorText>{verify.error}</ErrorText>
        {digits.length >= 6 && (
          <button type="submit" disabled={verify.busy} className={`${primary} mt-4`}>
            {verify.busy ? 'Conferindo…' : 'Entrar com o código'}
          </button>
        )}
      </form>

      <ErrorText>{resend.error}</ErrorText>
      <button onClick={() => void resend.run()} disabled={resend.busy} className={`${secondary} mt-6`}>
        {resend.busy ? 'Enviando…' : resent ? 'Mandamos de novo' : 'Mandar outro link'}
      </button>
      <button onClick={onBack} className={secondary}>
        Usar outro e-mail
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
        Sair e usar outro e-mail
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
        Pedir um novo link
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
