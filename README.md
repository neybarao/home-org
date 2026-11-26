# Dia

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

## Banco de dados (Supabase)

Os arquivos ficam em `supabase/`. Passo a passo para criar:

1. Em supabase.com, crie um projeto novo (plano grátis, região São Paulo).
2. No **SQL Editor**, cole e rode `supabase/schema.sql` inteiro. Depois rode `supabase/maintenance.sql`.
3. Em **Authentication > Sign In / Providers**, deixe o login por e-mail ligado (link mágico). Em **URL Configuration**, coloque `https://neybarao.github.io/home-org/` como Site URL.
4. Em **Project Settings > API**, copie a URL do projeto e a chave **publishable** (nunca a secret) para um arquivo `.env.production` na raiz:
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_...
   ```
   A chave publishable foi feita para ficar no navegador; quem protege os dados é o RLS do `schema.sql`.
5. Depois que cada um entrar no app pela primeira vez, libere os dois no SQL Editor (os ids estão em **Authentication > Users**):
   ```sql
   insert into public.members (user_id, person) values
     ('ID-DO-NEY', 'ney'),
     ('ID-DA-CLEIDE', 'cleide');
   ```

### Pausa do plano grátis

O Supabase pausa projetos grátis com pouca atividade em 7 dias. Igual ao BoraLah, dois workflows evitam isso:

- `keepalive.yml`: uma leitura leve a cada 4 horas.
- `keepalive-madrugada.yml`: por volta das 3h cria e altera um registro fictício numa tabela separada (`recycle`), espera 30 minutos e apaga.

Os dois só rodam depois que o `.env.production` existir. O GitHub pode desligar tarefas agendadas em repositórios parados por muito tempo; se a pausa acontecer, reative o projeto no painel do Supabase (os dados não se perdem) e rode os workflows de novo.

## Desenvolvimento

```bash
npm install
npm run dev     # servidor local
npm test        # testes da lógica de agenda
npm run build
```

Stack: Vite, React, TypeScript, Tailwind e vite-plugin-pwa.
