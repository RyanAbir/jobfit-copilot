# JobFit Copilot — Database Schema

## 1. Database Overview

JobFit Copilot uses a relational database to store user profiles, pasted job posts, AI job analysis results, generated application emails, resume keyword suggestions, and application tracking statuses.

Recommended database:

- Supabase PostgreSQL

The schema is designed for:

- Authenticated users
- Private user data
- Saved developer profiles
- Saved job posts
- AI-generated analysis
- Application tracking
- Future resume and PDF features

## 2. Core Tables

The MVP database should include these main tables:

- `profiles`
- `jobs`
- `job_analysis`
- `generated_applications`

Supabase Auth already manages user accounts in:

- `auth.users`

The app does not need a separate custom `users` table for the MVP unless extra user metadata is required.

## 3. Table Relationship Overview

```text
auth.users
   |
   | one-to-one
   v
profiles
   |
   | one-to-many
   v
jobs
   |
   | one-to-one
   v
job_analysis
   |
   | one-to-one
   v
generated_applications
```

Meaning:

- One user has one developer profile.
- One user can save many jobs.
- One job has one AI analysis.
- One job has one generated application.

## 4. Profiles Table

### 4.1 Purpose

Stores the developer profile used for job matching.

Each authenticated user should have one profile.

### 4.2 SQL

```sql
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
```

### 4.3 Field Notes

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Links profile to Supabase auth user |
| `full_name` | `text` | User’s display name |
| `target_role` | `text` | Example: Full-Stack Developer |
| `location` | `text` | Example: Bangladesh / Remote |
| `experience_level` | `text` | Example: Junior, Mid-level |
| `skills` | `text[]` | User skills |
| `main_tech_stack` | `text[]` | Main technologies |
| `projects` | `text` | Project descriptions |
| `experience_summary` | `text` | Career summary |
| `resume_text` | `text` | Pasted resume text |
| `portfolio_url` | `text` | Portfolio link |
| `github_url` | `text` | GitHub link |
| `linkedin_url` | `text` | LinkedIn link |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

## 5. Jobs Table

### 5.1 Purpose

Stores each job post pasted by the user.

### 5.2 SQL

```sql
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
```

### 5.3 Field Notes

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Owner of the job post |
| `company_name` | `text` | Company name if available |
| `job_title` | `text` | Job title if available |
| `source_url` | `text` | LinkedIn, company page, Upwork, etc. |
| `location` | `text` | Job location |
| `work_type` | `text` | Remote, Hybrid, On-site |
| `salary_range` | `text` | Optional salary info |
| `job_post_text` | `text` | Full pasted job post |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

## 6. Job Analysis Table

### 6.1 Purpose

Stores AI analysis result for a job post.

This table should contain structured extracted data and matching results.

### 6.2 SQL

```sql
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
  updated_at timestamptz not null default now()
);
```

### 6.3 Field Notes

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `job_id` | `uuid` | Related job |
| `fit_score` | `integer` | Final score from 0 to 100 |
| `match_label` | `text` | Strong Match, Good Match, Partial Match, Weak Match |
| `technical_skill_score` | `integer` | Score out of 40 |
| `project_relevance_score` | `integer` | Score out of 25 |
| `experience_match_score` | `integer` | Score out of 15 |
| `location_match_score` | `integer` | Score out of 10 |
| `resume_keyword_score` | `integer` | Score out of 10 |
| `required_skills` | `text[]` | Required job skills |
| `nice_to_have_skills` | `text[]` | Optional job skills |
| `matched_skills` | `text[]` | Skills user already has |
| `partially_matched_skills` | `text[]` | Skills user partially matches |
| `missing_skills` | `text[]` | Skills user lacks |
| `responsibilities` | `text[]` | Extracted responsibilities |
| `tools_mentioned` | `text[]` | Tools and technologies mentioned |
| `soft_skills` | `text[]` | Communication, teamwork, ownership, etc. |
| `experience_level` | `text` | Extracted experience level |
| `extracted_location` | `text` | Extracted job location |
| `extracted_work_type` | `text` | Remote, Hybrid, On-site |
| `red_flags` | `text[]` | Job post warnings |
| `summary` | `text` | AI-generated summary |
| `recommendation` | `text` | Apply / maybe / skip recommendation |
| `raw_ai_response` | `jsonb` | Full AI response for debugging or future use |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

## 7. Generated Applications Table

### 7.1 Purpose

Stores the generated application email, resume keywords, interview questions, and application status.

### 7.2 SQL

```sql
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
```

### 7.3 Field Notes

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `job_id` | `uuid` | Related job |
| `email_subject` | `text` | Generated email subject |
| `cover_letter` | `text` | Generated application email |
| `resume_keywords` | `text[]` | Suggested resume keywords |
| `interview_questions` | `text[]` | Suggested interview prep questions |
| `status` | `text` | Application status |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

## 8. Indexes

Indexes improve dashboard and query performance.

```sql
create index jobs_user_id_idx on public.jobs(user_id);
create index jobs_created_at_idx on public.jobs(created_at desc);
create index job_analysis_job_id_idx on public.job_analysis(job_id);
create index generated_applications_job_id_idx on public.generated_applications(job_id);
create index generated_applications_status_idx on public.generated_applications(status);
```

## 9. Updated At Trigger

Supabase/PostgreSQL does not automatically update `updated_at`.

Create a reusable trigger function:

```sql
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

Attach the trigger to each table:

```sql
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
```

## 10. Row Level Security

Because this app stores private career data, Row Level Security is required.

Enable RLS:

```sql
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_analysis enable row level security;
alter table public.generated_applications enable row level security;
```

## 11. RLS Policies

### 11.1 Profiles Policies

Users can only manage their own profile.

```sql
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
```

### 11.2 Jobs Policies

Users can only manage their own jobs.

```sql
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
```

### 11.3 Job Analysis Policies

`job_analysis` does not directly store `user_id`, so access must be checked through the related `jobs` table.

```sql
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
```

### 11.4 Generated Applications Policies

`generated_applications` also checks ownership through the related `jobs` table.

```sql
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
```

## 12. Optional Dashboard View

This view can make dashboard queries easier.

```sql
create or replace view public.application_dashboard_view as
select
  jobs.id as job_id,
  jobs.user_id,
  jobs.company_name,
  jobs.job_title,
  jobs.location,
  jobs.work_type,
  jobs.created_at,
  job_analysis.fit_score,
  job_analysis.match_label,
  job_analysis.red_flags,
  generated_applications.status
from public.jobs
left join public.job_analysis
  on job_analysis.job_id = jobs.id
left join public.generated_applications
  on generated_applications.job_id = jobs.id;
```

Important: if using a view with Supabase and RLS, test carefully. For MVP, direct queries with joins may be simpler than relying on views.

## 13. Example Insert Flow

When a user analyzes a job, the backend should insert records in this order:

1. Insert into `jobs`.
2. Run AI analysis.
3. Insert into `job_analysis`.
4. Insert into `generated_applications`.

Pseudo flow:

```text
Create job row → Send job post + profile to AI → Validate AI JSON → Save analysis result → Save generated email and resume keywords → Redirect user to application detail page
```

## 14. Example Query: Dashboard Applications

```sql
select
  jobs.id,
  jobs.company_name,
  jobs.job_title,
  jobs.location,
  jobs.work_type,
  jobs.created_at,
  job_analysis.fit_score,
  job_analysis.match_label,
  generated_applications.status
from public.jobs
left join public.job_analysis
  on job_analysis.job_id = jobs.id
left join public.generated_applications
  on generated_applications.job_id = jobs.id
where jobs.user_id = auth.uid()
order by jobs.created_at desc;
```

## 15. Example Query: Application Detail

```sql
select
  jobs.*,
  job_analysis.*,
  generated_applications.*
from public.jobs
left join public.job_analysis
  on job_analysis.job_id = jobs.id
left join public.generated_applications
  on generated_applications.job_id = jobs.id
where jobs.id = :job_id
  and jobs.user_id = auth.uid()
limit 1;
```

## 16. Seed Data Example

Use this only for local development.

```sql
insert into public.profiles (
  user_id,
  full_name,
  target_role,
  location,
  experience_level,
  skills,
  main_tech_stack,
  projects,
  experience_summary,
  portfolio_url,
  github_url,
  linkedin_url,
  resume_text
) values (
  auth.uid(),
  'Ryan Abir',
  'Full-Stack Developer',
  'Bangladesh / Remote',
  'Junior to Mid-level',
  array['React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'Firebase', 'Stripe', 'Prisma'],
  array['Next.js', 'React', 'Node.js', 'Supabase', 'Stripe'],
  'SaaS Billing Starter, SecureNotes, Family Finance Management App',
  'Full-stack developer focused on building modern web applications with authentication, dashboards, APIs, and payment workflows.',
  'https://www.ryanabir.space',
  'https://github.com/RyanAbir',
  'https://www.linkedin.com/in/ryanabir',
  'Full-stack developer with experience building Next.js, React, Node.js, Firebase, Prisma, and Stripe-based applications.'
);
```

Note: `auth.uid()` works inside authenticated Supabase requests. It may not work directly in the SQL editor unless there is an authenticated context.

## 17. Schema Design Decision

The schema intentionally separates:

- Raw job post data: `jobs`
- AI analysis data: `job_analysis`
- Application output data: `generated_applications`

This separation keeps the system clean.

It allows the app to later regenerate cover letters, improve analysis logic, add resume versions, or support multiple generated email versions without breaking the core job record.

## 18. Future Schema Extensions

Possible future tables:

### 18.1 `resume_versions`

```sql
create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  resume_content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 18.2 `generated_documents`

```sql
create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  document_type text not null,
  content text not null,
  file_url text,
  created_at timestamptz not null default now()
);
```

### 18.3 `application_events`

```sql
create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  event_type text not null,
  note text,
  created_at timestamptz not null default now()
);
```

This can support timeline tracking later:

- Draft created
- Applied
- Follow-up sent
- Interview scheduled
- Rejected
- Offer received

## 19. MVP Database Rule

Keep the MVP database simple.

Do not add too many tables early.

Start with:

- `profiles`
- `jobs`
- `job_analysis`
- `generated_applications`

Only add more tables when the product needs them.
