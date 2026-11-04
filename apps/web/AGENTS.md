# apps/web conventions

Applies to everything under `apps/web/`. General rules are in the root `AGENTS.md`.

- Pages in `src/pages/`, one file per route from `docs/architecture/overview.md`; data access in `src/queries/` (TanStack Query hooks); `src/api/client.ts` is the only place that calls `fetch`.
- Forms validate with the zod schema from `packages/shared` and show `MESSAGES.*` texts; never retype an error string in a component.
- Show `error.message` from the API as is; branch on `error.code` only when the UI must react (e.g. `PROFILE_INCOMPLETE` → redirect to `/onboarding`).
- Hide buttons the user cannot use, but never rely on that: the server enforces owner and status checks.
- Mark up with semantic elements and labels so Playwright can locate by role and name (`getByRole('button', { name: 'Approve' })`). No test ids unless there is no accessible alternative.
- Styling with CSS Modules; no UI kit without an ADR (ADR-0003).
