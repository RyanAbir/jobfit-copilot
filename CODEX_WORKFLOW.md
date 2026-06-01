# Codex Workflow

## Prompt sizes

### Small
Use for 1–2 files. Inspect exact files only.

### Medium
Use for 3–6 files. Inspect exact route/action/component/helper files.

### Large
Use only for architecture, database, auth, or provider changes.

## Default rules

- Follow AGENTS.md
- Do not scan the whole repo unless necessary
- Do not change unrelated files
- Keep `--webpack` flags in package.json
- Do not expose or log secrets
- Run:
  - pnpm lint
  - pnpm build
  - pnpm check:secrets

## Return format

1. Files changed
2. What changed
3. Validation result
4. Commit hash
5. Manual test steps