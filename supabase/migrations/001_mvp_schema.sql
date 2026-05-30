-- JobFit Copilot MVP database schema
-- Run once in the Supabase SQL Editor for a new project.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  target_role text,
  location text,
  experience_level text,
  skills text[] default '{}',
  main_tech_stack text[] default '{}',
  projects text,
  experience_summary text,
  resume_text text,
  portfolio_url text,
  github_url text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text,
  job_title text,
  source_url text,
  location text,
  work_type text,
  salary_range text,
  job_post_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_analysis (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  fit_score integer not null default 0,
  match_label text,
  technical_skill_score integer default 0,
  project_relevance_score integer default 0,
  experience_match_score integer default 0,
  location_match_score integer default 0,
  resume_keyword_score integer default 0,
  required_skills text[] default '{}',
  nice_to_have_skills text[] default '{}',
  matched_skills text[] default '{}',
  partially_matched_skills text[] default '{}',
  missing_skills text[] default '{}',
  responsibilities text[] default '{}',
  tools_mentioned text[] default '{}',
  soft_skills text[] default '{}',
  experience_level text,
  extracted_location text,
  extracted_work_type text,
  red_flags text[] default '{}',
  summary text,
  recommendation text,
  raw_ai_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_analysis_fit_score_check check (fit_score between 0 and 100),
  constraint job_analysis_technical_skill_score_check check (technical_skill_score between 0 and 40),
  constraint job_analysis_project_relevance_score_check check (project_relevance_score between 0 and 25),
  constraint job_analysis_experience_match_score_check check (experience_match_score between 0 and 15),
  constraint job_analysis_location_match_score_check check (location_match_score between 0 and 10),
  constraint job_analysis_resume_keyword_score_check check (resume_keyword_score between 0 and 10)
);

create table public.generated_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  email_subject text,
  cover_letter text,
  resume_keywords text[] default '{}',
  interview_questions text[] default '{}',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_applications_status_check
    check (status in ('Draft', 'Applied', 'Interview', 'Rejected', 'Offer', 'Archived'))
);

create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_created_at_idx on public.profiles(created_at desc);
create index jobs_user_id_idx on public.jobs(user_id);
create index jobs_created_at_idx on public.jobs(created_at desc);
create index job_analysis_job_id_idx on public.job_analysis(job_id);
create index job_analysis_created_at_idx on public.job_analysis(created_at desc);
create index generated_applications_job_id_idx on public.generated_applications(job_id);
create index generated_applications_status_idx on public.generated_applications(status);
create index generated_applications_created_at_idx on public.generated_applications(created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger set_job_analysis_updated_at
before update on public.job_analysis
for each row execute function public.set_updated_at();

create trigger set_generated_applications_updated_at
before update on public.generated_applications
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_analysis enable row level security;
alter table public.generated_applications enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
using (auth.uid() = user_id);

create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own profile"
on public.profiles
for delete
using (auth.uid() = user_id);

create policy "Users can read their own jobs"
on public.jobs
for select
using (auth.uid() = user_id);

create policy "Users can insert their own jobs"
on public.jobs
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own jobs"
on public.jobs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own jobs"
on public.jobs
for delete
using (auth.uid() = user_id);

create policy "Users can read analysis for their own jobs"
on public.job_analysis
for select
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_analysis.job_id
      and jobs.user_id = auth.uid()
  )
);

create policy "Users can insert analysis for their own jobs"
on public.job_analysis
for insert
with check (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_analysis.job_id
      and jobs.user_id = auth.uid()
  )
);

create policy "Users can update analysis for their own jobs"
on public.job_analysis
for update
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_analysis.job_id
      and jobs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_analysis.job_id
      and jobs.user_id = auth.uid()
  )
);

create policy "Users can delete analysis for their own jobs"
on public.job_analysis
for delete
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_analysis.job_id
      and jobs.user_id = auth.uid()
  )
);

create policy "Users can read generated applications for their own jobs"
on public.generated_applications
for select
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = generated_applications.job_id
      and jobs.user_id = auth.uid()
  )
);

create policy "Users can insert generated applications for their own jobs"
on public.generated_applications
for insert
with check (
  exists (
    select 1
    from public.jobs
    where jobs.id = generated_applications.job_id
      and jobs.user_id = auth.uid()
  )
);

create policy "Users can update generated applications for their own jobs"
on public.generated_applications
for update
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = generated_applications.job_id
      and jobs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.jobs
    where jobs.id = generated_applications.job_id
      and jobs.user_id = auth.uid()
  )
);

create policy "Users can delete generated applications for their own jobs"
on public.generated_applications
for delete
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = generated_applications.job_id
      and jobs.user_id = auth.uid()
  )
);
