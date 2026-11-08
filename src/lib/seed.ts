import { addDays, type ISODate } from './dates'
import { buildOccurrences, carriesOver } from './schedule'
import type { HomeData, TaskTemplate } from './types'

// Sugestão inicial de rotina para a casa. Tudo é editável no app.
// Ideia geral: cada dia da semana cuida de uma parte da casa, o domingo fica
// só com as diárias e as tarefas grandes ficam como especiais.
const SEG = 1, TER = 2, QUA = 3, QUI = 4, SEX = 5, SAB = 6

export const SUGGESTED_TASKS: TaskTemplate[] = [
  // Diárias
  t('louca', 'Lavar a louça e limpar a pia', 'Sala e cozinha', { kind: 'daily' }, 'alta'),
  t('coco', 'Recolher o cocô do quintal', 'Cachorros', { kind: 'daily' }, 'alta'),
  t('alimentacao', 'Organizar a alimentação do neném', 'Neném', { kind: 'daily' }, 'alta'),
  t('mochila', 'Arrumar a mochila do neném (antes de dormir)', 'Neném', { kind: 'daily' }, 'alta'),

  // Segunda: suíte
  t('banheiro-suite', 'Limpar o banheiro da suíte', 'Suíte', { kind: 'weekly', weekdays: [SEG] }, 'normal'),
  t('roupa', 'Lavar e estender roupa', 'Lavanderia', { kind: 'weekly', weekdays: [SEG, QUI] }, 'alta'),

  // Terça: quarto do neném
  t('quarto-nenem', 'Arrumar e aspirar o quarto do neném', 'Quarto do neném', { kind: 'weekly', weekdays: [TER] }, 'alta'),
  t('banheiro-nenem', 'Limpar o banheiro do neném', 'Quarto do neném', { kind: 'weekly', weekdays: [TER] }, 'normal'),
  t('visitas', 'Tirar o pó e arejar o quarto de visitas', 'Quarto de visitas', { kind: 'biweekly', weekday: TER }, 'normal'),

  // Quarta: sala e cozinha
  t('sala-cozinha', 'Aspirar e passar pano na sala e cozinha', 'Sala e cozinha', { kind: 'weekly', weekdays: [QUA] }, 'alta'),
  t('fogao', 'Limpar o fogão', 'Sala e cozinha', { kind: 'weekly', weekdays: [QUA] }, 'normal'),
  t('vidros', 'Limpar vidros e janelas', 'Sala e cozinha', { kind: 'monthly', week: 3, weekday: QUA }, 'normal'),

  // Quinta: quarto do casal
  t('quarto-casal', 'Tirar o pó e aspirar o quarto do casal', 'Suíte', { kind: 'weekly', weekdays: [QUI] }, 'normal'),
  t('geladeira', 'Limpar a geladeira', 'Sala e cozinha', { kind: 'monthly', week: 2, weekday: QUI }, 'normal'),

  // Sexta: cachorros e lavanderia
  t('banho-cachorros', 'Dar banho nos cachorros', 'Cachorros', { kind: 'weekly', weekdays: [SEX] }, 'normal'),
  t('lavanderia', 'Organizar a lavanderia', 'Lavanderia', { kind: 'weekly', weekdays: [SEX] }, 'normal'),

  // Sábado: área externa
  t('banheiro-externo', 'Limpar o banheiro externo', 'Área externa', { kind: 'weekly', weekdays: [SAB] }, 'normal'),
  t('roupa-cama', 'Trocar a roupa de cama', 'Suíte', { kind: 'weekly', weekdays: [SAB] }, 'normal'),
  { ...t('grama', 'Cortar a grama', 'Área externa', { kind: 'monthly', week: 1, weekday: SAB }, 'normal'), special: true },
]

function t(id: string, title: string, room: string, frequency: TaskTemplate['frequency'], priority: TaskTemplate['priority']): TaskTemplate {
  return { id, title, room, frequency, priority, special: false, active: true }
}

/** Dados novos, sem histórico: começa hoje. */
export function emptyData(today: ISODate): HomeData {
  return {
    version: 1,
    templates: SUGGESTED_TASKS.map((x) => ({ ...x })),
    occurrences: {},
    settings: { dailyLimit: 4, startDate: today, showSummary: false },
  }
}

/** Dados de exemplo: começa alguns dias atrás, com parte das tarefas feitas e parte atrasada. */
export function demoData(today: ISODate): HomeData {
  const data = emptyData(today)
  data.settings.startDate = addDays(today, -6)
  const map = new Map(data.templates.map((x) => [x.id, x]))
  const past = buildOccurrences(data, data.settings.startDate, addDays(today, -1))
  let i = 0
  for (const occ of past) {
    if (!carriesOver(map.get(occ.templateId)!)) continue
    // Mais ou menos dois terços feitas, alternando quem fez.
    if (i % 3 !== 2) {
      const who = i % 2 === 0 ? 'cleide' : 'ney'
      data.occurrences[occ.key] = { doneBy: who, claimedBy: who, doneOn: occ.dueDate }
    }
    i++
  }
  return data
}
