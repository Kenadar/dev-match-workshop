# middleware/

- `validate.ts` — body validation (exists)
- `auth.ts` — `loadUser` (session cookie → `req.user`), `requireAuth` (401 UNAUTHENTICATED); owner checks stay in services (`apps/api/AGENTS.md`)
