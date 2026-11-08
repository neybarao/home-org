import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { Avatar } from './components/ui'
import { loadMe, saveMe } from './data/repo'
import { todayISO } from './lib/dates'
import { useTheme } from './lib/theme'
import { PEOPLE, type Person } from './lib/types'
import { HouseScreen } from './screens/HouseScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TodayScreen } from './screens/TodayScreen'

type Tab = 'hoje' | 'casa' | 'ajustes'

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
  ['casa', 'Tarefas', 'house'],
  ['ajustes', 'Ajustes', 'settings'],
] as const

export default function App() {
  const [me, setMe] = useState<Person | null>(loadMe)
  const [tab, setTab] = useState<Tab>('hoje')
  const [theme, setTheme] = useTheme()
  const today = useToday()

  const choose = (p: Person) => {
    saveMe(p)
    setMe(p)
  }

  if (!me) return <WhoAreYou onChoose={choose} />

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-32">
        {tab === 'hoje' && <TodayScreen me={me} today={today} />}
        {tab === 'casa' && <HouseScreen />}
        {tab === 'ajustes' && <SettingsScreen me={me} onChangeMe={choose} theme={theme} onChangeTheme={setTheme} />}
      </main>

      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-bg via-bg/80 to-transparent pt-8 pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <div className="glass flex gap-1.5 rounded-full !bg-[#ecebe8]/85 p-1.5 dark:!bg-[#232427]/90">
          {TABS.map(([id, label, icon]) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`pop flex h-14 items-center justify-center gap-2 rounded-full ${
                  active ? 'bg-solid px-5 font-semibold text-on-solid' : 'w-14 bg-white/70 text-ink dark:bg-white/[0.07]'
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
      <h1 className="text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.035em]">Quem está usando este celular?</h1>
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
