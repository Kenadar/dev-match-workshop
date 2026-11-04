# What the architecture-reviewer found on step-08 (real run, before the commit)

Agent: `.claude/agents/architecture-reviewer.md` (Gemini: `/arch-review`). Input: the uncommitted Auth + US-01 diff.
Verdict: no blocking deviations; layering, validation, errors, DTOs, schema all conform. Findings — all fixed in step-08:

| # | Finding | Source it cited | Fix |
|---|---|---|---|
| 1 | `PATCH /me` returns 401 and a test asserts it, but the `api.md` row lists only 400 | api.md §Endpoints; DoD item 2 | row updated |
| 2 | `POST /auth/logout` and `GET /me` return `401 UNAUTHENTICATED`; `api.md` had an empty cell / bare "401" | api.md §Endpoints, §Error-code dictionary | rows updated |
| 3 | Lower-casing emails changes observable behaviour, but was written down only as an assumption, not in the contract | api.md preamble: "change the document first"; data-model.md §User | api.md preamble + data-model `email` row |
| — | *Outside its scope, flagged anyway:* `pathAfterSignIn` accepted any `next` starting with `/`, including `//evil.example` → **open redirect** after login | — | fixed in `queries/auth.ts` + `__tests__/pathAfterSignIn.test.ts` |

## How to use this on stage (step 9 or 10)

🎤 "The agent that generated the code also wrote the tests, and all 44 were green. A second agent with a different job — compare the diff with *our* documents — found three places where the code and the contract disagreed. And one real security bug that no test was looking for, because nobody wrote a scenario for it."

Points to make:
- Findings 1–3 are not bugs in the code: they are **drift between code and documentation**. That drift is what makes the next AI session wrong (step 7: context is code).
- The security finding came from a reviewer who was told *not* to look for it. Reviews find what they find; the fix still needs a test (`pathAfterSignIn.test.ts`) so it stays fixed.
- What the reviewer did **not** find: none of the five problems in `09-verification.md` (wrong logout test, missing cleanup, port, label, browser). Different tools, different blind spots.
