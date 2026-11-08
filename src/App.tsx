import { useEffect, useState } from 'react'
import { loadMe, saveMe } from './data/repo'
import { todayISO } from './lib/dates'
import type { Person } from './lib/types'
import { PEOPLE } from './lib/types'
import { TodayScreen } from './screens/TodayScreen'
import { HouseScreen } from './screens/HouseScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { Icon } from './components/Icon'

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

export default function App() {
  const [me, setMe] = useState<Person | null>(loadMe)
  const [tab, setTab] = useState<Tab>('hoje')
  const today = useToday()

  const choose = (p: Person) => {
    saveMe(p)
    setMe(p)
  }

  if (!me) return <WhoAreYou onChoose={choose} />

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-28">
        {tab === 'hoje' && <TodayScreen me={me} today={today} />}
        {tab === 'casa' && <HouseScreen />}
        {tab === 'ajustes' && <SettingsScreen me={me} onChangeMe={choose} />}
      </main>

      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {(
            [
              ['hoje', 'Hoje', 'today'],
              ['casa', 'Tarefas da casa', 'house'],
              ['ajustes', 'Ajustes', 'settings'],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[13px] ${tab === id ? 'text-ink font-bold' : 'text-muted'}`}
            >
              <Icon name={icon} filled={tab === id} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function WhoAreYou({ onChoose }: { onChoose: (p: Person) => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <h1 className="font-display text-4xl font-extrabold leading-tight [font-stretch:85%]">Quem está usando este celular?</h1>
      <p className="mt-3 text-muted">Assim o app sabe de quem é cada tarefa que você assumir. Dá pra trocar depois em Ajustes.</p>
      <div className="mt-8 grid gap-3">
        {(Object.keys(PEOPLE) as Person[]).map((p) => (
          <button
            key={p}
            onClick={() => onChoose(p)}
            className="pop flex items-center gap-4 rounded-2xl bg-surface p-4 text-left text-lg font-bold shadow-[0_1px_0_var(--line)]"
          >
            <span
              className="grid size-11 place-items-center rounded-full font-display text-xl text-on-person"
              style={{ background: `var(--${p})` }}
            >
              {PEOPLE[p].initial}
            </span>
            {PEOPLE[p].name}
          </button>
        ))}
      </div>
    </div>
  )
}
