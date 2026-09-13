# Discovery + Analysis — Setup (Phase 1.3–1.4)

This wires up scheduled job discovery (Greenhouse) and fit-analysis, all on free tiers.

## Pieces
- **`supabase/functions/discover`** — Edge Function (Deno). Fetches Greenhouse jobs for active sources, filters by your search rule, dedupes, inserts `discovered_jobs` rows as `status='new'`.
- **`/api/analyze-discovered`** — Next route. Analyzes **one** `new` job per call with Gemini, writes `fit_score` + `analysis`, sets status to `analyzed` (≥ min fit score) or `filtered_out`.
- **`pg_cron`** — schedules both.

## 1. Run migrations
Run in the Supabase SQL Editor, in order (once each): `002_auto_apply_schema.sql`, `003_job_sources.sql`, `004_discovered_jobs_analysis.sql`.

## 2. Env / secrets
- **Vercel** → add `CRON_SECRET` (any long random string). Redeploy.
- **Supabase Edge secret** (a second random string):
  ```bash
  supabase login
  supabase link --project-ref <PROJECT_REF>
  supabase secrets set FUNCTION_SECRET=<random-1>
  ```
  `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge Functions automatically — don't set them.

## 3. Deploy the Edge Function
```bash
supabase functions deploy discover --no-verify-jwt
```
(`--no-verify-jwt` because we authenticate with our own `x-function-secret` header instead of a user JWT.)

Test it manually:
```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/discover" \
  -H "x-function-secret: <random-1>"
# -> {"ok":true,"totalNew":N,"perSource":{...}}
```

## 4. Enable extensions
Supabase Dashboard → Database → Extensions → enable **pg_cron** and **pg_net**.

## 5. Schedule with pg_cron
Run in the SQL Editor (replace the placeholders):
```sql
-- Discover a few times a day
select cron.schedule(
  'jobfit-discover',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/discover',
    headers := jsonb_build_object('Content-Type','application/json','x-function-secret','<random-1>'),
    body := '{}'::jsonb
  );
  $$
);

-- Analyze one queued job every 5 minutes (fan-out, stays within serverless limits)
select cron.schedule(
  'jobfit-analyze',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://jobfit-copilot-sigma.vercel.app/api/analyze-discovered',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
```
Manage: `select * from cron.job;` to list, `select cron.unschedule('jobfit-analyze');` to remove.

## 6. Verify end to end
1. Add a Greenhouse board token on **/dashboard/search** (e.g. a company whose careers page is `boards.greenhouse.io/<token>`), and save a search rule.
2. Trigger discovery (the curl above, or wait for the cron). Confirm rows: `select count(*) from discovered_jobs where status='new';`
3. Hit analysis once manually:
   ```bash
   curl -X POST "https://jobfit-copilot-sigma.vercel.app/api/analyze-discovered" \
     -H "x-cron-secret: <CRON_SECRET>"
   ```
   Confirm `fit_score`/`analysis` populate and status becomes `analyzed`/`filtered_out`.
4. The review queue UI (Phase 1.5, next) reads `status in ('analyzed','queued')`.

## Notes / limits
- Analysis is **one job per call** on purpose (serverless time). At every-5-min cron, ~12 jobs/hour get scored — fine for a personal search; raise the cron frequency later if needed.
- A job whose analysis fails (or whose owner has no profile) is moved to `needs_human` so it never blocks the queue head.
- Filtering in discovery is a cheap keyword/location pass; the real scoring is the Gemini step.
