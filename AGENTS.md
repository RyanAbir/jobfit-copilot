# JobFit Copilot - Agent Instructions

Work one task at a time.

## Before editing

- Run `git status --short`
- Inspect only files relevant to the current task
- Do not scan the whole repo unless necessary
- Do not rewrite unrelated files

## Project stack

- Next.js App Router
- React
- TypeScript
- Supabase Auth + Database + RLS
- AI provider: Gemini only
- pnpm

## Critical rules

- Do not expose API keys
- Do not log full job post text
- Do not log resume text
- Do not log full AI responses
- Do not log secrets
- Keep `--webpack` flags in `package.json`
- Keep Supabase user-scoped access
- Keep screenshot/image extraction removed

## Validation

Run after changes:

```bash
pnpm lint
pnpm build