# Step 7 — One context for every assistant

**Goal:** the team's rules reach the model no matter which assistant a student opens: Claude Code, Antigravity (IDE or `agy` CLI), or Copilot.
**Key idea:** context is code. It has one source (`AGENTS.md` + folder `AGENTS.md`), tool-specific files only point to it, and it is reviewed and updated in the same PR as the code it describes. Stale context produces "AI mistakes" that are really our mistakes.

**What to show students:**
- the before/after demo below, live in Antigravity (on `step-06` it sees no project rules at all: it does not read `CLAUDE.md`);
- `CLAUDE.md` is now one import line plus Claude-only notes; Antigravity reads the root `AGENTS.md` with no config at all;
- `.agents/rules/api.md`: Antigravity ignores `AGENTS.md` in subfolders, so a glob rule (`apps/api/**`) includes `apps/api/AGENTS.md`. Same file, different discovery rules per tool;
- `.agents/skills/implement-story/SKILL.md` is three lines that point to `.claude/skills/implement-story/SKILL.md` — one procedure, two tools;
- `/context` (Antigravity CLI; in the IDE: Settings → Projects → Customizations) and `/memory` (Claude): check what the model actually loaded before blaming the model;
- `./workshop/go.sh diff 6 7`, then the fixed `ApiError` line in `apps/api/AGENTS.md`: the old rule taught a constructor that doesn't exist;
- what does *not* transfer: the edit-blocking hook is Claude-only. A guard-rail is not an instruction;
- the bonus: Copilot code review on GitHub PRs reads the same `AGENTS.md` (and `CLAUDE.md`) from the PR branch — step 10 uses it.

Why not Gemini CLI: Google shut down Gemini CLI and Gemini Code Assist for consumer accounts on 2026-06-18; Antigravity replaces both.

## Live demo — the same question twice

Ask on `step-06` (`agy` in the repo root), then on `step-07` in a new `agy` session (rules are read at session start). Check `/context` first.

```text
Where should the logic for approving an application go in this repo, and how exactly must Role.availableSpots change? Name the files and the rule you follow.
```

Expected on `step-06`: generic advice (a controller or route, "decrement the counter", maybe a check-then-update).
Expected on `step-07`: `apps/api/src/services/applications`, a `$transaction` with a conditional `updateMany` + `count` check, ADR-0007, and the race test requirement.

Caveat: on `step-06` the agent can still open `CLAUDE.md` or `docs/adr/` on its own if it decides to explore. Ask in a fresh session and do not let it run tools for long; the point is what it knows *before* it goes looking.

Fallback if the network is down: show the two saved answers in `workshop-2/demo/07-before.md` and `07-after.md` (record them the day before).

## Prompt that produced step-07 (for your own project)

```text
Our repo has AI instructions only for Claude Code (CLAUDE.md, .claude/rules/, .claude/skills/, .claude/agents/).
Teammates also use Antigravity (IDE and agy CLI) and Copilot. Make one source of truth:

1. Move tool-neutral rules from CLAUDE.md to AGENTS.md. CLAUDE.md keeps only `@AGENTS.md` and Claude-specific notes.
2. Move path-scoped rules from .claude/rules/ to AGENTS.md files in the folders they apply to; next to each, a
   CLAUDE.md that only imports it.
3. Antigravity does not load AGENTS.md from subfolders: for each folder AGENTS.md add .agents/rules/<name>.md with
   `trigger: glob`, `globs: "<folder>/**"` and an @[...](path) include of that file, not a copy.
4. For every skill, add .agents/skills/<name>/SKILL.md with the same name and description and a body that tells the
   agent to read and follow the Claude SKILL.md (mapping $ARGUMENTS to the text after the slash command). For every
   agent, add .agents/agents/<name>.md that does the same.
5. While moving each rule, check it against the code it describes. List every rule that no longer matches the code.
Do not change any production code. Show the plan first.
```

**What to pay attention to:** item 5. When we did this, the API rule described `ApiError(status, code, message)` and a `MESSAGES.roleFilled` constant; neither exists. Any assistant following that rule would have written code that does not compile.
