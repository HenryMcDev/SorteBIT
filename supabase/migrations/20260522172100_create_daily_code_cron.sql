-- Habilita a extensão pg_cron se ainda não estiver habilitada
create extension if not exists pg_cron;

-- Cria uma função que gera o código aleatório e insere na tabela daily_codes
create or replace function generate_daily_code()
returns void
language plpgsql
as $$
declare
  new_code text;
begin
  -- Gera um código de 6 dígitos aleatório (000000 a 999999)
  new_code := lpad((floor(random() * 1000000))::text, 6, '0');
  
  -- Insere na tabela daily_codes (presumindo que o banco de dados atribua automaticamente o created_at)
  insert into public.daily_codes (code) values (new_code);
end;
$$;

-- Agenda a tarefa para rodar todos os dias à meia-noite (00:00)
select cron.schedule(
  'generate_daily_code_job',     -- Nome da tarefa
  '0 0 * * *',                   -- Agendamento CRON: Meia-noite diariamente
  'select generate_daily_code()' -- Comando a ser executado
);
