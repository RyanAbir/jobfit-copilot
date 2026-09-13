-- JobFit Copilot — store analysis on discovered jobs (Phase 1.4)
-- Additive migration. Run once in the Supabase SQL Editor after 003_job_sources.sql.

alter table public.discovered_jobs
  add column if not exists analysis jsonb,
  add column if not exists match_label text;
