-- JobFit Copilot — Auto-Discover & Auto-Apply schema (Phase 0 foundations)
-- Additive migration. Safe to run once in the Supabase SQL Editor after 001_mvp_schema.sql.
-- Depends on: public.set_updated_at() (created in 001) and the pgcrypto extension.

-- =====================================================================
-- Structured profile (raises tailored-resume quality vs freeform text)
-- =====================================================================

create table if not exists public.work_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text,
  title text,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution text,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  url text,
  description text,
  tech_stack text[] default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Search rules (what to discover + how autonomously to apply)
-- =====================================================================

create table if not exists public.search_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My search',
  titles text[] default '{}',
  locations text[] default '{}',
  work_types text[] default '{}',
  seniority text[] default '{}',
  min_salary integer,
  must_have_keywords text[] default '{}',
  exclude_keywords text[] default '{}',
  min_fit_score integer not null default 70,
  channels text[] default '{}',            -- e.g. {email, ats_http, browser, api}
  auto_apply boolean not null default false,
  daily_cap integer not null default 10,
  company_blocklist text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_rules_min_fit_score_check check (min_fit_score between 0 and 100),
  constraint search_rules_daily_cap_check check (daily_cap between 0 and 200)
);

-- =====================================================================
-- Discovered jobs (ingested from sources, deduped, analyzed)
-- =====================================================================

create table if not exists public.discovered_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  search_rule_id uuid references public.search_rules(id) on delete set null,
  source text not null,                    -- e.g. greenhouse, lever, api:<name>, manual
  source_job_id text,
  dedupe_hash text not null,               -- stable hash of source + external id (or url)
  title text,
  company text,
  location text,
  url text,
  description text,
  raw_payload jsonb,
  apply_channel text,                      -- email | ats_http | browser | api
  fit_score integer,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discovered_jobs_status_check
    check (status in ('new', 'filtered_out', 'analyzed', 'queued', 'applied', 'skipped', 'needs_human')),
  constraint discovered_jobs_fit_score_check
    check (fit_score is null or fit_score between 0 and 100),
  constraint discovered_jobs_dedupe_unique unique (user_id, dedupe_hash)
);

-- =====================================================================
-- Applications (one row per apply attempt on a discovered job)
-- =====================================================================

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discovered_job_id uuid not null references public.discovered_jobs(id) on delete cascade,
  channel text not null,                   -- email | ats_http | browser | api
  mode text not null default 'review',     -- review | auto
  resume_file_path text,                   -- path in the application-assets storage bucket
  cover_letter text,
  status text not null default 'draft',
  attempts integer not null default 0,
  submitted_at timestamptz,
  result text,
  evidence jsonb,                          -- message id, screenshot path, response snippet
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_mode_check check (mode in ('review', 'auto')),
  constraint applications_status_check
    check (status in ('draft', 'queued', 'submitted', 'failed', 'needs_human', 'skipped')),
  constraint applications_result_check
    check (result is null or result in ('success', 'failed', 'needs_human'))
);

-- =====================================================================
-- Run log (lightweight observability for scheduled discovery/apply runs)
-- =====================================================================

create table if not exists public.job_run_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  run_type text not null,                  -- discovery | analyze | apply
  source text,
  discovered_count integer not null default 0,
  analyzed_count integer not null default 0,
  applied_count integer not null default 0,
  error_count integer not null default 0,
  details jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Indexes
-- =====================================================================

create index if not exists work_experiences_user_id_idx on public.work_experiences(user_id);
create index if not exists education_user_id_idx on public.education(user_id);
create index if not exists profile_projects_user_id_idx on public.profile_projects(user_id);
create index if not exists search_rules_user_id_idx on public.search_rules(user_id);
create index if not exists discovered_jobs_user_id_idx on public.discovered_jobs(user_id);
create index if not exists discovered_jobs_status_idx on public.discovered_jobs(status);
create index if not exists discovered_jobs_created_at_idx on public.discovered_jobs(created_at desc);
create index if not exists applications_user_id_idx on public.applications(user_id);
create index if not exists applications_discovered_job_id_idx on public.applications(discovered_job_id);
create index if not exists applications_status_idx on public.applications(status);
create index if not exists job_run_log_user_id_idx on public.job_run_log(user_id);
create index if not exists job_run_log_created_at_idx on public.job_run_log(created_at desc);

-- =====================================================================
-- updated_at triggers (reuse public.set_updated_at from 001)
-- =====================================================================

create trigger set_work_experiences_updated_at
before update on public.work_experiences
for each row execute function public.set_updated_at();

create trigger set_education_updated_at
before update on public.education
for each row execute function public.set_updated_at();

create trigger set_profile_projects_updated_at
before update on public.profile_projects
for each row execute function public.set_updated_at();

create trigger set_search_rules_updated_at
before update on public.search_rules
for each row execute function public.set_updated_at();

create trigger set_discovered_jobs_updated_at
before update on public.discovered_jobs
for each row execute function public.set_updated_at();

create trigger set_applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security (user-scoped; every table carries user_id)
-- =====================================================================

alter table public.work_experiences enable row level security;
alter table public.education enable row level security;
alter table public.profile_projects enable row level security;
alter table public.search_rules enable row level security;
alter table public.discovered_jobs enable row level security;
alter table public.applications enable row level security;
alter table public.job_run_log enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.work_experiences to authenticated;
grant select, insert, update, delete on table public.education to authenticated;
grant select, insert, update, delete on table public.profile_projects to authenticated;
grant select, insert, update, delete on table public.search_rules to authenticated;
grant select, insert, update, delete on table public.discovered_jobs to authenticated;
grant select, insert, update, delete on table public.applications to authenticated;
grant select, insert, update, delete on table public.job_run_log to authenticated;

-- Helper: identical CRUD policy set for a user_id-scoped table.
-- (Written out per-table so this file stays a single, copy-pasteable script.)

-- work_experiences
create policy "own work_experiences select" on public.work_experiences
  for select using (auth.uid() = user_id);
create policy "own work_experiences insert" on public.work_experiences
  for insert with check (auth.uid() = user_id);
create policy "own work_experiences update" on public.work_experiences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own work_experiences delete" on public.work_experiences
  for delete using (auth.uid() = user_id);

-- education
create policy "own education select" on public.education
  for select using (auth.uid() = user_id);
create policy "own education insert" on public.education
  for insert with check (auth.uid() = user_id);
create policy "own education update" on public.education
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own education delete" on public.education
  for delete using (auth.uid() = user_id);

-- profile_projects
create policy "own profile_projects select" on public.profile_projects
  for select using (auth.uid() = user_id);
create policy "own profile_projects insert" on public.profile_projects
  for insert with check (auth.uid() = user_id);
create policy "own profile_projects update" on public.profile_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own profile_projects delete" on public.profile_projects
  for delete using (auth.uid() = user_id);

-- search_rules
create policy "own search_rules select" on public.search_rules
  for select using (auth.uid() = user_id);
create policy "own search_rules insert" on public.search_rules
  for insert with check (auth.uid() = user_id);
create policy "own search_rules update" on public.search_rules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own search_rules delete" on public.search_rules
  for delete using (auth.uid() = user_id);

-- discovered_jobs
create policy "own discovered_jobs select" on public.discovered_jobs
  for select using (auth.uid() = user_id);
create policy "own discovered_jobs insert" on public.discovered_jobs
  for insert with check (auth.uid() = user_id);
create policy "own discovered_jobs update" on public.discovered_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own discovered_jobs delete" on public.discovered_jobs
  for delete using (auth.uid() = user_id);

-- applications
create policy "own applications select" on public.applications
  for select using (auth.uid() = user_id);
create policy "own applications insert" on public.applications
  for insert with check (auth.uid() = user_id);
create policy "own applications update" on public.applications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own applications delete" on public.applications
  for delete using (auth.uid() = user_id);

-- job_run_log (read-only for users; writes come from the service role / worker)
create policy "own job_run_log select" on public.job_run_log
  for select using (auth.uid() = user_id);

-- =====================================================================
-- Storage bucket for generated resume / cover-letter PDFs
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('application-assets', 'application-assets', false)
on conflict (id) do nothing;

-- Owner-scoped access: object path must begin with the user's uid, e.g.
--   <uid>/<application_id>/resume.pdf
create policy "own application-assets read" on storage.objects
  for select using (
    bucket_id = 'application-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own application-assets insert" on storage.objects
  for insert with check (
    bucket_id = 'application-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own application-assets update" on storage.objects
  for update using (
    bucket_id = 'application-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own application-assets delete" on storage.objects
  for delete using (
    bucket_id = 'application-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
