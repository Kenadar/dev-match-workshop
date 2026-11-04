# DevMatch

<!-- The single source of project rules for every AI assistant in this repo (Claude Code, Gemini, Copilot, ...).
     Tool-specific files only import or point to this one: CLAUDE.md, .gemini/settings.json.
     Folder rules live next to the code: apps/api/AGENTS.md, apps/web/AGENTS.md. -->

Team-matching service for student and hackathon projects. Project leads publish a project
card with open roles; students browse the public catalog, filter by stack, apply to a role,
and get the lead's Telegram once approved. MVP scope is user stories US-01..US-14.

## Stack (see docs/adr/)

pnpm monorepo. Node 20, TypeScript everywhere, ESM.

- `apps/web` — React 18 + Vite, React Router, TanStack Query, CSS Modules (ADR-0003)
- `apps/api` — Express 5, zod validation, Prisma + SQLite (ADR-0004, ADR-0005)
- `packages/shared` — zod schemas, status enums, DTO types shared by web and api (ADR-0002)

## Commands

```
pnpm install            # once
pnpm db:migrate         # apply migrations (needs apps/api/.env, see .env.example)
pnpm dev                # web :5173 (proxies /api) + api :3000
pnpm typecheck          # all packages
pnpm test               # vitest: unit + API (SQLite test DB) + component, all packages
pnpm test:e2e           # Playwright journeys (starts api + web; needs apps/api/.env + migrated dev.db)
```

## Documentation map — read before you change things

| Task | Read first |
|---|---|
| Implement a user story | the story in `docs/US-*.md`, its row in `docs/architecture/traceability.md`, `docs/architecture/api.md`, `docs/architecture/domain-model.md` |
| Change the DB schema | `docs/architecture/data-model.md`, ADR-0005, ADR-0007 |
| Add an endpoint or change a response | `docs/architecture/api.md` (update it in the same PR) |
| Make a technology or structure decision | `docs/analysis/options.md` (options compared), `docs/adr/README.md`, then `/adr` |
| Understand why something is the way it is | `docs/adr/`, `docs/analysis/requirements-digest.md` |
| See what is risky | `docs/architecture/risks.md` |
| Write or review tests | `docs/architecture/testing.md` (levels, naming, test DB, race test, e2e rules) |

Requirements in `docs/project_context.md` and `docs/US-*.md` are in Ukrainian (original input).
Every other document, prompt, comment and user-facing string is in English; code, identifiers,
commits and tool config are in English. User-facing strings are English translations of the
acceptance-criteria texts.

## Rules that follow from the ADRs

- Validate every request body with a schema from `packages/shared`. No ad-hoc validation in apps.
- All API errors go through `ApiError` → `{ error: { code, message, details? } }`. Codes are
  listed in `docs/architecture/api.md`; do not invent new ones without adding them there.
- Layered structure (ADR-0009): business rules live in `apps/api/src/services/*`, never in routes or React components; components never call `fetch` directly, they use query hooks.
- `Role.availableSpots` changes only inside `services/applications` transactions, using a
  conditional `updateMany` and checking `count` (ADR-0007). A race test is part of DoD for US-06 and US-12.
- Owner / status checks happen on the server for every mutation, regardless of UI.
- Response DTOs are built in `serializers`; never spread a Prisma object into a response.
  `passwordHash` never leaves the server. Lead Telegram only in the applicant's APPROVED application.
- Statuses are strings in SQLite; the only allowed values are the zod enums in `packages/shared`.
- Tests: one Gherkin scenario = one test, named `US-xx sc.N …`; API tests hit the real SQLite test DB through `supertest`, never mock Prisma or services; `resetDb()` in `beforeEach`. See `docs/architecture/testing.md`.

## Definition of done for a user story

1. Every acceptance criterion and every Gherkin scenario has a test named after it (`US-06 sc.3 ...`).
2. `docs/architecture/traceability.md` row is updated; `api.md` updated if the contract moved.
3. `pnpm typecheck && pnpm test` pass.
4. The PR description names the story and lists assumptions made.
5. Nothing outside the MVP story list is implemented without an ADR or a note from the course owner.

## Requirements are read-only input

`docs/project_context.md`, `docs/US-INIT-1.md` and `docs/US-STUD-1.md` are the course owner's input. Never edit them.
If a requirement is missing, contradictory or ambiguous, stop and say so; record it in the "Open questions" section of
`docs/architecture/overview.md`. Do not invent it silently. Cite the story and scenario (`US-06 sc.3`) when a rule comes from there.

## Procedures

Step-by-step procedures live in `.claude/skills/<name>/SKILL.md` and are plain Markdown any assistant can follow
(`$ARGUMENTS` = the story key or path you were given): `implement-story`, `check-story`, `unit-tests`, `e2e-tests`, `adr`.
Claude runs them as `/implement-story US-xx`; Gemini CLI as the same slash commands from `.gemini/commands/`.

