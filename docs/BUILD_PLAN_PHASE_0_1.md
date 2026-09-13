# JobFit Copilot — Phase 0 + Phase 1 Build Breakdown

Companion to `AUTO_APPLY_PLAN.md`. This is the concrete, ordered work to build the foundation (Phase 0) and the discovery + review queue (Phase 1) on the current **Vercel + Supabase free** stack. No auto-submit yet — that's Phase 2.

## Assumptions (change any before we build)
- **First discovery source:** Greenhouse public job boards (`boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`) — public JSON, no auth.
- **Profile becomes structured** (work history / education / projects) for resume quality.
- **Scheduling:** Supabase `pg_cron` → Supabase Edge Function (Deno) for discovery; per-job analysis reuses the existing Gemini code via a Vercel route.
- **No auto-submit in these phases** — everything lands in a review queue.

---

## Phase 0 — Foundations

**0.1 Run the schema migration** *(delivered)*
- `supabase/migrations/002_auto_apply_schema.sql` — run once in the Supabase SQL Editor. Adds structured-profile tables, `search_rules`, `discovered_jobs`, `applications`, `job_run_log`, the `application-assets` storage bucket, and all RLS. Purely additive; does not touch existing tables.

**0.2 Structured profile UI + server actions**
- Extend `/dashboard/profile` with three editable sections: Work experience, Education, Projects (add/edit/remove rows, drag or sort_order).
- New server actions: CRUD for `work_experiences`, `education`, `profile_projects` (user-scoped; RLS enforces ownership).
- New components: `components/profile/experience-editor.tsx`, `education-editor.tsx`, `projects-editor.tsx`.
- Keep the existing freeform fields as a fallback; structured data takes precedence when present.

**0.3 Resume builder from structured data**
- `lib/resume.ts` → add `buildResumeDataFromStructured(profile, experiences, education, projects, email)` so the resume renders real sections (Experience with dates, Education, Projects) instead of reflowed text.
- Reuse the existing `/resume` and `/resume/[jobId]` pages and `ResumeDocument`; feed them the richer data.

**0.4 Generated-PDF storage (groundwork for apply)**
- `lib/storage.ts` → helper to upload a generated resume/cover-letter PDF to `application-assets` at `<uid>/<application_id>/resume.pdf`.
- For now the PDF is still produced client-side (print-to-PDF); this helper is used once server-side generation lands.

## Phase 1 — Discovery + review queue (no auto-submit)

**1.1 Sources config (migration 003)**
- `job_sources` table: `id, user_id, type ('greenhouse'), config jsonb ({ board_token }), is_active`. Small additive migration.
- UI: a "Sources" section under a new Search settings page to add Greenhouse board tokens.

**1.2 Search rules UI**
- `/dashboard/search` page → create/edit a `search_rules` row (titles, locations, keywords, min fit score, channels, daily cap, blocklist, auto on/off — auto stays off through Phase 1).

**1.3 Discovery Edge Function (Supabase, Deno)**
- `supabase/functions/discover/index.ts`:
  1. Load active `search_rules` + `job_sources` per user.
  2. Fetch Greenhouse jobs JSON per board token.
  3. Cheap filter (title keywords, location, exclude keywords).
  4. Compute `dedupe_hash = sha256("greenhouse:" + token + ":" + job.id)`; insert into `discovered_jobs` as `status='new'`, skipping existing (unique constraint handles races).
  5. Write a `job_run_log` row.
- Scheduled by `pg_cron` (e.g. every 4–6 hours). Uses the service-role key (server-side only).

**1.4 Analysis step (reuse existing Gemini engine)**
- A Vercel route `POST /api/analyze-discovered` takes a `discovered_job_id`, runs the existing fit-analysis, writes `fit_score` + `status='analyzed'` (or `filtered_out` if below `min_fit_score`).
- Triggered per new job (fan-out: one call per job to respect serverless time limits) — the Edge Function enqueues by calling this route, or `pg_cron` sweeps `status='new'` rows.

**1.5 Review queue UI**
- `/dashboard/queue` page → lists `discovered_jobs` with `status in ('analyzed','queued')`, sorted by `fit_score`, with company/title/location/score and actions: **Open** (job detail), **Tailor resume** (existing per-job resume), **Skip** (`status='skipped'`), **Mark ready** (`status='queued'`).
- Reuse the analytics/table styling; add loading + empty states with the primitives already in the repo.
- Add **Queue** to the sidebar nav.

**1.6 Wire-up + verification**
- Seed one Greenhouse board token, run discovery manually (invoke the function), confirm rows appear, analysis populates scores, and the queue renders and filters. `pnpm lint && pnpm build` clean.

---

## New files/modules (Phase 0–1)
```
supabase/migrations/002_auto_apply_schema.sql        (done — run it)
supabase/migrations/003_job_sources.sql              (Phase 1)
supabase/functions/discover/index.ts                 (Phase 1 Edge Function)
src/app/api/analyze-discovered/route.ts              (Phase 1 analysis route)
src/app/dashboard/search/page.tsx                    (rules + sources UI)
src/app/dashboard/queue/page.tsx                     (review queue)
src/app/dashboard/queue/loading.tsx
src/components/profile/experience-editor.tsx
src/components/profile/education-editor.tsx
src/components/profile/projects-editor.tsx
src/components/queue/queue-table.tsx
src/lib/sources/greenhouse.ts                         (fetch + normalize)
src/lib/storage.ts                                    (bucket upload helper)
src/lib/resume.ts                                     (extend: structured builder)
```

## Env / config you'll need
- Existing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`.
- Edge Function secrets (Supabase): service-role key + `GEMINI_API_KEY` (if the function analyzes) — set via `supabase secrets set`.
- `pg_cron` + `pg_net` enabled in Supabase (Database → Extensions) to schedule and call the function/route.

## What you do vs what I build
- **You:** run `002_auto_apply_schema.sql` in Supabase; later enable `pg_cron`/`pg_net`; provide 1 Greenhouse board token to test with.
- **I build:** everything in the file list above, delivered into the repo the same way, lint+build verified, in reviewable increments (structured profile first, then discovery, then the queue).

## Suggested build order
1. Phase 0.2–0.3 (structured profile + resume) — visible value, no infra.
2. Phase 1.1–1.2 (sources + rules UI).
3. Phase 1.3–1.4 (discovery function + analysis).
4. Phase 1.5 (review queue) → verify end to end.
