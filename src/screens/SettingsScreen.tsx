import { actions, useHome } from '../data/store'
import { PEOPLE, type Person } from '../lib/types'
import { Switch } from './TodayScreen'

export function SettingsScreen({ me, onChangeMe }: { me: Person; onChangeMe: (p: Person) => void }) {
  const { settings } = useHome()
  const limit = settings.dailyLimit

  return (
    <div>
      <h1 className="font-display text-[2.5rem] font-extrabold leading-none tracking-tight [font-stretch:80%]">Ajustes</h1>

      <section className="mt-7 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">Tarefas por pessoa, por dia</h2>
        <p className="text-[14px] text-muted">Ainda em aberto. Ajustem conforme forem usando.</p>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => actions.setSettings({ dailyLimit: Math.max(1, limit - 1) })}
            aria-label="Diminuir"
            className="pop size-11 rounded-full border border-line text-xl font-bold"
          >
            −
          </button>
          <span className="tabular w-10 text-center font-display text-3xl font-bold" aria-live="polite">
            {limit}
          </span>
          <button
            onClick={() => actions.setSettings({ dailyLimit: Math.min(12, limit + 1) })}
            aria-label="Aumentar"
            className="pop size-11 rounded-full border border-line text-xl font-bold"
          >
            +
          </button>
          <span className="text-[14px] text-muted">{limit * 2} no total, com os dois</span>
        </div>
      </section>

      <label className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-surface p-4">
        <span>
          <span className="block font-bold">Resumo do dia</span>
          <span className="block text-[14px] text-muted">Mostra no topo de Hoje quantas foram feitas e por quem.</span>
        </span>
        <Switch checked={settings.showSummary} onChange={(v) => actions.setSettings({ showSummary: v })} />
      </label>

      <section className="mt-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">Quem usa este celular</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(Object.keys(PEOPLE) as Person[]).map((p) => (
            <button
              key={p}
              aria-pressed={me === p}
              onClick={() => onChangeMe(p)}
              className="pop h-11 rounded-full border font-bold"
              style={me === p ? { background: `var(--${p})`, borderColor: `var(--${p})`, color: 'var(--on-person)' } : { borderColor: 'var(--line)' }}
            >
              {PEOPLE[p].name}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">Dados</h2>
        <p className="mt-1 text-[14px] text-muted">
          Por enquanto tudo fica só neste celular, com dados de exemplo. Quando o banco de dados entrar, os dois vão ver a mesma lista.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Apagar o histórico e começar a contar a partir de hoje? As tarefas cadastradas continuam.')) actions.startFresh()
          }}
          className="pop mt-3 h-11 w-full rounded-full border border-line font-bold"
        >
          Começar do zero a partir de hoje
        </button>
        <button
          onClick={() => {
            if (window.confirm('Voltar para os dados de exemplo? O que vocês mudaram será perdido.')) actions.resetDemo()
          }}
          className="pop mt-2 h-11 w-full rounded-full font-bold text-muted"
        >
          Voltar aos dados de exemplo
        </button>
      </section>
    </div>
  )
}
