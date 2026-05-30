# JobFit Copilot — Product Requirements Document

## 1. Product Name

JobFit Copilot

## 2. Product Summary

JobFit Copilot is an AI-powered job application assistant for full-stack developers.

The product helps users paste a job post, analyze the role, compare the job requirements with their developer profile, generate a fit score, identify matched and missing skills, create a tailored application email, and suggest resume keywords.

The product is designed as a manual decision-support tool, not an auto-application bot.

## 3. Product Vision

To help developers apply to jobs more strategically by giving them clear, honest, and actionable insight before they submit an application.

The product should help users answer five important questions:

- Is this job actually a good fit for me?
- Which skills does this job require?
- Which requirements do I already match?
- Which gaps should I be aware of?
- How can I apply with a stronger and more tailored message?

## 4. Target Users

### 4.1 Primary Users

- Junior full-stack developers
- Mid-level full-stack developers
- Bangladeshi developers applying locally or remotely
- Self-taught developers building a portfolio
- Developers applying through LinkedIn, company career pages, email, Upwork, or Contra

### 4.2 Secondary Users

- Coding bootcamp graduates
- Freelance developers
- Developers changing careers into software development
- Developers improving their resume for specific roles

## 5. User Problems

Users often struggle with:

- Understanding whether a job matches their real skills
- Writing tailored cover letters
- Extracting important skills from long job posts
- Knowing which resume keywords matter
- Identifying risky or low-quality job posts
- Avoiding overclaiming skills they do not have
- Tracking jobs they already analyzed or applied to

## 6. Product Goals

The MVP should allow a user to:

- Create and update a developer profile
- Paste a job post
- Analyze the job post using AI
- Extract required and nice-to-have skills
- Compare the job post with the user profile
- Generate a fit score
- Show matched and missing skills
- Generate a tailored application email
- Suggest resume keywords
- Detect job post red flags
- Save analyzed applications
- Track application status

## 7. Non-Goals

The MVP will not include:

- Automatic application submission
- LinkedIn automation
- Mass email sending
- Browser extension
- Job scraping
- Resume PDF generation
- Payment system
- Recruiter dashboard
- Team collaboration
- ATS integration
- Auto resume rewriting
- AI-generated fake experience

These features may be considered later only after the core app is stable.

## 8. Key Product Principle

The product must help users apply better, not apply blindly.

The system should encourage:

- Honest self-presentation
- Manual review before applying
- Clear understanding of job fit
- Skill gap awareness
- Better application quality

The system should avoid:

- Spam behavior
- Fake experience
- Mass application automation
- Misleading resume suggestions
- Uncontrolled job portal actions

## 9. Core User Journey

### 9.1 First-Time User Flow

1. User lands on the homepage.
2. User signs up.
3. User creates a developer profile.
4. User adds skills, projects, links, and resume text.
5. User goes to the job analysis page.
6. User pastes a job post.
7. User clicks **Analyze Job Fit**.
8. AI extracts job requirements.
9. App compares job post with user profile.
10. App shows fit score, matched skills, missing skills, red flags, resume keywords, and application email.
11. User saves the application.
12. User tracks it from the dashboard.

## 10. User Stories

### 10.1 Authentication

As a user, I want to create an account so that my profile and job analyses are saved.

Acceptance criteria:

- User can sign up.
- User can sign in.
- User can sign out.
- User can only access their own data.
- Unauthenticated users cannot access dashboard pages.

### 10.2 Developer Profile

As a user, I want to create a developer profile so that the AI can compare jobs with my actual skills and experience.

Acceptance criteria:

- User can add full name.
- User can add target role.
- User can add location.
- User can add experience level.
- User can add skills.
- User can add project details.
- User can add portfolio, GitHub, and LinkedIn links.
- User can paste resume text.
- User can update profile later.

### 10.3 Job Post Input

As a user, I want to paste a job post so that the app can analyze it.

Acceptance criteria:

- User can paste job post text.
- Job post text is required.
- User can optionally add job title.
- User can optionally add company name.
- User can optionally add source URL.
- User can optionally add work type.
- User can optionally add salary range.
- App validates empty job post input.

### 10.4 Job Description Analyzer

As a user, I want the AI to extract important job requirements so that I can quickly understand the role.

Acceptance criteria:

- AI extracts job title.
- AI extracts company name if available.
- AI extracts required skills.
- AI extracts nice-to-have skills.
- AI extracts responsibilities.
- AI extracts experience level.
- AI extracts work type and location if available.
- AI detects red flags.
- AI returns structured JSON.
- App handles invalid AI response safely.

### 10.5 Profile Matching

As a user, I want to compare the job requirements with my profile so that I can understand where I match and where I do not.

Acceptance criteria:

- App shows matched skills.
- App shows missing skills.
- App shows partially matched skills.
- App shows relevant projects.
- App shows weak areas.
- App does not claim the user has skills not listed in their profile.
- App explains the match result clearly.

### 10.6 Fit Score

As a user, I want to see a fit score so that I can quickly decide whether the job is worth applying to.

Acceptance criteria:

- App generates a score from 0 to 100.
- App shows a match label.
- App explains the score breakdown.
- App uses a consistent scoring model.
- App does not rely only on vague AI judgment.

Score labels:

| Score | Label |
| --- | --- |
| 80–100 | Strong Match |
| 60–79 | Good Match |
| 40–59 | Partial Match |
| 0–39 | Weak Match |

Scoring model:

| Category | Weight |
| --- | ---: |
| Technical Skill Match | 40% |
| Project Relevance | 25% |
| Experience Match | 15% |
| Location/Work Mode Match | 10% |
| Resume Keyword Match | 10% |

### 10.7 Cover Letter / Application Email Generator

As a user, I want to generate a tailored application email so that I can apply more professionally.

Acceptance criteria:

- App generates an email subject.
- App generates a concise application email.
- Email references relevant skills.
- Email references relevant projects.
- Email does not invent fake experience.
- User can copy the generated email.
- User can regenerate the email.

### 10.8 Resume Keyword Suggestions

As a user, I want resume keyword suggestions so that I can manually improve my resume for the job.

Acceptance criteria:

- App suggests relevant keywords.
- Keywords are grouped by category.
- App identifies keywords already present in profile/resume text.
- App identifies missing but relevant keywords.
- App warns users not to add skills they cannot explain.

Keyword categories:

- Frontend
- Backend
- Database
- Authentication
- Payment
- Deployment
- Testing
- Soft skills

### 10.9 Red Flag Detection

As a user, I want the app to warn me about risky job posts so that I avoid wasting time or being exploited.

Acceptance criteria:

- App detects missing salary information.
- App detects vague role descriptions.
- App detects unrealistic skill requirements.
- App detects unpaid or excessive test task risk.
- App detects unclear company information.
- App explains red flags in plain language.

### 10.10 Saved Applications

As a user, I want to save analyzed jobs so that I can track my applications.

Acceptance criteria:

- User can save an analyzed job.
- User can view saved jobs in dashboard.
- User can open application detail page.
- User can update application status.
- User can see created date.

Application statuses:

- Draft
- Applied
- Interview
- Rejected
- Offer
- Archived

## 11. Pages and Routes

### 11.1 Landing Page

Route: `/`

Purpose: Introduce the product and direct users to start analyzing jobs.

Sections:

- Hero
- Problem
- Features
- How it works
- Ethical boundary statement
- Call to action

Primary CTA: **Analyze Your First Job**

### 11.2 Sign In Page

Route: `/sign-in`

Purpose: Allow existing users to access their dashboard.

### 11.3 Sign Up Page

Route: `/sign-up`

Purpose: Allow new users to create an account.

### 11.4 Dashboard Page

Route: `/dashboard`

Purpose: Show application summary and recent saved jobs.

Required sections:

- Total jobs analyzed
- Strong matches
- Draft applications
- Applied jobs
- Recent applications table

### 11.5 Profile Page

Route: `/dashboard/profile`

Purpose: Allow user to create and update developer profile.

Required sections:

- Basic information
- Skills
- Projects
- Experience summary
- Resume text
- External links

### 11.6 New Analysis Page

Route: `/dashboard/analyze`

Purpose: Allow user to paste a job post and run analysis.

Required sections:

- Job metadata fields
- Job post textarea
- Analyze button
- Loading state
- Error state

### 11.7 Application Detail Page

Route: `/dashboard/applications/[id]`

Purpose: Show full analysis result for one saved job.

Required sections:

- Job summary
- Fit score
- Score breakdown
- Required skills
- Matched skills
- Missing skills
- Resume keyword suggestions
- Cover letter/email
- Red flags
- Interview preparation questions
- Status selector

## 12. Data Requirements

The app needs to store:

- User account data
- Developer profile data
- Job post data
- AI analysis result
- Generated application email
- Resume keyword suggestions
- Application status
- Created and updated timestamps

## 13. AI Requirements

The AI system must:

- Return structured JSON.
- Extract job requirements accurately.
- Compare job post with user profile.
- Mark missing skills honestly.
- Generate cover letter/email.
- Suggest resume keywords.
- Detect red flags.
- Avoid fake claims.
- Avoid encouraging spammy behavior.

The AI system must not:

- Invent work experience.
- Claim skills the user did not provide.
- Suggest lying on resumes.
- Generate aggressive spam messages.
- Suggest automatic job application submission.

## 14. Fit Score Requirements

The fit score should be explainable.

The app should calculate or validate the fit score using a weighted model.

Suggested breakdown:

| Category | Weight |
| --- | ---: |
| Technical Skill Match | 40 |
| Project Relevance | 25 |
| Experience Match | 15 |
| Location/Work Mode Match | 10 |
| Resume Keyword Match | 10 |

Total: 100

The UI should display:

- Final score
- Match label
- Breakdown by category
- Explanation of why the score was given

## 15. UI Requirements

The UI should feel:

- Clean
- Professional
- Dashboard-focused
- Fast
- Trustworthy
- Portfolio-ready

Required UI components:

- Navbar
- Sidebar
- Dashboard cards
- Forms
- Textarea
- Fit score card
- Badge groups
- Skill match table
- Red flag warning card
- Resume keyword card
- Cover letter card
- Copy button
- Save button
- Status dropdown
- Loading skeleton
- Empty state
- Error message

## 16. Security Requirements

The app must:

- Protect dashboard routes.
- Restrict data by authenticated user.
- Prevent users from reading other users’ applications.
- Store API keys only in server environment variables.
- Never expose AI API keys to the browser.
- Validate user input.
- Handle AI response errors safely.

## 17. Privacy Requirements

The app may store sensitive career data such as resume text and job applications.

The product should:

- Show users that their data is private.
- Avoid sharing profile data publicly.
- Allow users to edit or delete profile data later.
- Avoid logging full resume text unnecessarily.
- Avoid exposing application data in public routes.

## 18. Error Handling Requirements

The app should handle:

- Empty job post
- Missing user profile
- AI API failure
- Invalid AI JSON response
- Database save failure
- Network errors
- Unauthorized access
- Slow response/loading state

Example user-facing errors:

- Please paste a job post before running analysis.
- Create your developer profile first so the app can compare this job with your skills.
- The AI response could not be processed. Please try again.

## 19. MVP Success Metrics

The MVP is successful if:

- User can complete the full flow from signup to saved application.
- AI analysis produces usable structured output.
- Fit score feels explainable and useful.
- Cover letter output is specific to the job.
- Resume keywords are relevant.
- User can track saved applications.
- The project is strong enough to show in portfolio and LinkedIn.

## 20. Future Roadmap

Potential future features:

- Resume PDF generator
- Multiple resume versions
- Chrome extension
- Manual autofill helper
- LinkedIn job post parser
- Upwork proposal generator
- Contra proposal generator
- Salary analyzer
- Follow-up email generator
- Interview preparation mode
- Company research assistant
- Job scam detector
- ATS-style resume checker
- Allowed job scraping where permitted
- Subscription plan for power users

## 21. MVP Definition of Done

The MVP is done when:

- Auth is working.
- Profile creation is working.
- Job post input is working.
- AI analysis is working.
- Profile matching is working.
- Fit score is displayed.
- Cover letter is generated.
- Resume keywords are suggested.
- Red flags are shown.
- Applications can be saved.
- Dashboard shows saved applications.
- Users can update application status.
- App is deployed live.
- README and screenshots are added.
- Portfolio case study is written.

## 22. Strategic Product Positioning

JobFit Copilot should be positioned as:

> An AI-powered job application assistant that helps full-stack developers analyze job posts, compare requirements with their profile, generate fit scores, create tailored application emails, and improve resume keywords before applying manually.

Short tagline:

> Analyze jobs. Match your profile. Apply smarter.

## 23. Final Product Rule

JobFit Copilot is not an auto-apply bot.

It is a strategic application assistant that helps developers make better application decisions, write better messages, and improve their chances honestly.
