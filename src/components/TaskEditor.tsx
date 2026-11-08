import { useEffect, useRef, useState } from 'react'
import { actions } from '../data/store'
import { WEEKDAYS_SHORT } from '../lib/dates'
import type { Frequency, TaskTemplate } from '../lib/types'
import { Icon } from './Icon'
import { Segmented, Switch } from './ui'

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

  const chooseKind = (k: Kind) => {
    setKind(k)
    if (k !== 'weekly' && weekdays.length > 1) setWeekdays([weekdays[0]])
  }

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

  const field = 'glass mt-2 h-14 w-full rounded-[20px] px-4 text-[16px] text-ink placeholder:text-muted'
  const label = 'px-1 text-[13px] font-medium text-muted'

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="editor-title"
      className="sheet-in m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[32px] bg-[#ebeae7] p-0 text-ink backdrop:bg-black/35 backdrop:backdrop-blur-sm sm:mx-auto sm:max-w-lg dark:bg-[#1e1f22]"
    >
      <div className="px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <div className="flex items-center justify-between">
          <h2 id="editor-title" className="text-[26px] font-bold tracking-[-0.03em]">
            {task ? 'Editar tarefa' : 'Nova tarefa'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="pop glass grid size-12 place-items-center rounded-full">
            <Icon name="close" size={20} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className={label}>O que fazer</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Ex.: Limpar o fogão" />
        </label>

        <label className="mt-4 block">
          <span className={label}>Parte da casa</span>
          <input value={room} onChange={(e) => setRoom(e.target.value)} list="rooms" className={field} placeholder="Ex.: Sala e cozinha" />
          <datalist id="rooms">
            {rooms.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <div className="mt-5">
          <p className={label}>Com que frequência</p>
          <div className="mt-2">
            <Segmented
              label="Frequência"
              columns={2}
              value={kind}
              onChange={chooseKind}
              options={[
                ['daily', 'Todo dia'],
                ['weekly', 'Toda semana'],
                ['biweekly', 'A cada 15 dias'],
                ['monthly', 'Uma vez por mês'],
              ]}
            />
          </div>
        </div>

        {kind !== 'daily' && (
          <div className="mt-5">
            <p className={label}>{kind === 'weekly' ? 'Em quais dias' : 'Em que dia da semana'}</p>
            <div className="mt-2">
              <Segmented label="Dias da semana" value={weekdays} onChange={toggleDay} options={ORDER.map((d) => [d, WEEKDAYS_SHORT[d]] as const)} />
            </div>
          </div>
        )}

        {kind === 'monthly' && (
          <div className="mt-5">
            <p className={label}>Qual semana do mês</p>
            <div className="mt-2">
              <Segmented label="Semana do mês" value={week} onChange={setWeek} options={[1, 2, 3, 4].map((w) => [w, `${w}ª`] as const)} />
            </div>
          </div>
        )}

        <div className="glass mt-5 divide-y divide-line rounded-[24px]">
          <Toggle label="Importante" hint="Vai primeiro quando o dia estiver cheio." checked={important} onChange={setImportant} />
          <Toggle label="Tarefa especial" hint="Grande demais para o dia. Fica fora do limite." checked={special} onChange={setSpecial} />
          {task && <Toggle label="Ativa" hint="Desligue para pausar sem apagar." checked={active} onChange={setActive} />}
        </div>

        {error && (
          <p role="alert" className="mt-4 px-1 font-semibold text-late">
            {error}
          </p>
        )}

        <button onClick={save} className="pop mt-6 h-14 w-full rounded-full bg-solid text-[16px] font-semibold text-on-solid">
          {task ? 'Salvar alterações' : 'Criar tarefa'}
        </button>
        {task && (
          <button onClick={remove} className="mt-2 h-12 w-full rounded-full font-semibold text-muted">
            Apagar tarefa
          </button>
        )}
      </div>
    </dialog>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-[13px] text-muted">{hint}</span>
      </span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  )
}
