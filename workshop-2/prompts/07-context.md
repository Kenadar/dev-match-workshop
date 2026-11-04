# Step 7 — One context for every assistant

**Goal:** the team's rules reach the model no matter which assistant a student opens: Claude Code, Gemini CLI / Code Assist, or Copilot.
**Key idea:** context is code. It has one source (`AGENTS.md` + folder `AGENTS.md`), tool-specific files only point to it, and it is reviewed and updated in the same PR as the code it describes. Stale context produces "AI mistakes" that are really our mistakes.

**What to show students:**
- the before/after demo below, live in Gemini (on `main` Gemini sees no project rules at all);
- `CLAUDE.md` is now one import line plus Claude-only notes; `.gemini/settings.json` is three lines;
- `.gemini/commands/implement-story.toml` injects `.claude/skills/implement-story/SKILL.md` — one procedure, two tools;
- `/memory show` (Gemini) and `/memory` (Claude): check what the model actually loaded before blaming the model;
- `./workshop/go.sh diff 6 7`, then the fixed `ApiError` line in `apps/api/AGENTS.md`: the old rule taught a constructor that doesn't exist;
- what does *not* transfer: the edit-blocking hook is Claude-only. A guard-rail is not an instruction.

## Live demo — the same question twice

Ask on `main` (Gemini: `gemini` in the repo root), then on `step-07`, after `/memory reload`.

```text
Where should the logic for approving an application go in this repo, and how exactly must Role.availableSpots change? Name the files and the rule you follow.
```

Expected on `main`: generic advice (a controller or route, "decrement the counter", maybe a check-then-update).
Expected on `step-07`: `apps/api/src/services/applications`, a `$transaction` with a conditional `updateMany` + `count` check, ADR-0007, and the race test requirement.

Fallback if the network is down: show the two saved answers in `workshop-2/demo/07-before.md` and `07-after.md` (record them the day before).

## Prompt that produced step-07 (for your own project)

```text
Our repo has AI instructions only for Claude Code (CLAUDE.md, .claude/rules/, .claude/skills/, .claude/agents/).
Teammates also use Gemini CLI / Gemini Code Assist and Copilot. Make one source of truth:

1. Move tool-neutral rules from CLAUDE.md to AGENTS.md. CLAUDE.md keeps only `@AGENTS.md` and Claude-specific notes.
2. Move path-scoped rules from .claude/rules/ to AGENTS.md files in the folders they apply to; next to each, a
   CLAUDE.md that only imports it.
3. Add .gemini/settings.json so Gemini loads AGENTS.md.
4. For every skill and agent, add a .gemini/commands/<name>.toml that injects the SKILL.md / agent file with @{...}
   instead of copying it, and maps $ARGUMENTS to {{args}}.
5. Add .gemini/styleguide.md for PR review — the only place where duplication is allowed, because the PR bot reads
   no other files; say so at the top of the file.
6. While moving each rule, check it against the code it describes. List every rule that no longer matches the code.
Do not change any production code. Show the plan first.
```

**What to pay attention to:** item 6. When we did this, the API rule described `ApiError(status, code, message)` and a `MESSAGES.roleFilled` constant; neither exists. Any assistant following that rule would have written code that does not compile.
