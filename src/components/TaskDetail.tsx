import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { actions, useHome } from '../data/store'
import { relativeDay, type ISODate } from '../lib/dates'
import { haptic, withTransition } from '../lib/motion'
import { describeFrequency, isClosing, isExtra, occurrenceKey } from '../lib/schedule'
import { PEOPLE, type Person } from '../lib/types'
import { Icon } from './Icon'
import { TaskEditor } from './TaskEditor'
import { Avatar } from './ui'

/** Qual ocorrência abrir: a tarefa e o dia em que ela vence. */
export interface DetailTarget {
  templateId: string
  dueDate: ISODate
}

/** Qualquer TaskRow abre os detalhes por aqui, sem precisar passar props pela tela toda. */
export const TaskDetailContext = createContext<(t: DetailTarget) => void>(() => {})
export const useOpenDetail = () => useContext(TaskDetailContext)

/** Hospeda a folha de detalhes (e o editor) para os filhos. */
export function TaskDetailHost({ me, today, children }: { me: Person; today: ISODate; children: React.ReactNode }) {
  const [target, setTarget] = useState<DetailTarget | null>(null)
  return (
    <TaskDetailContext.Provider value={setTarget}>
      {children}
      {target && <TaskDetail target={target} me={me} today={today} onClose={() => setTarget(null)} />}
    </TaskDetailContext.Provider>
  )
}

function TaskDetail({ target, me, today, onClose }: { target: DetailTarget; me: Person; today: ISODate; onClose: () => void }) {
  const data = useHome()
  const dialog = useRef<HTMLDialogElement>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) dialog.current?.showModal()
  }, [editing])

  const task = data.templates.find((t) => t.id === target.templateId)
  // Apagada (aqui ou no outro celular): fecha sozinha.
  useEffect(() => {
    if (!task) onClose()
  }, [task, onClose])
  if (!task) return null

  if (editing) {
    const rooms = [...new Set(data.templates.filter((t) => !isExtra(t)).map((t) => t.room))]
    return <TaskEditor task={task} rooms={rooms} onClose={() => setEditing(false)} />
  }

  const key = occurrenceKey(task.id, target.dueDate)
  const state = data.occurrences[key] ?? {}
  // Mesma regra de buildOccurrences: sem ninguém ter mexido, vale o dono.
  const claimedBy: Person | undefined = state.claimedBy === undefined ? task.owner : (state.claimedBy ?? undefined)
  const planned = state.plannedDate ?? target.dueDate
  const extra = isExtra(task)
  const done = !!state.doneBy
  const skipped = !done && !!state.skippedBy
  const late = !done && !skipped && planned < today
  // Pular vale para a rotina (Pra hoje e Ficou pra trás); extra se apaga, fechamento é todo dia.
  const canSkip = !extra && !isClosing(task)

  const when = done
    ? `Feita ${state.doneOn ? relativeDay(state.doneOn, today) : ''}`.trim()
    : skipped
      ? `Pulada ${state.skippedOn ? relativeDay(state.skippedOn, today) : ''}`.trim()
      : late
      ? `Era pra ${relativeDay(target.dueDate, today)}`
      : planned !== target.dueDate
        ? `Veio de ${relativeDay(target.dueDate, today)}`
        : `Pra ${relativeDay(planned, today)}`

  const tags = [
    task.priority === 'alta' && 'Importante',
    task.special && 'Tarefa especial',
    isClosing(task) && 'Fechamento do dia',
  ].filter(Boolean) as string[]

  const close = () => dialog.current?.close()

  const remove = () => {
    const msg = extra ? `Apagar a tarefa extra "${task.title}"?` : `Apagar "${task.title}" da rotina? Ela some de todos os dias e o histórico dela também.`
    if (!window.confirm(msg)) return
    withTransition(() => {
      if (extra) actions.removeExtra(task.id)
      else actions.deleteTemplate(task.id)
    })
  }

  const claimLabel = !claimedBy ? 'Assumir' : claimedBy === me ? 'Soltar' : `Pegar de ${PEOPLE[claimedBy].name}`
  const btn = 'pop h-12 rounded-full font-semibold'
  const soft = 'bg-white/80 ring-1 ring-black/5 dark:bg-white/[0.08] dark:ring-white/10'

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="detail-title"
      className="sheet-in m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[32px] bg-[#f7f4ee] p-0 text-ink backdrop:bg-black/35 backdrop:backdrop-blur-sm sm:mx-auto sm:max-w-lg dark:bg-[#2c3b4d]"
    >
      <div className="px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pt-1">
            <p className="text-[13px] font-medium text-muted">{extra ? 'Tarefa extra' : task.room}</p>
            <h2 id="detail-title" className={`mt-1 text-[26px] leading-tight font-normal tracking-[-0.02em] ${done ? 'text-muted line-through decoration-1' : ''}`}>
              {task.title}
            </h2>
          </div>
          <button onClick={close} aria-label="Fechar" className="pop glass-btn grid size-12 shrink-0 place-items-center rounded-full">
            <Icon name="close" size={20} />
          </button>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-black/[0.06] px-3 py-1 text-[13px] font-medium dark:bg-white/10">
                {t}
              </span>
            ))}
          </div>
        )}

        <section className="glass mt-5 rounded-[24px] p-4">
          <p className="text-[13px] font-medium text-muted">Nota</p>
          {task.note ? (
            <p className="mt-1 text-[16px] leading-relaxed whitespace-pre-line">{task.note}</p>
          ) : (
            <button onClick={() => setEditing(true)} className="mt-1 text-[15px] font-semibold underline underline-offset-4">
              Adicionar nota
            </button>
          )}
        </section>

        <dl className="glass mt-2 divide-y divide-line rounded-[24px] text-[15px]">
          <Row label="Quando" value={<span className={late ? 'font-semibold text-late' : ''}>{when}</span>} />
          <Row label="Frequência" value={extra ? 'Uma vez só' : describeFrequency(task.frequency)} />
          <Row label="Quem cuida" value={task.owner ? PEOPLE[task.owner].name : 'Quem pegar'} />
          {skipped && (
            <Row
              label="Pulada por"
              value={
                <span className="flex items-center gap-2">
                  <Avatar person={state.skippedBy!} size={24} />
                  {PEOPLE[state.skippedBy!].name}
                </span>
              }
            />
          )}
          {!done && !skipped && (
            <Row
              label="Agora com"
              value={
                claimedBy ? (
                  <span className="flex items-center gap-2">
                    <Avatar person={claimedBy} size={24} />
                    {PEOPLE[claimedBy].name}
                  </span>
                ) : (
                  'Ninguém ainda'
                )
              }
            />
          )}
          {done && (
            <Row
              label="Feita por"
              value={
                <span className="flex items-center gap-2">
                  <Avatar person={state.doneBy!} size={24} />
                  {PEOPLE[state.doneBy!].name}
                </span>
              }
            />
          )}
        </dl>

        {skipped ? (
          <button
            onClick={() => withTransition(() => actions.toggleSkip(key, me, today))}
            className={`${btn} mt-5 w-full bg-solid text-[16px] text-on-solid`}
          >
            Desfazer pulo
          </button>
        ) : (
        <button
          onClick={() => {
            if (!done) haptic(12)
            withTransition(() => actions.toggleDone(key, me, today, claimedBy))
          }}
          className={`${btn} mt-5 w-full bg-solid text-[16px] text-on-solid`}
        >
          {done ? 'Desmarcar' : 'Marcar como feita'}
        </button>
        )}
        {!done && !skipped && canSkip && (
          <button
            onClick={() => {
              haptic()
              withTransition(() => actions.toggleSkip(key, me, today))
            }}
            className={`${btn} mt-2 w-full ${soft}`}
          >
            {late ? 'Pular (não precisa mais)' : 'Pular hoje'}
          </button>
        )}
        {!done && !skipped && (
          <button
            onClick={() => {
              haptic()
              withTransition(() => actions.claim(key, me, claimedBy))
            }}
            className={`${btn} mt-2 w-full ${soft}`}
          >
            {claimLabel}
          </button>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => setEditing(true)} className={`${btn} ${soft}`}>
            Editar
          </button>
          <button onClick={remove} className={`${btn} ${soft} text-late`}>
            Apagar
          </button>
        </div>
      </div>
    </dialog>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
