# DevMatch

A service for assembling student teams: a project lead publishes a project with open roles, a student finds a project by stack and applies in one click.

Requirements are in `docs/`, decisions in `docs/adr/`, architecture in `docs/architecture/`. Read `AGENTS.md` before working with the code — it is the rule set for people and every AI assistant (Claude Code reads it via `CLAUDE.md`, Gemini via `.gemini/settings.json`).

## Running

```bash
pnpm install
cp apps/api/.env.example apps/api/.env && pnpm db:migrate
pnpm dev
```

- web: http://localhost:5173 (proxies `/api` → 3000)
- api: http://localhost:3000/api/health

## Checks

```bash
pnpm typecheck
pnpm test                                   # unit + API + component
pnpm exec playwright install chromium       # once
pnpm test:e2e                               # browser journeys against the dev servers
```

Testing strategy and conventions: `docs/architecture/testing.md`.

## Structure

```
apps/web         React SPA (Vite)
apps/api         Express API + Prisma (SQLite)
packages/shared  zod schemas, status enums, DTO types
e2e/             Playwright journeys
docs/            requirements, analysis, ADRs, architecture
workshop/        workshop materials (prompts, runbook)
```

Production topology (ADR-0008): `pnpm build` builds the web app into `apps/web/dist`, `pnpm start` runs the api, which serves that static bundle and `/api`.
