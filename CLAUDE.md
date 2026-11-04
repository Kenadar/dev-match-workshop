@AGENTS.md

## Working with Claude in this repo

- `/implement-story US-xx` — plan then implement a story, tests from Gherkin.
- `/check-story US-xx` — verify coverage of AC and scenarios.
- `/unit-tests US-xx` — unit + API tests from the story's scenarios, coverage table.
- `/e2e-tests <journey>` — Playwright spec for a journey across stories.
- `/adr <title>` — record a decision with alternatives.
- The `architecture-reviewer` agent reviews a diff against ADRs and architecture docs.
- Folder rules are in `apps/api/AGENTS.md` and `apps/web/AGENTS.md`; the `CLAUDE.md` next to each imports it, so it loads when you work in that folder.
- A hook blocks edits to the input docs (`.claude/hooks/protect-input-docs.mjs`).
- One story per worktree: `claude -w us-06` (branch `worktree-us-06`, folder `.claude/worktrees/`, gitignored).
