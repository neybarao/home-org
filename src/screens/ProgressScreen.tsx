import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Rings } from '../components/Rings'
import { Avatar, Card, SectionTitle } from '../components/ui'
import { useHome } from '../data/store'
import { addDays, endOfWeek, fromISO, startOfWeek, WEEKDAYS, weekday, type ISODate } from '../lib/dates'
import { haptic, withTransition } from '../lib/motion'
import { dayProgress, hasWeekBefore, ratio, weekDays, weekProgress, type Ring } from '../lib/progress'
import type { DayItem } from '../lib/schedule'
import { PEOPLE } from '../lib/types'

const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const dm = (iso: ISODate) => {
  const d = fromISO(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Progresso no estilo dos anéis do Fitness: dois anéis diários (Pra hoje e
 * Fechamento), a semana em mini anéis e, abaixo, o que foi feito no dia escolhido.
 * Sem placar entre os dois: o histórico mostra quem fez cada coisa, não totais por pessoa.
 */
export function ProgressScreen({ today }: { today: ISODate }) {
  const data = useHome()
  const [selected, setSelected] = useState<ISODate>(today)
  const days = useMemo(() => weekDays(selected), [selected])
  const week = useMemo(() => days.map((d) => dayProgress(data, d, today)), [data, days, today])
  const day = week.find((p) => p.date === selected)!
  const weekRing = useMemo(() => weekProgress(data, selected), [data, selected])

  const isThisWeek = startOfWeek(selected) === startOfWeek(today)
  const canGoBack = hasWeekBefore(data, selected)
  const goWeek = (dir: -1 | 1) => {
    haptic()
    const target = addDays(selected, dir * 7)
    // Na semana atual, cai em hoje; nas outras, no mesmo dia da semana, sem passar de hoje.
    withTransition(() => setSelected(startOfWeek(target) === startOfWeek(today) || target > today ? today : target))
  }

  const dayName = selected === today ? 'hoje' : WEEKDAYS[weekday(selected)].toLowerCase()

  return (
    <div>
      <h1 className="text-[2.75rem] leading-none font-extrabold tracking-[-0.045em] text-ink/85">Progresso</h1>

      <section className="ring-card mt-6 rounded-[32px] p-4 pb-5" aria-label="Anéis da semana">
        <div className="flex items-center justify-between">
          <button
            onClick={() => goWeek(-1)}
            disabled={!canGoBack}
            aria-label="Semana anterior"
            className="pop grid size-10 place-items-center rounded-full disabled:opacity-0"
          >
            <Icon name="back" size={18} />
          </button>
          <p className="text-[15px] font-semibold">{isThisWeek ? 'Esta semana' : `${dm(startOfWeek(selected))} a ${dm(endOfWeek(selected))}`}</p>
          <button
            onClick={() => goWeek(1)}
            disabled={isThisWeek}
            aria-label="Próxima semana"
            className="pop grid size-10 place-items-center rounded-full disabled:opacity-0"
          >
            <Icon name="chevron" size={18} />
          </button>
        </div>

        <ol className="mt-2 grid grid-cols-7 gap-1">
          {week.map((p) => {
            const isSel = p.date === selected
            return (
              <li key={p.date}>
                <button
                  onClick={() => {
                    if (p.empty || isSel) return
                    haptic()
                    withTransition(() => setSelected(p.date))
                  }}
                  aria-pressed={isSel}
                  aria-label={`${WEEKDAYS[weekday(p.date)]}, ${dm(p.date)}${p.empty ? ', sem dados' : ''}`}
                  className="pop flex w-full flex-col items-center gap-1.5 py-1"
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full text-[12px] font-semibold ${
                      isSel ? 'bg-[var(--ring-1)] text-[var(--on-ring-1)]' : p.date === today ? 'text-[var(--ring-1)]' : 'opacity-60'
                    }`}
                  >
                    {LETTERS[weekday(p.date)]}
                  </span>
                  <Rings values={[ratio(p.today), ratio(p.closing)]} size={38} stroke={5} dim={p.empty} animate={false} />
                </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-5 flex justify-center">
          <Rings
            key={selected}
            values={[ratio(day.today), ratio(day.closing)]}
            size={210}
            stroke={26}
            dim={day.empty}
            label={`Pra hoje: ${day.today.done} de ${day.today.total}. Fechamento: ${day.closing.done} de ${day.closing.total}.`}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Pra hoje" unit="tarefas" ring={day.today} color="var(--ring-1)" />
          <Stat label="Fechamento" unit="itens" ring={day.closing} color="var(--ring-2)" />
        </div>

        <p className="tabular mt-4 border-t border-[var(--ring-line)] pt-3 text-[13px] opacity-70">
          Na semana: {weekRing.done} de {weekRing.total} tarefas semanais e mensais feitas
        </p>
      </section>

      <DayDetail dayName={dayName} done={day.done} missed={day.missed} empty={day.empty} />
    </div>
  )
}

function Stat({ label, unit, ring, color }: { label: string; unit: string; ring: Ring; color: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] opacity-70">
        <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
        {label}
      </p>
      <p className="tabular mt-1 text-[30px] leading-none font-bold tracking-tight" style={{ color }}>
        {ring.done}
        <span className="opacity-60">/{ring.total}</span>
      </p>
      <p className="mt-1 text-[12px] opacity-60">{unit}</p>
    </div>
  )
}

function DayDetail({ dayName, done, missed, empty }: { dayName: string; done: DayItem[]; missed: DayItem[]; empty: boolean }) {
  if (empty) return null
  return (
    <>
      <section className="mt-8">
        <SectionTitle count={done.length}>{dayName === 'hoje' ? 'Feito hoje' : `Feito na ${dayName}`.replace('na sábado', 'no sábado').replace('na domingo', 'no domingo')}</SectionTitle>
        {done.length === 0 ? (
          <p className="px-1 text-[15px] text-muted">Nada marcado como feito.</p>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {done.map(({ occ, task }) => (
                <li key={occ.key} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug font-semibold">{task.title}</span>
                    <span className="block text-[13px] text-muted">{task.room}</span>
                  </span>
                  <Avatar person={occ.doneBy!} size={28} />
                  <span className="sr-only">Feita por {PEOPLE[occ.doneBy!].name}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {missed.length > 0 && (
        <section className="mt-6">
          <SectionTitle count={missed.length}>{dayName === 'hoje' ? 'Ainda falta' : 'Ficou pra depois'}</SectionTitle>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {missed.map(({ occ, task }) => (
                <li key={occ.key} className="px-5 py-3 text-muted">
                  <span className="block leading-snug">{task.title}</span>
                  <span className="block text-[13px]">{occ.doneOn ? 'Feita em outro dia' : task.room}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </>
  )
}
