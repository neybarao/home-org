import { useEffect, useRef, useState } from 'react'
import { actions } from '../data/store'
import { WEEKDAYS_SHORT } from '../lib/dates'
import type { Frequency, TaskTemplate } from '../lib/types'
import { Switch } from '../screens/TodayScreen'
import { Icon } from './Icon'

const ORDER = [1, 2, 3, 4, 5, 6, 0] // segunda a domingo

type Kind = Frequency['kind']

export function TaskEditor({ task, rooms, onClose }: { task: TaskTemplate | null; rooms: string[]; onClose: () => void }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [room, setRoom] = useState(task?.room ?? '')
  const [kind, setKind] = useState<Kind>(task?.frequency.kind ?? 'weekly')
  const [weekdays, setWeekdays] = useState<number[]>(
    task?.frequency.kind === 'weekly' ? task.frequency.weekdays : task && 'weekday' in task.frequency ? [task.frequency.weekday] : [1],
  )
  const [week, setWeek] = useState(task?.frequency.kind === 'monthly' ? task.frequency.week : 1)
  const [important, setImportant] = useState(task?.priority === 'alta')
  const [special, setSpecial] = useState(task?.special ?? false)
  const [active, setActive] = useState(task?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  const toggleDay = (d: number) => {
    if (kind === 'weekly') setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))
    else setWeekdays([d])
  }

  const save = () => {
    if (!title.trim()) return setError('Dê um nome para a tarefa.')
    if (!room.trim()) return setError('Diga em que parte da casa ela fica.')
    if (kind !== 'daily' && weekdays.length === 0) return setError('Escolha pelo menos um dia da semana.')
    let frequency: Frequency
    if (kind === 'daily') frequency = { kind }
    else if (kind === 'weekly') frequency = { kind, weekdays }
    else if (kind === 'biweekly') frequency = { kind, weekday: weekdays[0] }
    else frequency = { kind, week, weekday: weekdays[0] }
    actions.saveTemplate({
      id: task?.id ?? `t-${Date.now().toString(36)}`,
      title: title.trim(),
      room: room.trim(),
      frequency,
      priority: important ? 'alta' : 'normal',
      special,
      active,
    })
    onClose()
  }

  const remove = () => {
    if (task && window.confirm(`Apagar "${task.title}"? O histórico dela também some.`)) {
      actions.deleteTemplate(task.id)
      onClose()
    }
  }

  const field = 'mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-ink'

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="editor-title"
      className="sheet-in m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-ink backdrop:bg-black/40 sm:mx-auto sm:max-w-lg"
    >
      <div className="px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <div className="flex items-center justify-between">
          <h2 id="editor-title" className="font-display text-2xl font-bold [font-stretch:90%]">
            {task ? 'Editar tarefa' : 'Nova tarefa'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="grid size-11 place-items-center rounded-full">
            <Icon name="close" />
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-[14px] font-bold">O que fazer</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Ex.: Limpar o fogão" />
        </label>

        <label className="mt-4 block">
          <span className="text-[14px] font-bold">Parte da casa</span>
          <input value={room} onChange={(e) => setRoom(e.target.value)} list="rooms" className={field} placeholder="Ex.: Sala e cozinha" />
          <datalist id="rooms">
            {rooms.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <fieldset className="mt-5">
          <legend className="text-[14px] font-bold">Com que frequência</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ['daily', 'Todo dia'],
                ['weekly', 'Toda semana'],
                ['biweekly', 'A cada 15 dias'],
                ['monthly', 'Uma vez por mês'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => {
                  setKind(k)
                  if (k !== 'weekly' && weekdays.length > 1) setWeekdays([weekdays[0]])
                }}
                className={`pop h-11 rounded-xl border text-[15px] ${kind === k ? 'border-ink bg-ink font-bold text-bg' : 'border-line'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {kind !== 'daily' && (
          <fieldset className="mt-5">
            <legend className="text-[14px] font-bold">{kind === 'weekly' ? 'Em quais dias' : 'Em que dia da semana'}</legend>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={weekdays.includes(d)}
                  onClick={() => toggleDay(d)}
                  className={`pop h-11 rounded-xl border text-[14px] ${weekdays.includes(d) ? 'border-ink bg-ink font-bold text-bg' : 'border-line'}`}
                >
                  {WEEKDAYS_SHORT[d]}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {kind === 'monthly' && (
          <label className="mt-4 block">
            <span className="text-[14px] font-bold">Qual semana do mês</span>
            <select value={week} onChange={(e) => setWeek(Number(e.target.value))} className={field}>
              {[1, 2, 3, 4].map((w) => (
                <option key={w} value={w}>
                  {w}ª semana
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
          <Toggle label="Importante" hint="Vai primeiro quando o dia estiver cheio." checked={important} onChange={setImportant} />
          <Toggle label="Tarefa especial" hint="Grande demais para o dia. Fica fora do limite." checked={special} onChange={setSpecial} />
          {task && <Toggle label="Ativa" hint="Desligue para pausar sem apagar." checked={active} onChange={setActive} />}
        </div>

        {error && (
          <p role="alert" className="mt-4 font-bold text-late">
            {error}
          </p>
        )}

        <button onClick={save} className="pop mt-6 h-12 w-full rounded-full bg-ink font-bold text-bg">
          {task ? 'Salvar alterações' : 'Criar tarefa'}
        </button>
        {task && (
          <button onClick={remove} className="mt-2 h-12 w-full rounded-full font-bold text-cleide">
            Apagar tarefa
          </button>
        )}
      </div>
    </dialog>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3">
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-[14px] text-muted">{hint}</span>
      </span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  )
}
