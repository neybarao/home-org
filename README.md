# Casa em dia

PWA para organizar as tarefas da casa entre duas pessoas, em pedaços pequenos ao longo da semana, para o fim de semana ficar livre.

Publicado em https://neybarao.github.io/home-org/ pelo GitHub Actions a cada push na `main`.

## Como funciona

- **Hoje** mostra só as tarefas do dia. Toque no círculo para marcar como feita e em "Assumir" para avisar que a tarefa é sua.
- O que não foi feito aparece em **Ficou pra trás**. Tarefas diárias não acumulam, a de hoje substitui a de ontem.
- Quando tem mais tarefa do que o limite combinado, o app **sugere** quais passar para os próximos dias da semana (segunda a sábado). Quem decide é vocês.
- **Só um de nós hoje** corta o limite pela metade e sugere o que é prioridade.
- **Tarefa especial** (ex.: cortar a grama) fica fora do limite do dia.
- **Fechamento do dia** é a rotina curta de antes de dormir (pia limpa, brinquedos no cesto, mochila pronta). Fica fora do limite e não acumula.
- **Por onde começo?** mostra uma tarefa só: primeiro as suas, depois as livres, importantes e mais antigas na frente.
- Cada tarefa pode ter um **dono fixo**. Ela já aparece como dele, mas dá pra passar pro outro no dia.
- **Progresso** mostra dois anéis por dia, no estilo do Fitness: "Pra hoje" e "Fechamento". A semana aparece em mini anéis e, abaixo, o que foi feito em cada dia e por quem. Não tem placar entre os dois nem sequência que zera.
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
