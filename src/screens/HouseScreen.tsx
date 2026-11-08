import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { TaskEditor } from '../components/TaskEditor'
import { useHome } from '../data/store'
import { describeFrequency } from '../lib/schedule'
import type { TaskTemplate } from '../lib/types'

export function HouseScreen() {
  const data = useHome()
  const [editing, setEditing] = useState<TaskTemplate | 'new' | null>(null)

  const rooms = useMemo(() => {
    const groups = new Map<string, TaskTemplate[]>()
    for (const t of data.templates) groups.set(t.room, [...(groups.get(t.room) ?? []), t])
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [data.templates])

  return (
    <div>
      <header className="flex items-end justify-between gap-4">
        <h1 className="font-display text-[2.5rem] font-extrabold leading-none tracking-tight [font-stretch:80%]">Tarefas da casa</h1>
        <button
          onClick={() => setEditing('new')}
          className="pop flex h-11 items-center gap-1.5 rounded-full bg-ink pl-3 pr-4 font-bold text-bg"
        >
          <Icon name="plus" size={20} />
          Nova
        </button>
      </header>
      <p className="mt-2 text-[15px] text-muted">
        Começou com uma sugestão de rotina. Toquem numa tarefa para mudar o dia, a frequência ou a prioridade.
      </p>

      {rooms.map(([room, tasks]) => (
        <section key={room} className="mt-7">
          <h2 className="font-display text-xl font-bold [font-stretch:90%]">{room}</h2>
          <ul className="mt-1 divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id}>
                <button onClick={() => setEditing(t)} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="min-w-0 flex-1">
                    <span className={`block leading-snug ${t.active ? 'font-bold' : 'text-muted line-through'}`}>{t.title}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {describeFrequency(t.frequency)}
                      {t.priority === 'alta' && ', importante'}
                      {t.special && ', tarefa especial'}
                      {!t.active && ', pausada'}
                    </span>
                  </span>
                  <span className="text-muted">
                    <Icon name="arrow" size={18} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing && (
        <TaskEditor
          task={editing === 'new' ? null : editing}
          rooms={rooms.map(([r]) => r)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
