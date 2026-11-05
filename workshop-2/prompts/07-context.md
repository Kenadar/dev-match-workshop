# Step 7 — One context for every assistant

**Goal:** the team's rules reach the model no matter which assistant a student opens. We show it in Claude Code; the rules live in `AGENTS.md`, an open format that Copilot, Codex, Cursor, Antigravity and others read too.
**Key idea:** context is code. It has one source (`AGENTS.md` + folder `AGENTS.md`), tool-specific files only point to it, and it is reviewed and updated in the same PR as the code it describes. Stale context produces "AI mistakes" that are really our mistakes.

**What to show students:**
- `./workshop/go.sh diff 6 7`: rules moved from Claude-only files to `AGENTS.md`;
- `CLAUDE.md` is now one import line plus Claude-only notes; `apps/api/CLAUDE.md` imports `apps/api/AGENTS.md`;
- `.agents/` for 20 seconds: thin pointers for tools that look for rules elsewhere — not copies. A skill's `SKILL.md` is plain Markdown any assistant can follow;
- `/context` in Claude → "Memory Files" lists `CLAUDE.md` and `AGENTS.md` (verified): check what the model actually loaded before blaming the model;
- the fixed `ApiError` line in `apps/api/AGENTS.md`: the old rule taught a constructor that doesn't exist;
- what does *not* transfer: the edit-blocking hook is Claude-only. A guard-rail is not an instruction;
- the proof that other tools read it comes in step 10: Copilot code review on PR #1 lists `AGENTS.md` in `copilot_code_review_sources`.

## Live demo — what Claude sees

On `step-07`: `claude` → `/context` → "Memory Files". Then:

```text
Where should the logic for approving an application go in this repo, and how exactly must Role.availableSpots change? Name the files and the rule you follow.
```

Expected: `apps/api/src/services/applications`, a `$transaction` with a conditional `updateMany` + `count` check, ADR-0007, and the race test requirement.
"Before" is the web-chat answer from the intro (`workshop-2/antipattern/webchat-answer.md`): a new endpoint, logic in the route, a mocked Prisma — the same class of model without the project's context.

For students on another assistant: open `step-07` in it, ask the same question, and find where it shows the files it loaded.

Fallback if the network is down: `workshop-2/demo/07-after.md` (record it the day before).

## Prompt that produced step-07 (for your own project)

```text
Our repo has AI instructions only for Claude Code (CLAUDE.md, .claude/rules/, .claude/skills/, .claude/agents/).
Teammates use other assistants too, and Copilot reviews our PRs. Make one source of truth:

1. Move tool-neutral rules from CLAUDE.md to AGENTS.md. CLAUDE.md keeps only `@AGENTS.md` and Claude-specific notes.
2. Move path-scoped rules from .claude/rules/ to AGENTS.md files in the folders they apply to; next to each, a
   CLAUDE.md that only imports it.
3. For a tool that looks for rules or procedures somewhere else, add thin files there that point to AGENTS.md /
   the SKILL.md files instead of copying them.
4. While moving each rule, check it against the code it describes. List every rule that no longer matches the code.
Do not change any production code. Show the plan first.
```

**What to pay attention to:** item 4. When we did this, the API rule described `ApiError(status, code, message)` and a `MESSAGES.roleFilled` constant; neither exists. Any assistant following that rule would have written code that does not compile.
