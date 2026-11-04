# apps/api conventions

Applies to everything under `apps/api/`. General rules are in the root `AGENTS.md`.

- One feature = three files: `src/routes/<feature>.ts` (HTTP only), `src/services/<feature>.ts`
  (rules, transactions), `src/serializers/<feature>.ts` (DTOs). Routes never import `prisma`.
- Validate bodies with `validateBody(schema)` from `src/middleware/validate.ts` and a schema from `@devmatch/shared`.
- Throw `new ApiError(code, message, details?)` from `src/lib/errors.ts`; the HTTP status comes from the code
  (`ERROR_CODES` in `packages/shared`). Never `res.status(...).json(...)` an error by hand. `code` and `message`
  come from the error-code dictionary in `docs/architecture/api.md`.
- The ADR-0007 pattern for spot counters, verbatim:

  ```ts
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.role.updateMany({
      where: { id: roleId, availableSpots: { gt: 0 } },
      data: { availableSpots: { decrement: 1 } },
    });
    if (count === 0) throw new ApiError('ROLE_FILLED', 'Cannot approve: all spots for this role are already taken');
    // ...update the application, set role FILLED when the counter reaches 0
  });
  ```

- Owner check: load the entity, compare `ownerId` with `req.user.id`, throw `ApiError('FORBIDDEN', …)`. Do this in the service, not the route.
- Tests live in `apps/api/tests/`, hit the app through `supertest`, use the real SQLite test DB (`resetDb()` in `beforeEach`). No mocks of Prisma or services.
