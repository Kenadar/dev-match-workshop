# Step 8 — Generation: Auth + US-01 as one vertical slice

**Goal:** the first working path through every layer — shared schema → service → route → serializer → page — driven by the Gherkin scenarios, in small verified steps.
**Key idea:** the plan comes before the code and a human approves it; the tests come before the implementation and fail for the right reason; every step ends with `typecheck` and `test`. The agent does the typing; you do the deciding.

**What to show students:**
- the plan from `/implement-story US-01` (live, ~1 min) — then approve it. Point at what the plan *assumes* (see "Assumptions" in `docs/architecture/traceability.md`);
- the red run: 17 tests, all failing with `expected 404` — red for the right reason (the route doesn't exist), not because of a typo;
- `./workshop/go.sh 8`, then the shape of the result, not every line:
  `services/auth.ts` (rules) · `routes/auth.ts` (HTTP only, four lines per handler) · `serializers/user.ts` (the only shape a user leaves the server in);
- the tool ladder at the bottom: Tab for the `it.each` table of invalid usernames, the agent for the slice.

## Prompt (Claude Code or Gemini CLI — same command)

```text
/implement-story US-01
```

Before the story itself, the plan must include Auth (ADR-0006): US-01 needs a signed-in user, and traceability puts "Auth + US-01" first. If the agent doesn't propose that, say:

```text
US-01 needs identity. Include the Auth row of traceability.md (register, login, logout, GET /me) in the same plan.
Write the API tests first, one per scenario, run them, and show me that they fail for the right reason before implementing.
```

## Order that was used to build step-08

1. Tests first: `apps/api/tests/auth.test.ts`, `me.test.ts`, `helpers/factories.ts` → `pnpm --filter @devmatch/api test` → 17 red with 404.
2. API: `services/auth.ts`, `services/users.ts`, `serializers/user.ts`, `middleware/auth.ts`, `routes/auth.ts`, `routes/me.ts`, mount in `routes/index.ts`, `cookie-parser` + `loadUser` in `app.ts`.
3. Typecheck → tests → 25/26 green (see step 9: the one red test was wrong, not the code).
4. Web: `queries/auth.ts` (hooks), `forms/Field.tsx`, `forms/fieldErrors.ts` (the shared schema on the client), `LoginPage`, `RegisterPage`, `OnboardingPage`, `RequireAuth` guard, `Layout` with Sign out.
5. Component test for US-01 on the page → manual run in the browser → e2e smoke → traceability updated.

6. `architecture-reviewer` on the uncommitted diff → 3 doc-drift findings + an open redirect (`workshop-2/demo/08-review.md`) → fixed.

Result: 50 tests (13 shared + 26 API + 11 web), typecheck clean, smoke e2e green.

## The Tab moment (2 min, live in the IDE)

In `apps/api/tests/me.test.ts`, start typing a table above the sc.3 test:

```ts
it.each(['orest lead!', 'abc'])(
```

Gemini Code Assist / Copilot completes the body from the sc.1 test above it. Point out what it gets wrong (usually: it asserts only the status code) — that is the bridge to step 9.

**What to pay attention to:** the assumptions table in traceability.md. Six decisions were made that no story states — "first sign-in", where "the project panel" is, case of emails, what logout ends. The agent will make these silently unless the procedure forces it to write them down. `/implement-story` does; that is why it exists.
