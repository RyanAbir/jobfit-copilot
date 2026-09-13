# JobFit Copilot Case Study

## 1. Project Title
**JobFit Copilot** - AI-powered job fit analysis assistant for developers.

## 2. Live Demo Link
- https://jobfit-copilot-sigma.vercel.app

## 3. GitHub Link
- https://github.com/RyanAbir/jobfit-copilot

## 4. Problem
Developers often spend significant time reading long job descriptions, estimating whether they are a good fit, and writing generic application drafts. This process is slow, inconsistent, and can lead to low-quality applications.

## 5. Solution
JobFit Copilot streamlines the workflow by combining structured profile data, job post extraction, and Gemini-based analysis to produce:
- A transparent fit score
- Clear matched vs. missing skills
- Resume keyword suggestions with an interactive optimizer
- A concise application email draft
- A print-ready resume tailored to each role

The product emphasizes honest recommendations instead of over-optimistic AI output.

## 6. Target Users
- Junior to mid-level developers applying to multiple roles
- Career switchers who need quick fit checks
- Developers who want a structured application workflow with saved progress

## 7. Key Features
- Supabase authentication (sign up/sign in/sign out)
- Developer profile management
- Job detail extraction from pasted text or public job URL
- Gemini-powered fit analysis with structured JSON output
- Skills coverage breakdown (matched, partial, missing)
- Resume keyword suggestions grouped by category
- Interactive keyword optimizer: live ATS coverage %, priority flags for required/missing skills, one-click copy of the gap
- Generated application email draft
- Saved applications with status tracking
- Dashboard metrics (total analyzed, strong matches, draft, applied)
- Analytics & Insights: jobs analyzed over time, fit-score distribution, application-status breakdown, and top recurring missing skills
- PDF resume export from the developer profile, plus a per-job tailored resume that leads with matched skills and folds in recommended keywords

## 8. Tech Stack
- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions
- **Database/Auth:** Supabase (PostgreSQL + Auth + RLS)
- **AI:** Google Gemini (`@google/genai`)
- **Tooling:** pnpm, ESLint

## 9. Architecture Summary
```text
User -> Next.js App Router UI -> Server Actions -> Supabase (Auth + Postgres + RLS)
                                         |
                                         -> Gemini API (text extraction + analysis)
```

All sensitive operations (AI calls, service-role DB operations) are handled server-side. The analytics, keyword optimizer, and resume features are built on the existing tables and require no additional schema.

## 10. AI Workflow
1. User pastes job text or submits a public job URL.
2. For URL mode, the app fetches readable text from the target page.
3. Gemini extracts normalized job details into structured JSON.
4. User reviews/edits extracted fields.
5. Gemini runs final fit analysis against profile + job context.
6. Server validates, normalizes, and stores outputs in Supabase.
7. UI displays score, skills, red flags, keywords, and generated email, and feeds the keyword optimizer, analytics, and tailored resume.

## 11. Database / Supabase Summary
Core tables:
- `profiles`
- `jobs`
- `job_analysis`
- `generated_applications`

Design highlights:
- Row Level Security protects user-owned data.
- Analysis workflow persists both job input and derived AI outputs.
- Status lifecycle supports draft-to-applied tracking.
- Later features (analytics, optimizer, resumes) reuse this data without new tables.

## 12. Security & Privacy Notes
- API keys are server-side only.
- `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser.
- RLS limits access to user-owned records.
- Safe diagnostics avoid logging full job posts, resume text, full AI responses, or secrets.
- The app does **not** auto-apply to jobs.

## 13. Biggest Technical Challenges
- **Provider reliability:** simplifying from multi-provider fallbacks to Gemini-only improved architecture clarity.
- **Structured output consistency:** required tolerant JSON parsing and repair fallback for malformed AI responses.
- **Overload/quota handling:** needed explicit user-facing handling for rate limits and temporary busy states.
- **Token/response size:** trimming and output limits were important to keep analysis reliable under load.
- **Zero-dependency charts and PDF:** analytics and resume export were built with inline CSS/SVG and browser print-to-PDF to avoid added dependencies and keep the deploy lightweight.

## 14. What I Learned
- Reliability improves when AI tasks are constrained with strict schemas and bounded output sizes.
- Clear failure-mode UX (quota vs temporary busy vs generic) is critical for trust.
- Server-side validation and normalization are essential even when models are instructed to be strict.
- Product boundaries (no auto-apply, honest mismatch reporting) are as important as model quality.
- Reusing existing data for new views (insights, optimizer, resumes) ships features faster than adding schema.

## 15. Future Improvements
- Server-side PDF rendering for pixel-consistent resume exports
- Better keyword optimization and editing tools
- Longer-range analytics/history timeline
- Browser extension or manual autofill helper
- Additional UX polish for loading, retry, and empty states
- Broader QA coverage and observability dashboards
