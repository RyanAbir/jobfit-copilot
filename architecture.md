# JobFit Copilot — Architecture

## 1. Architecture Overview

JobFit Copilot is a full-stack AI web application built with Next.js, Supabase, PostgreSQL, and an AI provider such as OpenAI or Claude.

The app allows users to create a developer profile, paste a job post, run AI analysis, compare job requirements with their profile, generate a fit score, produce a tailored cover letter, suggest resume keywords, and save the application result.

The MVP follows a simple architecture:

```text
User → Next.js Frontend → Protected Dashboard → Server Actions / API Routes → Supabase PostgreSQL → AI Provider API → Saved Analysis Result
```

## 2. High-Level System Flow

1. User signs in.
2. User creates developer profile.
3. User pastes job post.
4. Frontend sends request to server.
5. Server loads user profile from Supabase.
6. Server sends profile + job post to AI provider.
7. AI returns structured JSON.
8. Server validates AI response.
9. Server saves job, analysis, and generated application.
10. User is redirected to application detail page.

## 3. Core System Components

### 3.1 Frontend

The frontend is built with:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Main responsibilities:

- Render landing page
- Render dashboard
- Handle forms
- Show AI analysis results
- Show saved applications
- Show profile editor
- Show loading and error states
- Provide copy-to-clipboard actions

Frontend should not:

- Call the AI provider directly
- Expose private API keys
- Bypass server-side validation
- Access other users’ data

### 3.2 Backend

The backend is handled through:

- Next.js Server Actions or API Routes

Main responsibilities:

- Validate user authentication
- Load the current user profile
- Validate job post input
- Call AI provider securely
- Parse and validate AI JSON response
- Save records to Supabase
- Fetch dashboard data
- Update application status
- Handle errors safely

Backend should own all sensitive logic.

### 3.3 Database

Database:

- Supabase PostgreSQL

Main tables:

- `profiles`
- `jobs`
- `job_analysis`
- `generated_applications`

Supabase Auth manages users through:

- `auth.users`

Database responsibilities:

- Store user profile
- Store pasted job posts
- Store AI analysis result
- Store generated application email
- Store resume keywords
- Store application status
- Protect data using Row Level Security

### 3.4 Authentication

Authentication is handled by:

- Supabase Auth

Auth responsibilities:

- Sign up
- Sign in
- Sign out
- Session management
- Protected dashboard access
- User ownership of data

Every private database query must be scoped to the authenticated user.

### 3.5 AI Provider

Recommended AI providers:

- OpenAI API
- Claude API

MVP recommendation:

- Use one provider first.

AI responsibilities:

- Analyze job post
- Extract required skills
- Compare job post against profile
- Generate fit score
- Generate cover letter
- Suggest resume keywords
- Detect red flags
- Generate interview questions

AI should return structured JSON only.

## 4. Application Routes

### 4.1 Public Routes

#### `/`

Purpose:

- Landing page
- Product explanation
- CTA to sign up or analyze job

#### `/sign-in`

Purpose:

- User authentication

#### `/sign-up`

Purpose:

- User authentication

### 4.2 Protected Routes

#### `/dashboard`

Purpose:

- Application overview
- Summary cards
- Recent applications

#### `/dashboard/profile`

Purpose:

- Create and update developer profile

#### `/dashboard/analyze`

Purpose:

- Paste job post
- Submit job analysis request

#### `/dashboard/applications/[id]`

Purpose:

- View saved job analysis result
- Copy cover letter
- Copy resume keywords
- Update application status

## 5. Suggested Folder Structure

```text
jobfit-copilot/
├── app/
│   ├── page.tsx
│   ├── sign-in/
│   │   └── page.tsx
│   ├── sign-up/
│   │   └── page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── analyze/
│   │   │   └── page.tsx
│   │   └── applications/
│   │       └── [id]/
│   │           └── page.tsx
│   └── api/
│       └── analyze-job/
│           └── route.ts
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── profile/
│   ├── analyze/
│   └── applications/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── prompts.ts
│   │   ├── analyze-job.ts
│   │   └── validate-ai-response.ts
│   ├── db/
│   │   ├── profiles.ts
│   │   ├── jobs.ts
│   │   └── applications.ts
│   ├── scoring/
│   │   └── fit-score.ts
│   └── utils.ts
├── types/
│   ├── database.ts
│   ├── profile.ts
│   ├── job.ts
│   └── ai.ts
├── docs/
│   ├── MVP.md
│   ├── PRD.md
│   ├── DB_SCHEMA.md
│   ├── AI_PROMPTS.md
│   ├── TASKS.md
│   └── ARCHITECTURE.md
├── public/
├── .env.local
├── README.md
└── package.json
```

## 6. Data Flow: Job Analysis

### 6.1 User Input

User submits:

- `company_name`
- `job_title`
- `source_url`
- `location`
- `work_type`
- `salary_range`
- `job_post_text`

The only required field is:

- `job_post_text`

### 6.2 Server Processing

Server should:

1. Check user session.
2. Validate `job_post_text`.
3. Load current user profile.
4. If profile is missing, return error.
5. Build AI prompt.
6. Call AI provider.
7. Parse JSON.
8. Validate AI response.
9. Save job post.
10. Save analysis.
11. Save generated application.
12. Return application ID.

### 6.3 Database Insert Order

```text
jobs → job_analysis → generated_applications
```

Reason:

- `job_analysis` needs `job_id`.
- `generated_applications` needs `job_id`.
- Keeping them separate makes future improvements easier.

## 7. AI Architecture

### 7.1 MVP AI Flow

The MVP should use one AI call.

```text
Candidate profile + Job metadata + Job post → AI provider → Structured JSON result
```

This single result includes:

- Job extraction
- Profile matching
- Fit score
- Resume keywords
- Cover letter
- Red flags
- Interview questions

This is simpler and faster to build.

### 7.2 Future AI Flow

Later, the system can split AI into multiple smaller tasks:

```text
JD Extraction → Profile Matching → Fit Score Calculation → Cover Letter Generation → Resume Keyword Optimization → Red Flag Detection → Interview Preparation
```

This would improve reliability, testing, and cost control.

### 7.3 AI Response Validation

The backend must validate AI output before saving.

Validation steps:

1. Parse JSON safely.
2. Check required fields.
3. Ensure arrays are arrays.
4. Ensure strings are strings.
5. Clamp `fitScore` between `0` and `100`.
6. Clamp score breakdown values.
7. Fallback missing fields to safe defaults.
8. Store raw AI response for debugging.

Do not blindly trust AI output.

## 8. Fit Score Architecture

Fit score should be explainable.

Suggested scoring model:

| Category | Points |
| --- | ---: |
| Technical Skill Match | 40 |
| Project Relevance | 25 |
| Experience Match | 15 |
| Location/Work Mode Match | 10 |
| Resume Keyword Match | 10 |
| Total | 100 |

Two possible approaches:

### 8.1 AI-Assisted Score

AI returns score and explanation.

Pros:

- Faster to build
- More flexible
- Good for MVP

Cons:

- Less deterministic
- Needs validation

### 8.2 Hybrid Score

AI extracts skills and matched data, then backend calculates score.

Pros:

- More deterministic
- Easier to test
- More credible portfolio architecture

Cons:

- More work

MVP recommendation:

- Start with AI-assisted score.
- Validate and clamp values in backend.
- Later move to hybrid scoring.

## 9. Security Architecture

### 9.1 API Keys

AI provider keys must only exist in server environment variables.

Correct:

```env
OPENAI_API_KEY=
```

Incorrect:

```env
NEXT_PUBLIC_OPENAI_API_KEY=
```

Never expose private AI keys to the browser.

### 9.2 Row Level Security

Every private table must use RLS.

Tables requiring RLS:

- `profiles`
- `jobs`
- `job_analysis`
- `generated_applications`

Ownership rules:

- User can only read their own profile.
- User can only manage their own jobs.
- User can only access analysis linked to their jobs.
- User can only access generated applications linked to their jobs.

### 9.3 Route Protection

Protected routes:

- `/dashboard`
- `/dashboard/profile`
- `/dashboard/analyze`
- `/dashboard/applications/[id]`

Unauthenticated users should be redirected to:

- `/sign-in`

## 10. Privacy Architecture

The app stores sensitive career data.

Sensitive data includes:

- Resume text
- Projects
- Job applications
- Cover letters
- Career links
- Analysis history

Privacy rules:

- Never expose profile data in public pages.
- Never expose application detail pages publicly.
- Never log full resume text unnecessarily.
- Never store AI API keys in client code.
- Allow user data deletion later.
- Keep all user queries scoped to `auth.uid()`.

## 11. Error Handling Architecture

The app should handle these errors:

- Missing profile
- Empty job post
- AI API failure
- Invalid AI JSON
- Database insert failure
- Unauthorized access
- Application not found
- Network failure

Example responses:

- Create your developer profile first before analyzing a job.
- Please paste a job post before running analysis.
- The AI response could not be processed. Please try again.
- You do not have permission to view this application.

## 12. Component Architecture

### 12.1 Dashboard Components

- `DashboardStats`
- `RecentApplicationsTable`
- `ApplicationStatusBadge`
- `EmptyApplicationsState`

### 12.2 Profile Components

- `ProfileForm`
- `SkillsInput`
- `ProjectTextarea`
- `ResumeTextArea`
- `ProfileCompletionCard`

### 12.3 Analyze Components

- `JobPostForm`
- `AnalyzeJobButton`
- `AnalyzeLoadingState`
- `AnalyzeErrorState`

### 12.4 Application Detail Components

- `FitScoreCard`
- `ScoreBreakdown`
- `SkillMatchTable`
- `SkillBadgeGroup`
- `ResumeKeywordCard`
- `CoverLetterCard`
- `RedFlagCard`
- `InterviewQuestionsCard`
- `ApplicationStatusSelect`
- `CopyButton`

## 13. State Management

For MVP, avoid complex state management.

Use:

- React state for forms
- Server Actions or API Routes for mutations
- Supabase queries for persisted data

Do not add Redux or Zustand unless the app becomes significantly more complex.

## 14. Validation Strategy

Use validation at three levels:

### 14.1 Client Validation

- Required job post text
- Valid URLs
- Required profile fields
- Basic length limits

### 14.2 Server Validation

- Authenticated user check
- Ownership check
- Required input validation
- AI response validation
- Database error handling

### 14.3 Database Validation

- Required columns
- Foreign keys
- Status check constraint
- Row Level Security policies

## 15. Deployment Architecture

Recommended deployment:

- Frontend + Backend: Vercel
- Database + Auth: Supabase
- AI Provider: OpenAI or Claude

Production environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

Never commit `.env.local`.

## 16. Performance Considerations

The main slow operation is AI analysis.

Use these UX patterns:

- Loading state while analysis is running
- Clear message: “Analyzing job post...”
- Disable submit button during request
- Handle timeout or failure
- Save results after successful analysis
- Avoid repeated unnecessary AI calls

Future improvements:

- Cache analysis by job post hash
- Add background processing
- Add streaming progress
- Split AI calls by task
- Add retry logic

## 17. MVP Architecture Decision

For MVP, use the simplest reliable architecture:

```text
Next.js App Router + Supabase Auth + Supabase PostgreSQL + Server-side AI call + Structured JSON response + Protected dashboard
```

Avoid:

- Microservices
- Queues
- Browser extension
- Scraping system
- PDF generation
- Payment system
- Complex state management

The goal is to prove the product workflow first.

## 18. Future Architecture Extensions

Possible later improvements:

### 18.1 Resume PDF Service

Add:

- Resume template renderer
- PDF generator
- Resume version table
- File storage

### 18.2 Browser Extension

Add:

- Chrome extension
- Manual selected-text capture
- Send job post to web app
- No auto-submit behavior

### 18.3 Application Timeline

Add:

- `application_events` table
- Status history
- Follow-up reminders
- Interview schedule notes

### 18.4 Multi-AI Provider Support

Add:

- AI provider abstraction
- OpenAI adapter
- Claude adapter
- Fallback model
- Cost tracking

## 19. Architecture Risks

### 19.1 AI Hallucination

Risk:

- AI may invent skills, project details, or false matches.

Mitigation:

- Strong prompt rules
- Backend validation
- Show missing skills clearly
- Add honesty warning
- Use candidate profile as the only source of truth

### 19.2 Data Privacy

Risk:

- Resume and application data are sensitive.

Mitigation:

- RLS
- Protected routes
- Server-only API keys
- No public application routes
- Avoid unnecessary logging

### 19.3 Overbuilding

Risk:

- Adding browser extension, scraper, or PDF too early.

Mitigation:

- Follow MVP scope
- Build core workflow first
- Ship live before advanced features

### 19.4 Low Product Differentiation

Risk:

- The app becomes a generic cover letter generator.

Mitigation:

- Keep fit score
- Add profile matching
- Add red flag detection
- Add resume keyword suggestions
- Add saved application tracking

## 20. Final Architecture Rule

Keep the architecture simple, secure, and explainable.

A strong portfolio project is not only about using AI.

It is about showing that you can design a real product flow with:

- Authentication
- Private user data
- Database relationships
- AI integration
- Validation
- Security
- Dashboard UX
- Ethical boundaries
