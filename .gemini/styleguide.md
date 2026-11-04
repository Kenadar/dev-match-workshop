# DevMatch review guide (Gemini Code Assist on GitHub)

The PR reviewer cannot read other files, so this repeats the review-relevant rules from `AGENTS.md`,
`apps/api/AGENTS.md` and `.claude/agents/architecture-reviewer.md`. Keep them in sync in the same PR.

Do not comment on formatting or naming. Comment on these, citing the rule:

1. **Spot counters (ADR-0007).** `Role.availableSpots` changes only inside a `prisma.$transaction` in
   `apps/api/src/services/applications*`, via `updateMany({ where: { id, availableSpots: { gt: 0 } }, data: { decrement: 1 } })`
   followed by a check that `count === 1`. A read (`findUnique`) followed by a check and an `update` is a race
   condition — flag it as high severity. US-06 and US-12 must include a parallel (`Promise.all`) race test.
2. **Server-side authorization.** Every mutation checks ownership (`ownerId === req.user.id` → otherwise
   `ApiError('FORBIDDEN', …)`) and status in the service. Hiding a button in the UI is not a check.
3. **No data leaks.** Response DTOs are built field by field in `apps/api/src/serializers`. Spreading a Prisma
   object (`...user`, `...application` with `include`) into a response is a defect: it can leak `passwordHash`.
   The lead's Telegram appears only in the applicant's own APPROVED application.
4. **Validation and errors.** Request bodies are validated with schemas from `packages/shared`; errors are thrown
   as `ApiError(code, message)` with a code listed in `docs/architecture/api.md`. No `res.status(4xx).json(...)`.
5. **Layers (ADR-0009).** Business rules live in `apps/api/src/services`, not in routes or React components.
   Routes never import `prisma`. Components never call `fetch`; they use query hooks.
6. **Tests.** One Gherkin scenario = one test named `US-xx sc.N …`. API tests use the real SQLite test DB through
   `supertest`; mocks of Prisma or services are a defect. A test that asserts only the status code for an error
   scenario is incomplete: it must also assert `error.code` and the DB state.
7. **Scope.** Changes outside user stories US-01..US-14 need an ADR. `docs/architecture/traceability.md` and
   `api.md` are updated in the same PR when coverage or the contract changes.
