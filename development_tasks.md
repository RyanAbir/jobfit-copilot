# JobFit Copilot — Development Tasks

## 1. Purpose

This file breaks the JobFit Copilot MVP into practical development tasks.

The goal is to build the project step by step without overbuilding.

Core MVP:

- Auth
- Developer Profile
- Job Post Analyzer
- Profile Matcher
- Fit Score
- Cover Letter Generator
- Resume Keyword Suggestions
- Saved Applications
- Dashboard

## 2. Build Rule

Build in this order:

1. Foundation first
2. Database second
3. Auth third
4. Profile fourth
5. AI analysis fifth
6. Dashboard last

Do not start with advanced AI features, browser extension, PDF generation, or scraping.

## Phase 1 — Project Setup

### Goal

Create the base Next.js project and install core dependencies.

### Tasks

- [ ] Create Next.js App Router project
- [ ] Enable TypeScript
- [ ] Add Tailwind CSS
- [ ] Add shadcn/ui
- [ ] Set up basic folder structure
- [ ] Add `.env.local`
- [ ] Add `.gitignore`
- [ ] Add README and docs files
- [ ] Run local dev server
- [ ] Commit initial setup

### Suggested Commands

```bash
npx create-next-app@latest jobfit-copilot
cd jobfit-copilot
npm install
npm run dev
```

### Done When

- App runs locally
- Homepage loads
- Project is committed to Git

## Phase 2 — Supabase Setup

### Goal

Connect the app with Supabase Auth and PostgreSQL.

### Tasks

- [ ] Create Supabase project
- [ ] Copy Supabase URL
- [ ] Copy Supabase anon key
- [ ] Add Supabase environment variables
- [ ] Install Supabase client
- [ ] Create browser client helper
- [ ] Create server client helper
- [ ] Test Supabase connection
- [ ] Commit Supabase setup

### Suggested Package

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Done When

- Supabase client is configured
- App can connect to Supabase
- No secret keys are exposed in client code

## Phase 3 — Database Schema

### Goal

Create the MVP database tables and security policies.

### Tasks

- [ ] Create `profiles` table
- [ ] Create `jobs` table
- [ ] Create `job_analysis` table
- [ ] Create `generated_applications` table
- [ ] Add indexes
- [ ] Add `updated_at` trigger
- [ ] Enable Row Level Security
- [ ] Add RLS policies
- [ ] Test profile insert
- [ ] Test job insert
- [ ] Commit schema notes

### Done When

- Tables exist in Supabase
- RLS is enabled
- Users can access only their own data
- Schema matches `db_schema.md`

## Phase 4 — Authentication

### Goal

Allow users to sign up, sign in, sign out, and access protected dashboard routes.

### Tasks

- [ ] Build sign-up page
- [ ] Build sign-in page
- [ ] Add sign-out action
- [ ] Create protected dashboard layout
- [ ] Redirect unauthenticated users to sign-in
- [ ] Redirect authenticated users to dashboard
- [ ] Show user email/name in dashboard
- [ ] Test auth flow
- [ ] Commit authentication work

### Routes

- `/sign-up`
- `/sign-in`
- `/dashboard`

### Done When

- User can create an account
- User can log in
- User can log out
- Dashboard is protected

## Phase 5 — Dashboard Layout

### Goal

Create the main dashboard structure.

### Tasks

- [ ] Create dashboard layout
- [ ] Add sidebar navigation
- [ ] Add top navbar
- [ ] Add dashboard cards
- [ ] Add empty state for no applications
- [ ] Add responsive layout
- [ ] Commit dashboard layout

### Sidebar Links

- Dashboard
- Analyze Job
- Profile
- Applications

### Done When

- Dashboard layout is clean
- Navigation works
- Empty state is visible

## Phase 6 — Developer Profile

### Goal

Allow users to create and update their developer profile.

### Tasks

- [ ] Create profile form UI
- [ ] Add fields for full name
- [ ] Add target role field
- [ ] Add location field
- [ ] Add experience level field
- [ ] Add skills field
- [ ] Add main tech stack field
- [ ] Add projects textarea
- [ ] Add experience summary textarea
- [ ] Add resume text textarea
- [ ] Add portfolio URL field
- [ ] Add GitHub URL field
- [ ] Add LinkedIn URL field
- [ ] Save profile to Supabase
- [ ] Load existing profile
- [ ] Update existing profile
- [ ] Add form validation
- [ ] Commit profile feature

### Done When

- User can create profile
- User can edit profile
- Profile data persists
- Profile belongs only to current user

## Phase 7 — Job Post Input

### Goal

Allow users to paste a job post for analysis.

### Tasks

- [ ] Create `/dashboard/analyze` page
- [ ] Add company name field
- [ ] Add job title field
- [ ] Add source URL field
- [ ] Add location field
- [ ] Add work type select
- [ ] Add salary range field
- [ ] Add job post textarea
- [ ] Validate required job post text
- [ ] Show error if profile is missing
- [ ] Add submit button
- [ ] Commit job input form

### Done When

- User can paste job post
- Empty post is blocked
- User is guided to create profile first

## Phase 8 — AI Integration

### Goal

Send profile and job post to AI and receive structured JSON.

### Tasks

- [ ] Add AI provider SDK
- [ ] Create AI server function
- [ ] Add system prompt from `ai_prompts.md`
- [ ] Add user prompt template
- [ ] Send candidate profile and job post
- [ ] Request valid JSON output
- [ ] Parse JSON safely
- [ ] Validate response shape
- [ ] Clamp score values
- [ ] Handle AI errors
- [ ] Store raw AI response
- [ ] Commit AI integration

### Suggested Package

```bash
npm install openai
```

### Environment Variable

```env
OPENAI_API_KEY=
```

### Done When

- App can call AI from server only
- AI API key is never exposed
- AI returns structured job analysis
- Invalid AI response is handled safely

## Phase 9 — Save Job Analysis

### Goal

Save the job post, analysis, and generated application.

### Tasks

- [ ] Insert job into `jobs`
- [ ] Insert analysis into `job_analysis`
- [ ] Insert generated email into `generated_applications`
- [ ] Save resume keywords
- [ ] Save interview questions
- [ ] Save red flags
- [ ] Redirect to application detail page
- [ ] Handle database errors
- [ ] Commit save analysis flow

### Insert Order

```text
jobs → job_analysis → generated_applications
```

### Done When

- Analysis result is saved
- User is redirected to saved application detail page
- Data belongs only to logged-in user

## Phase 10 — Application Detail Page

### Goal

Show full saved analysis for a job.

### Tasks

- [ ] Create `/dashboard/applications/[id]`
- [ ] Fetch job data
- [ ] Fetch analysis data
- [ ] Fetch generated application data
- [ ] Show job summary
- [ ] Show fit score
- [ ] Show score breakdown
- [ ] Show required skills
- [ ] Show matched skills
- [ ] Show partially matched skills
- [ ] Show missing skills
- [ ] Show resume keywords
- [ ] Show cover letter/email
- [ ] Show red flags
- [ ] Show interview questions
- [ ] Add copy button for email
- [ ] Add copy button for keywords
- [ ] Add loading state
- [ ] Add not-found state
- [ ] Commit detail page

### Done When

- Saved application detail is readable
- User can copy email and keywords
- Unauthorized data cannot be accessed

## Phase 11 — Applications Dashboard

### Goal

Show saved analyzed jobs in dashboard.

### Tasks

- [ ] Fetch recent applications
- [ ] Show total jobs analyzed
- [ ] Show strong match count
- [ ] Show draft count
- [ ] Show applied count
- [ ] Add applications table
- [ ] Add fit score column
- [ ] Add match label column
- [ ] Add status column
- [ ] Add date column
- [ ] Link rows to detail page
- [ ] Add empty state
- [ ] Commit dashboard application list

### Done When

- Dashboard shows application summary
- Saved jobs are visible
- User can open each saved analysis

## Phase 12 — Application Status Update

### Goal

Allow user to track application progress.

### Tasks

- [ ] Add status dropdown
- [ ] Support statuses: `Draft`, `Applied`, `Interview`, `Rejected`, `Offer`, `Archived`
- [ ] Update status in Supabase
- [ ] Show optimistic loading or saving state
- [ ] Handle update errors
- [ ] Commit status update feature

### Done When

- User can update application status
- Status persists after refresh

## Phase 13 — UX Polish

### Goal

Make the app feel professional and portfolio-ready.

### Tasks

- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add error states
- [ ] Add copy-to-clipboard feedback
- [ ] Add badge styling
- [ ] Add score color/label styling
- [ ] Improve mobile responsiveness
- [ ] Improve form spacing
- [ ] Add homepage CTA
- [ ] Commit UX polish

### Done When

- App feels clean and usable
- No major broken layout
- User flow is understandable

## Phase 14 — Testing and Quality

### Goal

Check the main flows before deployment.

### Tasks

- [ ] Test sign-up
- [ ] Test sign-in
- [ ] Test sign-out
- [ ] Test profile creation
- [ ] Test profile update
- [ ] Test job analysis
- [ ] Test saved application detail
- [ ] Test status update
- [ ] Test empty job post validation
- [ ] Test missing profile flow
- [ ] Test RLS protection
- [ ] Test mobile layout
- [ ] Run lint
- [ ] Run build
- [ ] Commit final fixes

### Suggested Commands

```bash
npm run lint
npm run build
```

### Done When

- Main user flow works
- Build passes
- No obvious security issue
- App is ready for deployment

## Phase 15 — Deployment

### Goal

Deploy the app live.

### Tasks

- [ ] Push code to GitHub
- [ ] Create Vercel project
- [ ] Add environment variables to Vercel
- [ ] Deploy app
- [ ] Test production sign-up
- [ ] Test production job analysis
- [ ] Test production dashboard
- [ ] Update README with live link
- [ ] Commit deployment notes

### Done When

- App is live
- README has live demo link
- Portfolio can link to the project

## Phase 16 — Portfolio Documentation

### Goal

Prepare the project for job applications and LinkedIn.

### Tasks

- [ ] Add screenshots
- [ ] Add demo GIF or short video
- [ ] Write portfolio case study
- [ ] Add architecture notes
- [ ] Add security notes
- [ ] Add AI prompt design notes
- [ ] Add future improvements
- [ ] Create LinkedIn post
- [ ] Add project to portfolio website

### Suggested Docs

- `PORTFOLIO_CASE_STUDY.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `FUTURE_IMPROVEMENTS.md`

### Done When

- Project is presentable
- GitHub README is strong
- Portfolio case study is ready
- LinkedIn post can be published

## Final MVP Completion Checklist

The MVP is complete when:

- [ ] User can sign up
- [ ] User can sign in
- [ ] User can sign out
- [ ] User can create profile
- [ ] User can update profile
- [ ] User can paste job post
- [ ] AI can analyze job post
- [ ] App can show fit score
- [ ] App can show matched skills
- [ ] App can show missing skills
- [ ] App can show resume keywords
- [ ] App can show generated cover letter
- [ ] App can show red flags
- [ ] User can save application
- [ ] User can view saved applications
- [ ] User can update application status
- [ ] Dashboard works
- [ ] RLS policies protect user data
- [ ] App builds successfully
- [ ] App is deployed
- [ ] README is updated
- [ ] Portfolio case study is written

## Development Discipline

Use small commits.

Recommended commit style:

```text
chore: initialize next app
feat: add supabase client
feat: add auth pages
feat: add profile form
feat: add job analysis form
feat: integrate ai analysis
feat: save generated application
feat: add application detail page
feat: add dashboard summaries
fix: handle ai response validation
docs: add project documentation
```

Do not make one huge commit.

## Anti-Overbuilding Rule

Do not build these before MVP is live:

- Browser extension
- Job scraper
- Auto apply
- PDF resume generator
- Payment system
- Recruiter dashboard
- Multiple resume versions
- Company research agent
- Advanced analytics

First prove the core workflow.
