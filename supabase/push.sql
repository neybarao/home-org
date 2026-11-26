-- Dia: notificações push.
-- Rode depois do schema.sql. Pode rodar de novo sem problema.
--
-- Como funciona:
-- - Cada celular que ativa as notificações vira uma linha em push_subscriptions.
-- - Quando alguém assume ou solta uma tarefa, o gatilho chama a função "push"
--   (Edge Function), que avisa o outro.
-- - A cada 5 minutos o pg_cron chama a mesma função para mandar o lembrete do dia
--   de quem chegou no horário escolhido.
-- - As chaves VAPID são geradas pela própria função na primeira chamada e ficam
--   no schema private, que a API não expõe.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.push_config (
  id smallint primary key default 1 check (id = 1),
  -- Senha que o gatilho e o cron mandam para a função. Gerada aqui, ninguém digita.
  hook_secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  vapid_public text,
  vapid_private text
);
insert into private.push_config (id) values (1) on conflict (id) do nothing;

-- Só a função (service_role) lê e grava a configuração.
create or replace function public.push_get_config()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select row_to_json(c) from private.push_config c where c.id = 1;
$$;

create or replace function public.push_set_vapid(pub text, priv text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.push_config set vapid_public = pub, vapid_private = priv where id = 1 and vapid_public is null;
$$;

revoke all on function public.push_get_config() from public, anon, authenticated;
revoke all on function public.push_set_vapid(text, text) from public, anon, authenticated;
grant execute on function public.push_get_config() to service_role;
grant execute on function public.push_set_vapid(text, text) to service_role;

-- ---------- Celulares com notificação ligada ----------

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person text not null check (person in ('ney', 'cleide')),
  p256dh text not null,
  auth text not null,
  notify_claims boolean not null default true,
  reminder_enabled boolean not null default true,
  reminder_time time not null default '08:00',
  last_reminder date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists push_subscriptions_touch on public.push_subscriptions;
create trigger push_subscriptions_touch before update on public.push_subscriptions
  for each row execute function public.touch_updated_at();

alter table public.push_subscriptions enable row level security;

-- Cada um mexe só nos próprios celulares, e só como a pessoa que é em members.
drop policy if exists "push: o próprio" on public.push_subscriptions;
create policy "push: o próprio" on public.push_subscriptions
  for all
  using (user_id = auth.uid() and public.is_member())
  with check (
    user_id = auth.uid()
    and person = (select m.person from public.members m where m.user_id = auth.uid())
  );

-- ---------- Aviso quando alguém assume ou solta uma tarefa ----------

create or replace function public.push_on_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text;
  kind text;
  owner_ text;
  secret text;
begin
  if tg_op = 'UPDATE' and new.claimed_by is not distinct from old.claimed_by then
    return new;
  end if;
  -- Marcar como feita também grava quem estava com a tarefa: isso não é "assumir".
  if new.done_by is not null or (tg_op = 'UPDATE' and new.done_by is distinct from old.done_by) then
    return new;
  end if;

  if new.claimed_by in ('ney', 'cleide') then
    actor := new.claimed_by;
    kind := 'assumiu';
  elsif new.claimed_by = 'none' then
    -- Quem soltou é quem estava com ela: quem tinha assumido ou, senão, o dono.
    select t.owner into owner_ from public.templates t where t.id = split_part(new.key, '@', 1);
    actor := case when tg_op = 'UPDATE' and old.claimed_by in ('ney', 'cleide') then old.claimed_by else owner_ end;
    kind := 'soltou';
  end if;
  if actor is null then
    return new;
  end if;

  select c.hook_secret into secret from private.push_config c where c.id = 1;
  perform net.http_post(
    url := 'https://rzzfikycurkgvolnjuif.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dia-secret', secret),
    body := jsonb_build_object('type', 'claim', 'actor', actor, 'kind', kind, 'key', new.key),
    timeout_milliseconds := 30000
  );
  return new;
end;
$$;

drop trigger if exists occurrences_push on public.occurrences;
create trigger occurrences_push after insert or update on public.occurrences
  for each row execute function public.push_on_claim();

-- ---------- Lembrete do dia (a cada 5 minutos confere quem chegou no horário) ----------

create or replace function public.push_run_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  if not exists (select 1 from public.push_subscriptions where reminder_enabled) then
    return;
  end if;
  select c.hook_secret into secret from private.push_config c where c.id = 1;
  perform net.http_post(
    url := 'https://rzzfikycurkgvolnjuif.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dia-secret', secret),
    body := jsonb_build_object('type', 'reminders'),
    timeout_milliseconds := 30000
  );
end;
$$;

revoke all on function public.push_run_reminders() from public, anon, authenticated;

select cron.unschedule('dia-lembretes') where exists (select 1 from cron.job where jobname = 'dia-lembretes');
select cron.schedule('dia-lembretes', '*/5 * * * *', 'select public.push_run_reminders()');

-- ---------- Aviso quando uma tarefa é colocada no nome de alguém ----------
-- Requer a coluna note em templates (schema.sql).
-- Tarefa extra criada para o outro, ou tarefa da rotina que passou a ter o outro como dono.
-- Quem fez a mudança vem do login (auth.uid()); quem coloca no próprio nome não recebe aviso.

create or replace function public.push_on_assign()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  by_ text;
  secret text;
begin
  if new.owner is null or not new.active then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.owner is not distinct from old.owner then
    return new;
  end if;
  select m.person into by_ from public.members m where m.user_id = auth.uid();
  if by_ is null or by_ = new.owner then
    return new;
  end if;

  select c.hook_secret into secret from private.push_config c where c.id = 1;
  perform net.http_post(
    url := 'https://rzzfikycurkgvolnjuif.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dia-secret', secret),
    body := jsonb_build_object('type', 'assigned', 'to', new.owner, 'by', by_, 'templateId', new.id),
    timeout_milliseconds := 30000
  );
  return new;
end;
$$;

revoke all on function public.push_on_assign() from public, anon, authenticated;

create or replace trigger templates_push after insert or update on public.templates
  for each row execute function public.push_on_assign();
