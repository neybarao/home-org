import { useEffect, useRef, useState } from 'react'
import { BadgeCelebration } from './components/Badges'
import { Icon } from './components/Icon'
import { PullToRefresh } from './components/PullToRefresh'
import { TaskDetailHost } from './components/TaskDetail'
import { Avatar } from './components/ui'
import { useAuth } from './data/auth'
import { loadMe, saveMe } from './data/repo'
import { startSync, stopSync } from './data/store'
import { haptic } from './lib/motion'
import { todayISO } from './lib/dates'
import { useTheme } from './lib/theme'
import { PEOPLE, type Person } from './lib/types'
import { AuthErrorScreen, LoadingScreen, SignInScreen, WaitingScreen } from './screens/AuthScreens'
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
      return <SignInScreen onSignIn={auth.signIn} onSignUp={auth.signUp} />
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
      {/* Conquista nova aparece por cima de qualquer aba. */}
      <BadgeCelebration today={today} />
      {/* A página entra com um fade curto; a navegação anima sozinha (sem View Transition). */}
      <main key={tab} className="tab-in flex-1 px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-32">
        {tab === 'hoje' && (
          <TaskDetailHost me={me} today={today}>
            <TodayScreen me={me} today={today} />
          </TaskDetailHost>
        )}
        {tab === 'progresso' && <ProgressScreen today={today} />}
        {tab === 'casa' && <HouseScreen />}
        {tab === 'ajustes' && <SettingsScreen me={me} onChangeMe={onChangeMe} account={account} theme={theme} onChangeTheme={setTheme} />}
      </main>

      <TabBar
        tab={tab}
        onChange={(id) => {
          haptic()
          setTab(id)
          window.scrollTo(0, 0) // cada aba começa do topo
        }}
      />
    </div>
  )
}

const SLOT = 56 // botão fechado (só ícone)
const GAP = 6
const PAD = 6

/**
 * Navegação de baixo. O destaque é uma pílula só, que desliza e muda de largura
 * enquanto os botões abrem e fecham juntos, com a mesma mola. Tudo em CSS, sem
 * View Transition: o Safari tira "foto" quadrada dos botões de vidro na transição.
 */
function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const measure = useRef<HTMLDivElement>(null)
  // Largura de cada rótulo, medida uma vez (e de novo se a fonte carregar depois).
  const [labelW, setLabelW] = useState<number[]>(() => TABS.map(([, l]) => l.length * 8.5))
  useEffect(() => {
    const read = () => {
      const spans = measure.current?.querySelectorAll('span')
      if (spans?.length) setLabelW([...spans].map((el) => Math.ceil(el.getBoundingClientRect().width)))
    }
    read()
    document.fonts?.ready.then(read).catch(() => {})
  }, [])

  // Aberto: ícone (22) + espaço (8) + rótulo, com 17 de cada lado do ícone e 20 depois do texto.
  const widths = TABS.map(([id], i) => (id === tab ? 17 + 22 + 8 + labelW[i] + 20 : SLOT))
  const activeIndex = TABS.findIndex(([id]) => id === tab)
  const left = PAD + widths.slice(0, activeIndex).reduce((a, w) => a + w + GAP, 0)

  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-bg via-bg/80 to-transparent pt-8 pb-[max(env(safe-area-inset-bottom),1rem)]"
    >
      <div aria-hidden ref={measure} className="pointer-events-none invisible absolute font-semibold whitespace-nowrap">
        {TABS.map(([id, label]) => (
          <span key={id} className="inline-block">
            {label}
          </span>
        ))}
      </div>
      <div className="tabbar glass-bar relative flex rounded-full" style={{ padding: PAD, gap: GAP }}>
        <span
          aria-hidden
          className="tab-pill glass-edge absolute top-[6px] left-0 h-14 rounded-full bg-solid"
          style={{ width: widths[activeIndex], transform: `translateX(${left}px)` }}
        />
        {TABS.map(([id, label, icon], i) => {
          const active = id === tab
          return (
            <button
              key={id}
              onClick={() => !active && onChange(id)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={`tab-btn relative flex h-14 items-center overflow-hidden rounded-full pl-[17px] ${active ? 'is-active text-on-solid' : 'text-ink'}`}
              style={{ width: widths[i] }}
            >
              {/* Vidro do botão fechado: some quando a pílula chega. */}
              <span aria-hidden className="tab-glass glass-btn absolute inset-0 rounded-full" />
              <span className="relative shrink-0">
                <Icon name={icon} />
              </span>
              <span aria-hidden className="tab-label relative ml-2 font-semibold whitespace-nowrap">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
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
