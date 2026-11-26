-- Dia: esquema do banco no Supabase
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase (uma vez só).
-- Pode rodar de novo sem problema: tudo usa "if not exists" / "or replace".
--
-- Ideia: cada tarefa e cada ocorrência é uma linha. Assim, quando um celular
-- marca "lavar a louça" e o outro mexe em outra tarefa, um não apaga o outro.
-- O Realtime avisa o outro celular na hora.

-- ---------- Quem pode usar ----------
-- Só quem estiver nesta tabela lê e escreve. Depois do primeiro login de cada um,
-- insira o user id (veja o passo a passo no README).

create table if not exists public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  person text not null unique check (person in ('ney', 'cleide'))
);

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

-- ---------- Tarefas cadastradas ----------

create table if not exists public.templates (
  id text primary key,
  title text not null,
  room text not null,
  -- ex.: {"kind":"weekly","weekdays":[1,4]}
  frequency jsonb not null,
  priority text not null default 'normal' check (priority in ('alta', 'normal')),
  special boolean not null default false,
  active boolean not null default true,
  closing boolean not null default false,
  owner text check (owner in ('ney', 'cleide')),
  updated_at timestamptz not null default now()
);

-- Nota com mais detalhes da tarefa (opcional).
alter table public.templates add column if not exists note text;

-- ---------- O que aconteceu com cada tarefa em cada dia ----------
-- key = id da tarefa + data (a mesma chave que o app já usa).
-- claimed_by: null = ninguém mexeu (vale o dono), 'none' = soltaram de propósito.

create table if not exists public.occurrences (
  key text primary key,
  planned_date date,
  claimed_by text check (claimed_by in ('ney', 'cleide', 'none')),
  done_by text check (done_by in ('ney', 'cleide')),
  done_on date,
  updated_at timestamptz not null default now()
);

-- ---------- Ajustes da casa (uma linha só) ----------

create table if not exists public.settings (
  id smallint primary key default 1 check (id = 1),
  daily_limit smallint not null default 3,
  start_date date not null default current_date,
  show_summary boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- updated_at automático ----------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists templates_touch on public.templates;
create trigger templates_touch before update on public.templates
  for each row execute function public.touch_updated_at();

drop trigger if exists occurrences_touch on public.occurrences;
create trigger occurrences_touch before update on public.occurrences
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------- Segurança (RLS) ----------
-- Nada é público. Só membros leem e escrevem.

alter table public.members enable row level security;
alter table public.templates enable row level security;
alter table public.occurrences enable row level security;
alter table public.settings enable row level security;

drop policy if exists "members: cada um vê a casa" on public.members;
create policy "members: cada um vê a casa" on public.members
  for select using (public.is_member());

drop policy if exists "templates: membros" on public.templates;
create policy "templates: membros" on public.templates
  for all using (public.is_member()) with check (public.is_member());

drop policy if exists "occurrences: membros" on public.occurrences;
create policy "occurrences: membros" on public.occurrences
  for all using (public.is_member()) with check (public.is_member());

drop policy if exists "settings: membros" on public.settings;
create policy "settings: membros" on public.settings
  for all using (public.is_member()) with check (public.is_member());

-- ---------- Realtime ----------
-- Faz o outro celular receber as mudanças na hora.

do $$
begin
  begin alter publication supabase_realtime add table public.templates; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.occurrences; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.settings; exception when duplicate_object then null; end;
end $$;
