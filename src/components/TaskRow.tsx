import { actions } from '../data/store'
import { relativeDay, type ISODate } from '../lib/dates'
import type { DayItem } from '../lib/schedule'
import { PEOPLE, type Person } from '../lib/types'
import { Icon } from './Icon'

export function TaskRow({ item, me, today }: { item: DayItem; me: Person; today: ISODate }) {
  const { occ, task } = item
  const done = !!occ.doneBy
  const owner = occ.doneBy ?? occ.claimedBy
  const late = !done && occ.plannedDate < today
  const moved = occ.plannedDate !== occ.dueDate

  let when: string | null = null
  if (late) when = `Era pra ${relativeDay(occ.dueDate, today)}`
  else if (moved) when = `Veio de ${relativeDay(occ.dueDate, today)}`

  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        onClick={() => actions.toggleDone(occ.key, me, today)}
        aria-pressed={done}
        aria-label={done ? `Desmarcar: ${task.title}` : `Marcar como feita: ${task.title}`}
        className="pop grid size-11 shrink-0 place-items-center rounded-full"
      >
        <span
          className="grid size-8 place-items-center rounded-full border-2 text-on-person"
          style={
            done
              ? { background: `var(--${occ.doneBy})`, borderColor: `var(--${occ.doneBy})` }
              : { borderColor: owner ? `var(--${owner})` : 'var(--line)' }
          }
        >
          {done && <Icon name="check" size={18} />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className={`leading-snug ${done ? 'text-muted line-through decoration-1' : 'font-bold'}`}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
          {task.priority === 'alta' && !done && (
            <span className="flex items-center gap-1 text-ink">
              <span className="size-1.5 rounded-full bg-ink" aria-hidden />
              Importante
            </span>
          )}
          <span>{task.room}</span>
          {when && <span className={late ? 'text-late font-bold' : ''}>{when}</span>}
        </p>
      </div>

      {done ? (
        <span className="w-[5.5rem] text-right text-[13px] text-muted">Feita por {PEOPLE[occ.doneBy!].name}</span>
      ) : (
        <ClaimButton claimedBy={occ.claimedBy} me={me} onClick={() => actions.claim(occ.key, me)} title={task.title} />
      )}
    </li>
  )
}

function ClaimButton({ claimedBy, me, onClick, title }: { claimedBy?: Person; me: Person; onClick: () => void; title: string }) {
  if (!claimedBy) {
    return (
      <button
        onClick={onClick}
        aria-label={`Assumir: ${title}`}
        className="pop h-11 w-[5.5rem] shrink-0 rounded-full border border-dashed border-line text-[14px] text-muted"
      >
        Assumir
      </button>
    )
  }
  const mine = claimedBy === me
  return (
    <button
      onClick={onClick}
      aria-label={mine ? `Você assumiu. Toque para soltar: ${title}` : `${PEOPLE[claimedBy].name} assumiu. Toque para pegar pra você: ${title}`}
      className="pop flex h-11 w-[5.5rem] shrink-0 items-center justify-center gap-1.5 rounded-full text-[14px] font-bold text-on-person"
      style={{ background: `var(--${claimedBy})` }}
    >
      {mine ? 'Comigo' : PEOPLE[claimedBy].name}
    </button>
  )
}
