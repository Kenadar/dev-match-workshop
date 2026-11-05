# Intro antipattern — US-01 through a web chat

What a student gets when they paste a story into a chat that cannot see the repo.

- `webchat-prompt.md` — the prompt: one line ("write an Express endpoint (TypeScript) for this story, with validation
  and a test, we use Prisma") + the US-01 text from `docs/US-INIT-1.md`, exactly as a student would paste it.
- `webchat-answer.md` — the answer, unedited. Recorded 2026-11-04 with a model run as a plain chat assistant: no tools,
  no repo, no project instructions (`claude -p --tools "" --setting-sources "" --system-prompt "…web chat…"`).
  Any web chat (ChatGPT, Gemini, claude.ai) gives an answer of the same kind; the details differ run to run.

## The point

The answer is **good code**. It validates, normalises `@`, tests boundaries 5 and 32, checks `update` was not called on
an error. A student would paste it. It still breaks almost every decision the team made in workshop 1, because the
model never saw them.

## What it breaks (line numbers in `webchat-answer.md`)

| # | The answer does | The repo decided | Where it is written |
|---|---|---|---|
| 1 | new endpoint `PUT /api/me/telegram` (l. 1, 67) | `PATCH /me` with `{ user }` | `docs/architecture/api.md` |
| 2 | new column `telegramContact` + a migration (l. 13–22) | the column exists: `User.telegram` | `docs/architecture/data-model.md`, `schema.prisma` |
| 3 | its own zod schema in `src/validation/` (l. 24–50) | `updateProfileSchema` / `telegramSchema` from `packages/shared` | AGENTS.md rule 1, ADR-0002 |
| 4 | Ukrainian messages as new constants (l. 29–32) | English messages, `MESSAGES.telegramRequired` / `telegramFormat` | AGENTS.md (language), `packages/shared/src/validation.ts` |
| 5 | `res.status(400).json({ error, message, fields })` (l. 72–76) | `ApiError` → `{ error: { code, message, details } }` | AGENTS.md, `apps/api/AGENTS.md` |
| 6 | invents `USER_NOT_FOUND` (l. 97) | only codes from the dictionary | `docs/architecture/api.md` |
| 7 | Prisma called from the route (l. 80) | route → `services/users.ts` → serializer | ADR-0009, `apps/api/AGENTS.md` |
| 8 | `...user` spread into the response (l. 87) | DTO built in `serializers/` field by field | AGENTS.md "never spread a Prisma object" |
| 9 | `redirectTo: "/dashboard"` from the API (l. 88) | the web app navigates to `/my/projects` | `apps/web/src/queries/auth.ts` |
| 10 | test mocks Prisma with `vi.fn()` (l. 140–141) | real SQLite test DB through supertest, `resetDb()` | `docs/architecture/testing.md` |
| 11 | test names in Ukrainian, no scenario ids (l. 168) | `US-01 sc.1 …` | `testing.md`, DoD 1 |
| 12 | `npm i` (l. 6–7) | pnpm monorepo; zod, vitest, supertest already installed | AGENTS.md "Commands" |
| 13 | AC 3: reads `owner.telegramContact` in the project route and nulls it unless approved (l. 251–264) | the public project page **never** has the owner's Telegram; it is only in the applicant's APPROVED application | AGENTS.md, `dto.ts` (`ProjectDto`), US-11, US-13 |

Note #13: it is not just style. "Fetch the secret, then hide it with an `if`" is exactly the leak pattern of the
US-06 PR in step 10. The web chat does not know the team decided where the Telegram may appear.

## On stage (3 min of the 7)

1. Show `webchat-prompt.md` for 10 seconds: "this is what most of you do."
2. Scroll `webchat-answer.md`: "looks fine? Tests, validation, edge cases." Let them agree.
3. Open the table above, read rows 1, 3, 5, 10, 13. Ask the chat: "how many of these would you catch in review?"
4. 🎤 "The model did not make a mistake. It never saw your project. Today we make it see."

Optional live: paste `webchat-prompt.md` into any web chat during the talk and show that the answer has the same
kind of problems. Do not rely on it: use the saved one on screen.

At the end of step 7, ask the same thing of Claude Code on `step-07` and compare with this table
(`PATCH /me`, `updateProfileSchema`, `ApiError`, service, real DB tests).
