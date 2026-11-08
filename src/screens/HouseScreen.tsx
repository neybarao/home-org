import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { TaskEditor } from '../components/TaskEditor'
import { Card, SectionTitle } from '../components/ui'
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
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-[2.75rem] leading-none font-extrabold tracking-[-0.045em] text-ink/85">Tarefas</h1>
        <button onClick={() => setEditing('new')} aria-label="Nova tarefa" className="pop grid size-14 place-items-center rounded-full bg-solid text-on-solid">
          <Icon name="plus" />
        </button>
      </header>
      <p className="mt-3 px-1 text-[15px] text-muted">
        Começou com uma sugestão de rotina. Toquem numa tarefa para mudar o dia, a frequência ou a prioridade.
      </p>

      {rooms.map(([room, tasks]) => (
        <section key={room} className="mt-7">
          <SectionTitle>{room}</SectionTitle>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setEditing(t)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 dark:active:bg-white/5">
                    <span className="min-w-0 flex-1">
                      <span className={`block leading-snug ${t.active ? 'font-semibold' : 'text-muted line-through'}`}>{t.title}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-muted">
                        <span>{describeFrequency(t.frequency)}</span>
                        {t.priority === 'alta' && <span className="text-ink">Importante</span>}
                        {t.special && <span className="text-ink">Especial</span>}
                        {!t.active && <span>Pausada</span>}
                      </span>
                    </span>
                    <span className="text-muted">
                      <Icon name="chevron" size={18} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}

      {editing && <TaskEditor task={editing === 'new' ? null : editing} rooms={rooms.map(([r]) => r)} onClose={() => setEditing(null)} />}
    </div>
  )
}
