import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { PullToRefresh } from './components/PullToRefresh'
import { Avatar } from './components/ui'
import { useAuth } from './data/auth'
import { loadMe, saveMe } from './data/repo'
import { startSync, stopSync } from './data/store'
import { haptic, withTransition } from './lib/motion'
import { todayISO } from './lib/dates'
import { useTheme } from './lib/theme'
import { PEOPLE, type Person } from './lib/types'
import { AuthErrorScreen, CheckEmailScreen, LoadingScreen, SignInScreen, WaitingScreen } from './screens/AuthScreens'
import { HouseScreen } from './screens/HouseScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TodayScreen } from './screens/TodayScreen'

type Tab = 'hoje' | 'progresso' | 'casa' | 'ajustes'

/** Atualiza a data quando o app volta para a frente (ex.: aberto de um dia para o outro). */
function useToday() {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const refresh = () => setToday(todayISO())
    document.addEventListener('visibilitychange', refresh)
    const id = window.setInterval(refresh, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(id)
    }
  }, [])
  return today
}

const TABS = [
  ['hoje', 'Hoje', 'today'],
  ['progresso', 'Progresso', 'rings'],
  ['casa', 'Tarefas', 'house'],
  ['ajustes', 'Ajustes', 'settings'],
] as const

export default function App() {
  const auth = useAuth()
  const { state } = auth
  const ready = state.kind === 'ready'

  // Sincroniza com o banco só quando a conta está liberada em public.members.
  useEffect(() => {
    if (!ready) return
    startSync()
    return () => stopSync()
  }, [ready])

  switch (state.kind) {
    case 'local':
      return <LocalApp />
    case 'loading':
      return <LoadingScreen />
    case 'signedOut':
      return <SignInScreen onSend={auth.sendLink} />
    case 'sent':
      return <CheckEmailScreen email={state.email} onResend={auth.sendLink} onCode={auth.verifyCode} onBack={auth.restart} />
    case 'waiting':
      return <WaitingScreen email={state.email} onSignOut={() => void auth.signOut()} />
    case 'error':
      return <AuthErrorScreen message={state.message} onRetry={auth.retry} onRestart={auth.restart} />
    case 'ready':
      return <Main me={state.person} account={{ email: state.email, onSignOut: auth.signOut }} />
  }
}

/** Sem Supabase configurado (ex.: dev local sem .env): escolhe a pessoa à mão, dados só neste celular. */
function LocalApp() {
  const [me, setMe] = useState<Person | null>(loadMe)
  const choose = (p: Person) => {
    saveMe(p)
    setMe(p)
  }
  if (!me) return <WhoAreYou onChoose={choose} />
  return <Main me={me} onChangeMe={choose} />
}

function Main({
  me,
  onChangeMe,
  account,
}: {
  me: Person
  onChangeMe?: (p: Person) => void
  account?: { email: string; onSignOut: () => Promise<void> }
}) {
  const [tab, setTab] = useState<Tab>('hoje')
  const [theme, setTheme] = useTheme()
  const today = useToday()

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <PullToRefresh />
      <main className="flex-1 px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-32">
        {tab === 'hoje' && <TodayScreen me={me} today={today} />}
        {tab === 'progresso' && <ProgressScreen today={today} />}
        {tab === 'casa' && <HouseScreen />}
        {tab === 'ajustes' && <SettingsScreen me={me} onChangeMe={onChangeMe} account={account} theme={theme} onChangeTheme={setTheme} />}
      </main>

      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-bg via-bg/80 to-transparent pt-8 pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <div className="glass-bar flex gap-1.5 rounded-full p-1.5">
          {TABS.map(([id, label, icon]) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => {
                  if (active) return
                  haptic()
                  withTransition(() => {
                    setTab(id)
                    window.scrollTo(0, 0) // cada aba começa do topo
                  }, 'tab-switch')
                }}
                style={{ viewTransitionName: `nav-${id}` }}
                aria-current={active ? 'page' : undefined}
                className={`pop flex h-14 items-center justify-center gap-2 rounded-full ${
                  active ? 'glass-edge bg-solid px-5 font-semibold text-on-solid' : 'glass-btn w-14 text-ink'
                }`}
              >
                <Icon name={icon} />
                <span className={active ? '' : 'sr-only'}>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function WhoAreYou({ onChoose }: { onChoose: (p: Person) => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-end px-5 pb-12">
      <h1 className="text-[2.25rem] font-light leading-[1.1] tracking-[-0.03em]">Quem está usando este celular?</h1>
      <p className="mt-3 text-[17px] text-muted">Assim o app sabe de quem é cada tarefa que você assumir. Dá pra trocar depois em Ajustes.</p>
      <div className="mt-8 grid grid-cols-2 gap-3">
        {(Object.keys(PEOPLE) as Person[]).map((p) => (
          <button key={p} onClick={() => onChoose(p)} className="pop glass flex aspect-[1/1.05] flex-col justify-between rounded-[28px] p-4 text-left">
            <Avatar person={p} size={52} />
            <span className="text-xl font-semibold">{PEOPLE[p].name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
