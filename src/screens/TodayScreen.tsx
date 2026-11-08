import { useMemo, useState } from 'react'
import { TaskRow } from '../components/TaskRow'
import { actions, useHome } from '../data/store'
import { WEEKDAYS, longDate, relativeDay, weekday, type ISODate } from '../lib/dates'
import { dayView, suggestRedistribution, type DayItem } from '../lib/schedule'
import { PEOPLE, type Person } from '../lib/types'

const SOLO_KEY = 'home-org:solo'

function useDailyFlag(key: string, today: ISODate): [boolean, (v: boolean) => void] {
  const read = () => {
    try {
      return localStorage.getItem(key) === today
    } catch {
      return false
    }
  }
  const [value, setValue] = useState(read)
  const [forDay, setForDay] = useState(today)
  if (forDay !== today) {
    setForDay(today)
    setValue(read())
  }
  const set = (v: boolean) => {
    setValue(v)
    try {
      if (v) localStorage.setItem(key, today)
      else localStorage.removeItem(key)
    } catch {
      /* ignora */
    }
  }
  return [value, set]
}

export function TodayScreen({ me, today }: { me: Person; today: ISODate }) {
  const data = useHome()
  const [solo, setSolo] = useDailyFlag(SOLO_KEY, today)
  const [dismissed, setDismissed] = useDailyFlag('home-org:dismissed', today)
  const [justMoved, setJustMoved] = useState<number | null>(null)

  const view = useMemo(() => dayView(data, today), [data, today])
  const suggestion = useMemo(() => suggestRedistribution(data, today, solo), [data, today, solo])

  const regularToday = view.today.filter((i) => !i.task.special)
  const special = [...view.overdue, ...view.today].filter((i) => i.task.special)
  const overdue = view.overdue.filter((i) => !i.task.special)
  const pendingToday = regularToday.filter((i) => !i.occ.doneBy)
  const doneToday = regularToday.filter((i) => i.occ.doneBy)
  const nothingLeft = pendingToday.length === 0 && overdue.length === 0 && special.every((i) => i.occ.doneBy)

  return (
    <div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[3.25rem] font-extrabold leading-[0.95] tracking-tight [font-stretch:80%]">
            {WEEKDAYS[weekday(today)]}
          </h1>
          <p className="mt-1.5 text-muted">{longDate(today)}</p>
        </div>
        <span
          className="mt-1 grid size-10 place-items-center rounded-full font-display text-lg font-bold text-on-person"
          style={{ background: `var(--${me})` }}
          aria-label={`Usando como ${PEOPLE[me].name}`}
        >
          {PEOPLE[me].initial}
        </span>
      </header>

      {data.settings.showSummary && <DayRibbon items={[...regularToday, ...overdue]} />}

      <label className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3">
        <span>
          <span className="block font-bold">Só um de nós hoje</span>
          <span className="block text-[14px] text-muted">O app sugere o que é prioridade e reorganiza o resto.</span>
        </span>
        <Switch checked={solo} onChange={setSolo} />
      </label>

      {justMoved !== null && (
        <p role="status" className="mt-4 rounded-2xl bg-surface px-4 py-3 text-[15px]">
          {justMoved === 1 ? '1 tarefa foi reorganizada.' : `${justMoved} tarefas foram reorganizadas.`}{' '}
          <button className="font-bold underline" onClick={() => setJustMoved(null)}>
            Ok
          </button>
        </p>
      )}

      {suggestion && (!dismissed || solo) && (
        <section className="mt-4 rounded-2xl border-2 border-late/40 bg-late-soft p-4" aria-labelledby="sug-title">
          <h2 id="sug-title" className="font-display text-xl font-bold [font-stretch:90%]">
            Tem mais tarefa do que o combinado
          </h2>
          <p className="mt-1 text-[15px] leading-snug">
            São {suggestion.pending} tarefas para {suggestion.capacity} {solo ? 'de uma pessoa' : 'dos dois'}. A sugestão é fazer as mais
            importantes hoje e passar estas pra frente:
          </p>
          <ul className="mt-3 space-y-1.5 text-[15px]">
            {suggestion.moves.map((m) => (
              <li key={m.key} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{m.item.task.title}</span>
                <span className="shrink-0 font-bold">{relativeDay(m.to, today)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              className="pop h-11 flex-1 rounded-full bg-ink font-bold text-bg"
              onClick={() => {
                actions.applyMoves(suggestion.moves)
                setJustMoved(suggestion.moves.length)
              }}
            >
              Reorganizar assim
            </button>
            {!solo && (
              <button className="pop h-11 rounded-full px-4 font-bold" onClick={() => setDismissed(true)}>
                Agora não
              </button>
            )}
          </div>
        </section>
      )}

      {overdue.length > 0 && (
        <Section title="Ficou pra trás" count={overdue.length} tone="late">
          {overdue.map((i) => (
            <TaskRow key={i.occ.key} item={i} me={me} today={today} />
          ))}
        </Section>
      )}

      <Section title="Pra hoje" count={pendingToday.length}>
        {pendingToday.map((i) => (
          <TaskRow key={i.occ.key} item={i} me={me} today={today} />
        ))}
        {nothingLeft && <li className="py-4 text-muted">Tudo feito por hoje. Aproveitem o resto do dia.</li>}
        {doneToday.map((i) => (
          <TaskRow key={i.occ.key} item={i} me={me} today={today} />
        ))}
      </Section>

      {special.length > 0 && (
        <Section title="Tarefa especial" hint="Leva mais tempo, fica fora do limite do dia.">
          {special.map((i) => (
            <TaskRow key={i.occ.key} item={i} me={me} today={today} />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  hint,
  tone,
  children,
}: {
  title: string
  count?: number
  hint?: string
  tone?: 'late'
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className={`flex items-baseline gap-2 font-display text-2xl font-bold [font-stretch:90%] ${tone === 'late' ? 'text-late' : ''}`}>
        {title}
        {count !== undefined && count > 0 && <span className="tabular font-sans text-base font-normal text-muted">{count}</span>}
      </h2>
      {hint && <p className="text-[14px] text-muted">{hint}</p>}
      <ul className="mt-2 divide-y divide-line">{children}</ul>
    </section>
  )
}

/** Uma marca por tarefa do dia, preenchida com a cor de quem fez. */
function DayRibbon({ items }: { items: DayItem[] }) {
  const done = items.filter((i) => i.occ.doneBy)
  const byPerson = (p: Person) => done.filter((i) => i.occ.doneBy === p).length
  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-1" aria-hidden>
        {[...done, ...items.filter((i) => !i.occ.doneBy)].map((i) => (
          <span
            key={i.occ.key}
            className="h-2.5 w-5 rounded-full"
            style={{ background: i.occ.doneBy ? `var(--${i.occ.doneBy})` : 'var(--line)' }}
          />
        ))}
      </div>
      <p className="tabular mt-2 text-[14px] text-muted">
        {done.length} de {items.length} feitas. Ney fez {byPerson('ney')}, Cleide fez {byPerson('cleide')}.
      </p>
    </div>
  )
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <span className="h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-forest peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink" />
      <span className="pointer-events-none absolute top-1 left-1 size-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-5" />
    </span>
  )
}
