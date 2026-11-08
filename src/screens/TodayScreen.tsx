import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { TaskRow } from '../components/TaskRow'
import { Avatar, Card, SectionTitle, Switch } from '../components/ui'
import { actions, useHome } from '../data/store'
import { WEEKDAYS, longDate, relativeDay, weekday, type ISODate } from '../lib/dates'
import { dayView, suggestRedistribution, type DayItem } from '../lib/schedule'
import { PEOPLE, type Person } from '../lib/types'

/** Um sim/não que vale só para o dia de hoje neste aparelho. */
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
  const [solo, setSolo] = useDailyFlag('home-org:solo', today)
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
      <header className="flex items-center justify-between">
        <span className="rounded-full p-1 ring-1 ring-white/70 dark:ring-white/10" aria-label={`Usando como ${PEOPLE[me].name}`}>
          <Avatar person={me} size={48} />
        </span>
        <span className="glass rounded-full px-4 py-2.5 text-[14px] font-medium">{longDate(today)}</span>
      </header>

      <h1 className="mt-6 text-[4.25rem] leading-[0.9] font-extrabold tracking-[-0.05em] text-ink/85">{WEEKDAYS[weekday(today)]}</h1>

      <label className="glass mt-6 flex items-center gap-3 rounded-full py-2 pr-2.5 pl-2">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/90 dark:bg-white/10">
          <Icon name="solo" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-muted">{solo ? 'Prioridades primeiro, o resto vai pra frente' : 'Hoje os dois fazem'}</span>
          <span className="block font-semibold">Só um de nós hoje</span>
        </span>
        <Switch checked={solo} onChange={setSolo} />
      </label>

      {data.settings.showSummary && <Summary items={[...regularToday, ...overdue]} />}

      {justMoved !== null && (
        <p role="status" className="glass mt-3 flex items-center justify-between rounded-[22px] px-4 py-3 text-[15px]">
          {justMoved === 1 ? '1 tarefa foi reorganizada.' : `${justMoved} tarefas foram reorganizadas.`}
          <button className="font-semibold underline underline-offset-4" onClick={() => setJustMoved(null)}>
            Ok
          </button>
        </p>
      )}

      {suggestion && (!dismissed || solo) && (
        <section aria-labelledby="sug-title" className="mt-3 rounded-[28px] bg-mine p-5 text-on-mine dark:border dark:border-accent/40">
          <span className="grid size-11 place-items-center rounded-full bg-black/10 dark:bg-accent dark:text-on-accent">
            <Icon name="swap" />
          </span>
          <h2 id="sug-title" className="mt-4 text-[22px] leading-tight font-bold tracking-[-0.02em]">
            Tem mais tarefa do que o combinado
          </h2>
          <p className="mt-1.5 text-[15px] leading-snug opacity-75">
            São {suggestion.pending} tarefas para {suggestion.capacity} {solo ? 'de uma pessoa' : 'dos dois'}. A sugestão é fazer as mais importantes hoje e
            passar estas pra frente:
          </p>
          <ul className="mt-3 divide-y divide-black/10 text-[15px] dark:divide-white/10">
            {suggestion.moves.map((m) => (
              <li key={m.key} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{m.item.task.title}</span>
                <span className="shrink-0 font-semibold">{relativeDay(m.to, today)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              className="pop h-12 flex-1 rounded-full bg-solid font-semibold text-on-solid"
              onClick={() => {
                actions.applyMoves(suggestion.moves)
                setJustMoved(suggestion.moves.length)
              }}
            >
              Reorganizar assim
            </button>
            {!solo && (
              <button className="pop h-12 rounded-full px-4 font-semibold" onClick={() => setDismissed(true)}>
                Agora não
              </button>
            )}
          </div>
        </section>
      )}

      {overdue.length > 0 && (
        <TaskSection title="Ficou pra trás" count={overdue.length} tone="late">
          {overdue.map((i) => (
            <TaskRow key={i.occ.key} item={i} me={me} today={today} />
          ))}
        </TaskSection>
      )}

      <TaskSection title="Pra hoje" count={pendingToday.length}>
        {pendingToday.map((i) => (
          <TaskRow key={i.occ.key} item={i} me={me} today={today} />
        ))}
        {nothingLeft && (
          <li className="glass rounded-[26px] px-5 py-5">
            <p className="font-semibold">Tudo feito por hoje.</p>
            <p className="text-muted">Aproveitem o resto do dia.</p>
          </li>
        )}
        {doneToday.map((i) => (
          <TaskRow key={i.occ.key} item={i} me={me} today={today} />
        ))}
      </TaskSection>

      {special.length > 0 && (
        <TaskSection title="Tarefa especial" hint="Leva mais tempo, fica fora do limite do dia.">
          {special.map((i) => (
            <TaskRow key={i.occ.key} item={i} me={me} today={today} />
          ))}
        </TaskSection>
      )}
    </div>
  )
}

function TaskSection({ title, count, hint, tone, children }: { title: string; count?: number; hint?: string; tone?: 'late'; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <SectionTitle count={count} tone={tone}>
        {title}
      </SectionTitle>
      {hint && <p className="-mt-1.5 mb-2 px-1 text-[13px] text-muted">{hint}</p>}
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}

/** Quanto do dia já foi feito, e por quem. */
function Summary({ items }: { items: DayItem[] }) {
  const done = items.filter((i) => i.occ.doneBy)
  const count = (p: Person) => done.filter((i) => i.occ.doneBy === p).length
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {(['ney', 'cleide'] as Person[]).map((p) => (
        <Card key={p} className="p-4">
          <Avatar person={p} size={36} />
          <p className="tabular mt-6 text-[28px] leading-none font-bold">{count(p)}</p>
          <p className="mt-1 text-[13px] text-muted">feitas por {PEOPLE[p].name}</p>
        </Card>
      ))}
      <p className="tabular col-span-2 px-1 text-[13px] text-muted">
        {done.length} de {items.length} tarefas do dia feitas.
      </p>
    </div>
  )
}
