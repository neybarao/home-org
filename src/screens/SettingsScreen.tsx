import { Avatar, Card, Segmented, SectionTitle, Switch } from '../components/ui'
import { actions, useHome } from '../data/store'
import type { ThemeChoice } from '../lib/theme'
import { PEOPLE, type Person } from '../lib/types'

export function SettingsScreen({
  me,
  onChangeMe,
  theme,
  onChangeTheme,
}: {
  me: Person
  onChangeMe: (p: Person) => void
  theme: ThemeChoice
  onChangeTheme: (t: ThemeChoice) => void
}) {
  const { settings } = useHome()
  const limit = settings.dailyLimit
  const step = 'pop glass grid size-12 place-items-center rounded-full text-2xl font-medium'

  return (
    <div>
      <h1 className="text-[2.75rem] leading-none font-extrabold tracking-[-0.045em] text-ink/85">Ajustes</h1>

      <section className="mt-7">
        <SectionTitle>Aparência</SectionTitle>
        <Segmented
          label="Tema"
          value={theme}
          onChange={onChangeTheme}
          options={[
            ['system', 'Automático'],
            ['light', 'Claro'],
            ['dark', 'Escuro'],
          ]}
        />
      </section>

      <section className="mt-7">
        <SectionTitle>Rotina</SectionTitle>
        <Card className="p-5">
          <p className="font-semibold">Tarefas por pessoa, por dia</p>
          <p className="text-[13px] text-muted">Ainda em aberto. Ajustem conforme forem usando.</p>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => actions.setSettings({ dailyLimit: Math.max(1, limit - 1) })} aria-label="Diminuir" className={step}>
              −
            </button>
            <span className="tabular w-12 text-center text-[36px] font-bold tracking-tight" aria-live="polite">
              {limit}
            </span>
            <button onClick={() => actions.setSettings({ dailyLimit: Math.min(12, limit + 1) })} aria-label="Aumentar" className={step}>
              +
            </button>
            <span className="ml-1 text-[13px] text-muted">{limit * 2} no total, com os dois</span>
          </div>
        </Card>

        <label className="glass mt-2 flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <span>
            <span className="block font-semibold">Resumo do dia</span>
            <span className="block text-[13px] text-muted">Mostra em Hoje quantas foram feitas e por quem.</span>
          </span>
          <Switch checked={settings.showSummary} onChange={(v) => actions.setSettings({ showSummary: v })} />
        </label>
      </section>

      <section className="mt-7">
        <SectionTitle>Quem usa este celular</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PEOPLE) as Person[]).map((p) => (
            <button
              key={p}
              aria-pressed={me === p}
              onClick={() => onChangeMe(p)}
              className={`pop flex items-center gap-3 rounded-[24px] p-2.5 pr-4 font-semibold ${me === p ? 'bg-solid text-on-solid' : 'glass'}`}
            >
              <Avatar person={p} size={40} />
              {PEOPLE[p].name}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionTitle>Dados</SectionTitle>
        <Card className="p-5">
          <p className="text-[14px] text-muted">
            Por enquanto tudo fica só neste celular, com dados de exemplo. Quando o banco de dados entrar, os dois vão ver a mesma lista.
          </p>
          <button
            onClick={() => {
              if (window.confirm('Apagar o histórico e começar a contar a partir de hoje? As tarefas cadastradas continuam.')) actions.startFresh()
            }}
            className="pop mt-4 h-12 w-full rounded-full bg-white/80 font-semibold ring-1 ring-black/5 dark:bg-white/[0.08] dark:ring-white/10"
          >
            Começar do zero a partir de hoje
          </button>
          <button
            onClick={() => {
              if (window.confirm('Voltar para os dados de exemplo? O que vocês mudaram será perdido.')) actions.resetDemo()
            }}
            className="pop mt-2 h-12 w-full rounded-full font-semibold text-muted"
          >
            Voltar aos dados de exemplo
          </button>
        </Card>
      </section>
    </div>
  )
}
