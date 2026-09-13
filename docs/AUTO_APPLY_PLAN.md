# JobFit Copilot — Auto-Discover & Auto-Apply Architecture Plan

Status: draft for planning/brainstorming
Owner: Ryan Abir

**Hard constraint:** no VPS / no always-on server. Everything runs on **free tiers** — Vercel (Hobby), Supabase (Free), plus free ephemeral compute (GitHub Actions) and a browser extension. The design below is built entirely around that.

Scope (this round): support **both** a human-in-the-loop review queue **and** opt-in full auto-apply, across **four channels** — email applications, public ATS boards, browser autofill on big boards, and official job APIs.

**Deploy decision (locked):** build Phase 0–2 on the **current Vercel + Supabase free stack** — discovery a few times/day via Supabase `pg_cron` doesn't need frequent cron, so no migration is required to start. Evaluate a **Cloudflare (OpenNext) migration at Phase 3**, when per-minute Cron Triggers and Browser Rendering start to matter. Supabase and GitHub Actions stay constant across hosts. First discovery source: **Greenhouse public job boards** (public JSON, no auth). Profile becomes **structured** (work history / education / projects) for resume quality.

---

## 1. Vision

Turn JobFit Copilot from a *decision helper* into an *application engine*:

> Discover relevant jobs automatically → analyze each job description → regenerate a resume tailored to that job → apply (or stage a one-click apply), and track the outcome.

The analysis and resume-tailoring engine already exists. This plan adds the two missing subsystems — **Discovery** and **Apply** — using only free/serverless building blocks.

## 2. Design principles

1. **No always-on worker.** Replace the server with *ephemeral free compute*: Supabase `pg_cron` + Edge Functions for scheduled fetch/analyze, GitHub Actions for anything that needs a real browser, and a browser extension for in-session applies.
2. **Selective sources, not blanket scraping.** LinkedIn / Indeed / Glassdoor forbid automated scraping and submission. Prefer sources meant to be consumed programmatically; for big boards, autofill inside the user's *own* browser via the extension.
3. **Human-in-the-loop by default; full-auto opt-in per channel.** Full-auto only where it's safe on free infra (email, HTTP-POST ATS) and always behind a fit threshold + daily cap + per-company cooldown.
4. **Quality over volume.** Targeted, well-tailored applications, not mass spray.
5. **One unit of work per invocation.** Free serverless functions have short time limits, so fan out — one function call per job — instead of long loops.
6. **Reuse the existing engine.** Fit analysis, keyword optimizer, and tailored-resume rendering already work; the new subsystems consume them.

## 3. Free-tier architecture

```
   CONTROL PLANE (exists)            Next.js 16 on Vercel (Hobby)
                                     - Dashboard, review queue UI, rules config
                                     - Serverless API routes: analyze ONE job,
                                       send ONE email, submit ONE HTTP application
                                              │
   SCHEDULING (pick one/mix) ───────────────► Supabase pg_cron  (flexible, free)
                                              Vercel Cron       (coarse, ~daily)
                                              GitHub Actions cron (frequent + browser)
                                              │
   DISCOVERY + ANALYSIS ────────────► Supabase Edge Function (Deno) OR Vercel route
     (JSON feeds / APIs, no browser)    fetch → dedupe → store → Gemini fit-score
                                              │
   APPLY (per channel) ─────────────► Email:        Vercel route + Resend (free)      [full-auto OK]
                                      HTTP-POST ATS: Vercel route (multipart POST)     [full-auto OK]
                                      Browser form:  GitHub Actions + Playwright        [batched]
                                      Big boards:    Browser extension (user session)   [assist]
                                              │
   DATA + FILES ────────────────────► Supabase Postgres + Supabase Storage (free)
   AI ──────────────────────────────► Google Gemini (existing)
```

**What replaces the VPS worker:**

- **Supabase `pg_cron`** schedules jobs at flexible intervals (every N minutes/hours) and calls an **Edge Function** (Deno) or pings a Vercel route. Free, and its own activity keeps the free project from auto-pausing.
- **GitHub Actions** is the free, ephemeral "browser worker": a scheduled workflow spins up a runner, runs **Playwright headless** to autofill/submit ATS forms, writes results back to Supabase via REST, and exits. No server to maintain. (~2,000 min/month private repos; unlimited on public — batch runs a few times/day to stay in budget.)
- **Browser extension** handles LinkedIn/Indeed-style "Easy Apply": fills the form in the user's own session; the user clicks submit. Zero server, sidesteps bot-detection and ToS scraping issues.

## 4. The pipeline

| Stage | Status | Runs on (free) |
|------|--------|----------------|
| 1. Discover | **new** | Supabase Edge Fn / Vercel route, triggered by pg_cron |
| 2. Filter & analyze | **exists** | Same invocation → existing Gemini fit-analysis |
| 3. Tailor resume + cover letter | **half exists** | Vercel route (Gemini) → PDF to Supabase Storage |
| 4. Apply | **new** | Email/HTTP: Vercel route; Browser: GitHub Actions; Big boards: extension |
| 5. Track | **exists** | Existing status lifecycle, enriched |

## 5. Data model (additions)

- **`search_rules`** — titles, locations, work type, min salary, seniority, must-have / exclude keywords, min fit score, channels enabled, auto-apply on/off, daily cap, company blocklist.
- **`discovered_jobs`** — `id, user_id, source, source_job_id, dedupe_hash, title, company, location, url, raw_payload, apply_channel, status, fit_score, created_at`. Unique `(user_id, dedupe_hash)` prevents re-applying.
- **`applications`** — `id, user_id, discovered_job_id, channel, mode (review|auto), resume_file_id, cover_letter, status, attempts, submitted_at, result (success|failed|needs_human), evidence, error`.
- **`job_run_log`** — per cron/Actions run: source, counts, errors (lightweight observability without a server).
- **`job_credentials`** *(only if logging into boards)* — encrypted at rest; decrypted only inside the Edge Function / Action, never in the browser or logs.
- **Supabase Storage** bucket `application-assets` — generated resume/cover PDFs, RLS-scoped to owner.
- **Structure the profile** (Phase 0): `work_experiences`, `education`, `projects` records so tailored resumes read like real resumes, not reflowed freeform text.

## 6. Channel adapters

Common interface `apply(job, assets, mode) -> ApplyResult`; four implementations, ranked by how well they fit free infra:

- **Email applications** — Vercel route + **Resend free** (~100/day). Attach resume + cover letter. Needs a sending domain with SPF/DKIM. *Full-auto capable.* ✅ Best first channel, no browser.
- **HTTP-POST ATS / official APIs** — some ATS boards accept an application as a plain multipart POST (resume + fields) per job-board token; official job APIs where terms permit. A Vercel serverless route submits directly. *Full-auto where the endpoint is stable.* ✅ No browser.
- **Browser form autofill** — for ATS forms that require a real browser, **GitHub Actions + Playwright** fills and (in review mode) stages or (guarded) submits. *Batched, not instant.* ⚠️
- **Big boards (LinkedIn/Indeed)** — **browser extension** in the user's session; user submits. *Assist only.* ✅ No server.

## 7. Autonomy model & guardrails

- **Modes:** `review` (staged, user approves) default; `auto` opt-in per channel.
- **Auto gates (all must pass):** fit ≥ threshold; under daily cap; company not blocklisted / not applied within cooldown; `dedupe_hash` unseen; channel auto-eligible. Auto is realistically limited to **email + HTTP-POST ATS** on free infra; browser channels stay assist/review.
- **Kill switch & audit:** global pause; every auto-submit stores evidence (payload sent, message id / screenshot) — nothing is a black box.
- **Politeness:** per-source rate limits + backoff on discovery; respect robots/ToS.
- **CAPTCHA / bot wall:** never try to defeat — flip to `needs_human` and surface in the queue.

## 8. Scheduling & free-tier limits (design around these)

- **Cadence:** Vercel Hobby cron is coarse (≈ daily) → use it only for a daily sweep. Use **Supabase pg_cron** for every-few-hours discovery, and **GitHub Actions cron** for browser-apply batches.
- **Function duration:** Vercel Hobby routes are short (tens of seconds) → **one job per invocation**; enqueue and fan out rather than looping over many jobs in one call.
- **GitHub Actions minutes:** ~2,000/month on private repos → run browser applies in scheduled batches, or keep the repo public to lift the cap.
- **Supabase Free:** DB/storage/egress caps + ~7-day idle auto-pause → scheduled cron keeps it awake; watch storage as generated PDFs accumulate (prune old assets).
- **Resend Free:** ~100 emails/day → the natural daily cap for email auto-apply.

## 9. Security, compliance & ethics

- **ToS boundary:** permitted sources server-side; restricted boards only via the in-session extension. No server-side scrapers for sites that forbid it.
- **Credentials:** if stored, encrypt at rest; decrypt only in Edge Function / Action; never to browser or logs. Prefer designs that avoid storing board logins.
- **Honest applications:** keep the product boundary — never fabricate experience; tailoring reorders/emphasizes real skills only.
- **Consent & transparency:** explicit per-channel opt-in for auto mode; visible log of everything sent; easy revoke.
- **PII/logging discipline:** don't log full job text, resume text, full AI responses, or secrets.
- **README boundary:** this reverses the "does not auto-apply" line — update deliberately, framed as user-directed, consented, rate-limited, honest.

## 10. Phased roadmap (free-tier)

- **Phase 0 — Foundations.** Structured profile (work history/education/projects); `discovered_jobs`, `applications`, `search_rules`, `job_run_log` tables; Storage bucket; generate a real tailored resume PDF + cover letter and store it.
- **Phase 1 — Discovery + review queue (no auto-submit).** Supabase Edge Fn + pg_cron pull 1–2 public ATS/API sources → auto-analyze → auto-tailor → "Ready to apply" queue with per-job approve/open. Useful immediately, zero submit risk, fully free.
- **Phase 2 — Email auto-apply.** Resend integration; full-auto behind threshold + daily cap + cooldown. First true auto-apply, no browser.
- **Phase 3 — HTTP-ATS applies + GitHub Actions browser worker + extension.** Direct POST where possible; Playwright-in-Actions for real forms (review-submit); companion extension for big boards.
- **Phase 4 — More sources, guardrails & learning.** Official APIs; cross-source dedupe; response tracking feeding prioritization; per-channel auto-mode reliability scoring.

## 11. Top risks & mitigations

| Risk | Mitigation |
|------|-----------|
| No VPS for long-running/browser work | Supabase Edge Fn + pg_cron (fetch/analyze); GitHub Actions + Playwright (browser); extension (big boards) |
| Free cron cadence is coarse | pg_cron / GitHub Actions for frequency; accept "a few times/day," fine for job hunting |
| Serverless time limits | One job per invocation; fan-out via queue table |
| GitHub Actions minute budget | Batch browser runs; consider public repo for unlimited minutes |
| Account bans on big boards | In-session extension only; no server-side scraping |
| CAPTCHA / bot walls | Detect → `needs_human`; never auto-defeat |
| Supabase free caps + pause | Cron keeps awake; prune stored PDFs; plan Pro only if it outgrows free |
| Resume quality from freeform profile | Structure the profile in Phase 0 |

## 12. Open decisions (confirm before Phase 0)

1. **Repo visibility** — keep `jobfit-copilot` private (~2,000 Action min/month) or make it public (unlimited Action minutes) for the browser worker?
2. **Scheduler mix** — Supabase `pg_cron` as primary (recommended) with GitHub Actions for browser batches?
3. **First ATS/API source** — which board(s) first (depends on where your target companies post)?
4. **Email domain** — do you have/want a domain for outbound applications via Resend?
5. **Resume format** — structured builder vs. upload-your-own base + per-job tweaks?
6. **Extension timing** — build the companion browser extension in Phase 3, or defer big boards entirely at first?

---

*Next step after these decisions: turn Phase 0 + Phase 1 into a concrete task breakdown — schema SQL, the Supabase Edge Function for discovery/analysis, the queue table, and the review-queue UI — and start building against this repo, all on free tiers.*
