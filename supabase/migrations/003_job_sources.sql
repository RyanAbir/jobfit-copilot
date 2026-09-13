-- JobFit Copilot — job sources (Phase 1.1)
-- Additive migration. Run once in the Supabase SQL Editor after 002_auto_apply_schema.sql.
-- Depends on: public.set_updated_at() (created in 001).

create table if not exists public.job_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'greenhouse',
  -- config shape by type, e.g. greenhouse: { "board_token": "acme" }
  config jsonb not null default '{}',
  label text,
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_sources_type_check check (type in ('greenhouse', 'lever', 'ashby', 'api'))
);

create index if not exists job_sources_user_id_idx on public.job_sources(user_id);
create index if not exists job_sources_active_idx on public.job_sources(is_active);

create trigger set_job_sources_updated_at
before update on public.job_sources
for each row execute function public.set_updated_at();

alter table public.job_sources enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.job_sources to authenticated;

create policy "own job_sources select" on public.job_sources
  for select using (auth.uid() = user_id);
create policy "own job_sources insert" on public.job_sources
  for insert with check (auth.uid() = user_id);
create policy "own job_sources update" on public.job_sources
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own job_sources delete" on public.job_sources
  for delete using (auth.uid() = user_id);
