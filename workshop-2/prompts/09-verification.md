# Step 9 — Verification: machine → diff → app

**Goal:** students verify AI output in a fixed order and know what each level catches that the others don't.
**Key idea:** green tests are necessary, not sufficient. Each level of verification caught a *different* real problem while step-08 was being built — none of them were invented for the workshop.

## What each level caught while building step-08 (true story — tell it this way)

| Level | What it caught | Whose mistake |
|---|---|---|
| **Tests (API)** | `logout` test expected 0 sessions, got 1 | the **test**: the factory registers the user, which already opens a session. Logout correctly ends only the current one. Fix the assertion, not the code — and write the decision down (traceability → Assumptions) |
| **Tests (web)** | "Found multiple elements with role button, name Save" | the **test setup**: Testing Library didn't unmount between tests (vitest globals are off in `apps/web`). Needs `cleanup()` |
| **Manual run in the browser** | registration shows "Something went wrong" while all 44 tests are green | the **environment**: the API inherited `PORT=5173` and never listened on 3000. No unit test can see this |
| **Manual run / accessibility tree** | the validation message lived inside `<label>` → it became part of the field's accessible name | the **code**: `getByRole('textbox', { name: 'Telegram username' })` would break exactly when an error is shown. Fixed in `forms/Field.tsx` |
| **e2e** | smoke failed: browser executable missing | the **machine**: `pnpm exec playwright install chromium` |
| **architecture-reviewer** | 3 places where code and `api.md` / `data-model.md` disagreed + an open redirect in `next=` — details in `workshop-2/demo/08-review.md` | the **docs** (drift) and the **code** (redirect) |

🎤 "Five problems before the review. One was in the code. The AI didn't make four of them — and a model that 'fixed' the failing logout test by changing the service would have shipped a real bug."

## Live, in this order (8 min)

1. **Machine:** `pnpm typecheck && pnpm test` → then `/check-story US-01` (Claude or Antigravity). The table maps AC 3 ("shown in project cards to approved members") to US-14 — already noted in traceability.
2. **Eyes — the diff in the IDE**, not in the chat: `git diff step-07 step-08 --stat`, then the Source Control view. 60-second checklist:
   - new files outside the expected folders?
   - **changed tests** — did the agent "fix" a test instead of the code?
   - new dependencies in `package.json` (here: `bcryptjs`, `cookie-parser` — expected, both named in docs?)
   - any user-facing string not from `MESSAGES` / `api.md`?
3. **Hands:** `pnpm dev`, register, onboarding with `""`, `orest lead!`, `orest_lead`.

## The weak test (trap) — show, then mutate

A typical generated test for US-01 sc.3:

```ts
it('rejects invalid telegram', async () => {
  const agent = await signedIn(await createUser());
  const res = await agent.patch('/api/me').send({ telegram: 'orest lead!' });
  expect(res.status).toBe(400);
});
```

Green. Now break the code on purpose — one word in `apps/api/src/middleware/validate.ts`:

```bash
sed -i '' "s/new ApiError('VALIDATION_ERROR'/new ApiError('PROFILE_INCOMPLETE'/" apps/api/src/middleware/validate.ts
```

`PROFILE_INCOMPLETE` is also a 400, so the status stays the same and the contract is broken. Verified on step-08: the weak test stays **green**; `US-01 sc.2` and both `sc.3` tests in `me.test.ts` go **red** (they assert `error.code`). Restore with `git checkout -- apps/api/src/middleware/validate.ts`.

🎤 "A test that cannot fail is not a test. Manual mutation — break the code, watch the test go red — takes a minute and is the cheapest test of your tests."
