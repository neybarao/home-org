-- Atividade de madrugada para o Supabase não pausar o projeto.
-- Mesmo esquema do BoraLah. Rode uma vez no SQL Editor do Supabase.
--
-- Usa uma tabela própria, separada das tarefas, para que nada fictício apareça
-- no app. Ninguém acessa a tabela direto (RLS sem políticas); só a função abaixo,
-- que o GitHub Actions chama com a chave pública.

create table if not exists public.recycle (
  id bigint generated always as identity primary key,
  nota text not null,
  criado_em timestamptz not null default now(),
  alterado_em timestamptz
);

alter table public.recycle enable row level security;

-- etapa 'criar': cria um registro e depois altera ele.
-- etapa 'apagar': apaga os registros.
create or replace function public.run_recycle(etapa text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_id bigint;
begin
  -- Faxina de segurança: nunca guarda nada com mais de 1 dia.
  delete from public.recycle where criado_em < now() - interval '1 day';

  if etapa = 'criar' then
    -- Evita acúmulo caso alguém chame a função repetidamente.
    if (select count(*) from public.recycle) >= 10 then
      return 'limite atingido';
    end if;
    insert into public.recycle (nota) values ('registro fictício') returning id into novo_id;
    update public.recycle set nota = 'registro fictício alterado', alterado_em = now() where id = novo_id;
    return 'criado e alterado: ' || novo_id;
  elsif etapa = 'apagar' then
    delete from public.recycle where id is not null;
    return 'apagado';
  else
    raise exception 'etapa inválida: %', etapa;
  end if;
end;
$$;

revoke all on function public.run_recycle(text) from public;
grant execute on function public.run_recycle(text) to anon, authenticated;
