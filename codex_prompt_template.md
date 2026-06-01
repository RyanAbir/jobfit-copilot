# Codex Prompt Template

Task:
[Write one clear task only]

Files to inspect:
- [specific file path]
- [specific file path]

Rules:
- Follow AGENTS.md
- Do not scan the whole repo unless necessary
- Do not change unrelated files
- Do not remove `--webpack` flags from package.json
- Do not expose or log secrets
- Keep user-scoped Supabase access

Validation:
- pnpm lint
- pnpm build

Commit:
- git add .
- git commit -m "[type]: [short message]"

Return:
1. Files changed
2. What changed
3. Validation result
4. Commit hash
5. Manual test steps