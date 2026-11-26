import { useRef, useState } from 'react'
import { Avatar, Card, Segmented, SectionTitle, Switch } from '../components/ui'
import { haptic, withTransition } from '../lib/motion'
import { actions, syncNow, useHome, useSyncStatus, type SyncStatus } from '../data/store'
import type { ThemeChoice } from '../lib/theme'
import { BUILD_SHA, BUILD_TIME, checkForUpdate, type UpdateResult } from '../lib/update'
import { PEOPLE, type Person } from '../lib/types'

export function SettingsScreen({
  me,
  onChangeMe,
  account,
  theme,
  onChangeTheme,
}: {
  me: Person
  /** Só no modo local. Com conta, a pessoa vem de public.members. */
  onChangeMe?: (p: Person) => void
  account?: { email: string; onSignOut: () => Promise<void> }
  theme: ThemeChoice
  onChangeTheme: (t: ThemeChoice) => void
}) {
  const { settings } = useHome()
  const limit = settings.dailyLimit
  const direction = useRef<'up' | 'down' | null>(null)
  const change = (next: number) => {
    if (next === limit) return
    direction.current = next > limit ? 'up' : 'down'
    haptic()
    actions.setSettings({ dailyLimit: next })
  }
  const step = 'pop glass grid size-12 place-items-center rounded-full text-2xl font-medium'

  return (
    <div>
      <h1 className="text-[2.125rem] leading-none font-light tracking-[-0.03em] text-ink">Ajustes</h1>

      <section className="mt-7">
        <SectionTitle>Aparência</SectionTitle>
        <Segmented
          label="Tema"
          slide={false}
          value={theme}
          onChange={onChangeTheme}
          options={[
            ['system', 'Automático'],
            ['light', 'Claro'],
            ['dark', 'Escuro'],
          ]}
        />
      </section>

      <section className="mt-7">
        <SectionTitle>Rotina</SectionTitle>
        <Card className="p-5">
          <p className="font-semibold">Tarefas por pessoa, por dia</p>
          <p className="text-[13px] text-muted">Ainda em aberto. Ajustem conforme forem usando.</p>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => change(Math.max(1, limit - 1))} aria-label="Diminuir" className={step}>
              −
            </button>
            <span className="tabular w-12 overflow-hidden text-center text-[36px] font-light tracking-tight" aria-live="polite">
              <span key={limit} className={`block ${direction.current ? `tick-${direction.current}` : ''}`}>
                {limit}
              </span>
            </span>
            <button onClick={() => change(Math.min(12, limit + 1))} aria-label="Aumentar" className={step}>
              +
            </button>
            <span className="ml-1 text-[13px] text-muted">{limit * 2} no total, com os dois</span>
          </div>
        </Card>

        <label className="glass mt-2 flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <span>
            <span className="block font-semibold">Resumo do dia</span>
            <span className="block text-[13px] text-muted">Mostra em Hoje quantas foram feitas e por quem.</span>
          </span>
          <Switch checked={settings.showSummary} onChange={(v) => actions.setSettings({ showSummary: v })} />
        </label>
      </section>

      {account ? (
        <AccountSection me={me} email={account.email} onSignOut={account.onSignOut} />
      ) : (
        <section className="mt-7">
          <SectionTitle>Quem usa este celular</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PEOPLE) as Person[]).map((p) => (
              <button
                key={p}
                aria-pressed={me === p}
                onClick={() => {
                  haptic()
                  withTransition(() => onChangeMe?.(p))
                }}
                className={`pop flex items-center gap-3 rounded-[24px] p-2.5 pr-4 font-semibold ${me === p ? 'bg-solid text-on-solid' : 'glass'}`}
              >
                <Avatar person={p} size={40} />
                {PEOPLE[p].name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <SectionTitle>Dados</SectionTitle>
        <Card className="p-5">
          {account ? (
            <SyncLine />
          ) : (
            <p className="text-[14px] text-muted">Tudo fica só neste celular. Sem o banco de dados configurado, o outro não vê as mudanças.</p>
          )}
          <button
            onClick={() => {
              if (window.confirm(account
                ? 'Apagar o histórico dos dois celulares e começar a contar a partir de hoje? As tarefas cadastradas continuam.'
                : 'Apagar o histórico e começar a contar a partir de hoje? As tarefas cadastradas continuam.')) actions.startFresh()
            }}
            className="pop mt-4 h-12 w-full rounded-full bg-white/80 font-semibold ring-1 ring-black/5 dark:bg-white/[0.08] dark:ring-white/10"
          >
            Começar do zero a partir de hoje
          </button>
          <button
            onClick={() => {
              if (window.confirm(account
                ? 'Voltar para os dados de exemplo nos dois celulares? O que vocês mudaram será perdido.'
                : 'Voltar para os dados de exemplo? O que vocês mudaram será perdido.')) actions.resetDemo()
            }}
            className="pop mt-2 h-12 w-full rounded-full font-semibold text-muted"
          >
            Voltar aos dados de exemplo
          </button>
        </Card>
      </section>

      <UpdateSection />
    </div>
  )
}

function UpdateSection() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<UpdateResult | 'error' | null>(null)
  const built = new Date(BUILD_TIME).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const text: Record<UpdateResult | 'error', string> = {
    updating: 'Achamos uma versão nova. O app vai recarregar sozinho em instantes.',
    latest: 'Você já está na versão mais nova.',
    offline: 'Sem internet. Tente de novo quando a conexão voltar.',
    unsupported: 'Este navegador não deixa procurar atualização. Feche e abra o app de novo.',
    error: 'Não deu para procurar agora. Tente de novo daqui a pouco.',
  }
  return (
    <section className="mt-7">
      <SectionTitle>App</SectionTitle>
      <Card className="p-5">
        <p className="text-[14px] text-muted">
          Versão de {built} <span className="tabular">({BUILD_SHA})</span>. O app procura atualização sozinho ao abrir e quando volta para a frente.
        </p>
        {result && (
          <p className="mt-2 text-[14px] text-ink" aria-live="polite">
            {text[result]}
          </p>
        )}
        <button
          disabled={busy}
          onClick={async () => {
            haptic()
            setBusy(true)
            try {
              setResult(await checkForUpdate())
            } catch {
              setResult('error')
            } finally {
              setBusy(false)
            }
          }}
          className="pop mt-4 h-12 w-full rounded-full bg-white/80 font-semibold ring-1 ring-black/5 disabled:opacity-50 dark:bg-white/[0.08] dark:ring-white/10"
        >
          {busy ? 'Procurando…' : 'Procurar atualização'}
        </button>
      </Card>
    </section>
  )
}

function AccountSection({ me, email, onSignOut }: { me: Person; email: string; onSignOut: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <section className="mt-7">
      <SectionTitle>Conta</SectionTitle>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Avatar person={me} size={40} />
          <span className="min-w-0">
            <span className="block font-semibold">{PEOPLE[me].name}</span>
            <span className="block truncate text-[13px] text-muted">{email}</span>
          </span>
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            if (!window.confirm('Sair desta conta neste celular? Para voltar, entre de novo com e-mail e senha.')) return
            setBusy(true)
            try {
              await onSignOut()
            } finally {
              setBusy(false)
            }
          }}
          className="pop mt-4 h-12 w-full rounded-full bg-white/80 font-semibold ring-1 ring-black/5 disabled:opacity-50 dark:bg-white/[0.08] dark:ring-white/10"
        >
          {busy ? 'Saindo…' : 'Sair desta conta'}
        </button>
      </Card>
    </section>
  )
}

function lastSyncText(ms?: number): string {
  if (!ms) return ''
  const min = Math.round((Date.now() - ms) / 60_000)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  return `às ${new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function syncText(s: SyncStatus): string {
  switch (s.state) {
    case 'local':
      return 'Só neste celular.'
    case 'connecting':
      return 'Conectando ao banco…'
    case 'syncing':
      return 'Sincronizando…'
    case 'synced':
      return `Sincronizado ${lastSyncText(s.lastSync)}. Os dois celulares veem a mesma lista.`
    case 'offline':
      return 'Sem internet. O que vocês mudarem fica guardado aqui e sobe quando a conexão voltar.'
    case 'error':
      return `Não deu para sincronizar${s.message ? ` (${s.message})` : ''}. O app tenta de novo sozinho.`
  }
}

function SyncLine() {
  const s = useSyncStatus()
  const dot = s.state === 'synced' ? 'bg-ink/50' : s.state === 'error' ? 'bg-late' : 'bg-accent'
  return (
    <div>
      <p className="flex items-start gap-2.5 text-[14px] text-muted" aria-live="polite">
        <span className={`mt-[7px] size-2 shrink-0 rounded-full ${dot} ${s.state === 'syncing' || s.state === 'connecting' ? 'animate-pulse' : ''}`} aria-hidden />
        <span>{syncText(s)}</span>
      </p>
      {(s.state === 'error' || s.state === 'offline') && (
        <button onClick={() => void syncNow()} className="pop mt-2 text-[14px] font-semibold text-ink underline underline-offset-4">
          Tentar agora
        </button>
      )}
    </div>
  )
}
