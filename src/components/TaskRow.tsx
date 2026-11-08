import { useRef } from 'react'
import { actions } from '../data/store'
import { haptic, vtName, withTransition } from '../lib/motion'
import { relativeDay, type ISODate } from '../lib/dates'
import type { DayItem } from '../lib/schedule'
import { PEOPLE, type Person } from '../lib/types'
import { Icon } from './Icon'
import { Avatar } from './ui'

/** Um bloco por tarefa. A tarefa que é sua ganha a cor de destaque. */
export function TaskRow({ item, me, today }: { item: DayItem; me: Person; today: ISODate }) {
  const { occ, task } = item
  const done = !!occ.doneBy
  const mine = !done && occ.claimedBy === me
  const late = !done && occ.plannedDate < today
  const moved = occ.plannedDate !== occ.dueDate
  // Só anima a tarefa que foi tocada, nunca a lista inteira ao abrir a tela.
  const touched = useRef(false)
  const anim = (cls: string) => (touched.current ? cls : '')

  let when: string | null = null
  if (late) when = `Era pra ${relativeDay(occ.dueDate, today)}`
  else if (moved && !done) when = `Veio de ${relativeDay(occ.dueDate, today)}`

  return (
    <li
      style={{ viewTransitionName: vtName('t', occ.key) }}
      className={`task flex items-center gap-3 rounded-[26px] py-3 pr-3 pl-2 ${
        mine ? 'bg-mine text-on-mine shadow-[0_8px_24px_rgb(120_150_20/0.15)] dark:border dark:border-accent/40 dark:shadow-none' : 'glass'
      } ${done ? 'opacity-70' : ''}`}
    >
      <button
        onClick={() => {
          touched.current = true
          if (!done) haptic(12)
          withTransition(() => actions.toggleDone(occ.key, me, today))
        }}
        aria-pressed={done}
        aria-label={done ? `Desmarcar: ${task.title}` : `Marcar como feita: ${task.title}`}
        className="pop relative grid size-12 shrink-0 place-items-center rounded-full"
      >
        {done && touched.current && <span key="ring" className="done-ring pointer-events-none absolute inset-1 rounded-full bg-solid" aria-hidden />}
        <span
          key={done ? 'done' : 'todo'}
          className={`grid size-10 place-items-center rounded-full ${done ? anim('done-pop ') : ''}${
            done
              ? 'bg-solid text-on-solid'
              : mine
                ? 'bg-white/80 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/20'
                : 'bg-white/80 ring-1 ring-black/10 dark:bg-white/[0.06] dark:ring-white/15'
          }`}
        >
          {done && (
            <span className={anim('check-draw')}>
              <Icon name="check" size={18} />
            </span>
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-[16px] leading-snug ${done ? 'text-muted line-through decoration-1' : 'font-semibold'}`}>{task.title}</p>
        <p className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] ${mine ? 'opacity-70' : 'text-muted'}`}>
          {task.priority === 'alta' && !done && <span className={mine ? '' : 'text-ink'}>Importante</span>}
          <span>{task.room}</span>
          {when && <span className={late ? (mine ? 'font-semibold' : 'font-semibold text-late') : ''}>{when}</span>}
        </p>
      </div>

      {done ? (
        <span className={`${anim('chip-in')} flex items-center gap-1.5 text-[13px] text-muted`}>
          <Avatar person={occ.doneBy!} size={26} />
          <span className="sr-only">Feita por {PEOPLE[occ.doneBy!].name}</span>
        </span>
      ) : (
        <ClaimButton
          claimedBy={occ.claimedBy}
          me={me}
          title={task.title}
          animate={touched.current}
          onClick={() => {
            touched.current = true
            haptic()
            withTransition(() => actions.claim(occ.key, me))
          }}
        />
      )}
    </li>
  )
}

function ClaimButton({
  claimedBy,
  me,
  onClick,
  title,
  animate,
}: {
  claimedBy?: Person
  me: Person
  onClick: () => void
  title: string
  animate: boolean
}) {
  const base = `pop flex h-10 shrink-0 items-center justify-center rounded-full text-[14px] ${animate ? 'chip-in' : ''}`
  if (!claimedBy) {
    return (
      <button key="free" onClick={onClick} aria-label={`Assumir: ${title}`} className={`${base} bg-white/80 px-4 font-medium text-ink ring-1 ring-black/5 dark:bg-white/[0.08] dark:ring-white/10`}>
        Assumir
      </button>
    )
  }
  if (claimedBy === me) {
    return (
      <button key="mine" onClick={onClick} aria-label={`Você assumiu. Toque para soltar: ${title}`} className={`${base} bg-solid px-4 font-semibold text-on-solid`}>
        Comigo
      </button>
    )
  }
  return (
    <button
      key="other"
      onClick={onClick}
      aria-label={`${PEOPLE[claimedBy].name} assumiu. Toque para pegar pra você: ${title}`}
      className={`${base} gap-1.5 bg-white/80 pr-3.5 pl-1 font-medium ring-1 ring-black/5 dark:bg-white/[0.08] dark:ring-white/10`}
    >
      <Avatar person={claimedBy} size={30} />
      {PEOPLE[claimedBy].name}
    </button>
  )
}
