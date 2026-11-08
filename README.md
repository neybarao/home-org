# Casa em dia

PWA para organizar as tarefas da casa entre duas pessoas, em pedaços pequenos ao longo da semana, para o fim de semana ficar livre.

Publicado em https://neybarao.github.io/home-org/ pelo GitHub Actions a cada push na `main`.

## Como funciona

- **Hoje** mostra só as tarefas do dia. Toque no círculo para marcar como feita e em "Assumir" para avisar que a tarefa é sua.
- O que não foi feito aparece em **Ficou pra trás**. Tarefas diárias não acumulam, a de hoje substitui a de ontem.
- Quando tem mais tarefa do que o limite combinado, o app **sugere** quais passar para os próximos dias da semana (segunda a sábado). Quem decide é vocês.
- **Só um de nós hoje** corta o limite pela metade e sugere o que é prioridade.
- **Tarefa especial** (ex.: cortar a grama) fica fora do limite do dia.
- **Tarefas da casa** começa com uma sugestão de rotina e tudo é editável.

## Estado atual

Protótipo de interface. Os dados ficam só no celular (localStorage) e começam com exemplos. A próxima etapa é ligar o Supabase para os dois aparelhos verem a mesma lista. A troca acontece em `src/data/repo.ts`.

## Desenvolvimento

```bash
npm install
npm run dev     # servidor local
npm test        # testes da lógica de agenda
npm run build
```

Stack: Vite, React, TypeScript, Tailwind e vite-plugin-pwa.
