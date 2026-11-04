# DevMatch — risk register

Format: probability / impact (L/M/H), **trigger** (how we find out it has fired), mitigation, **where it lives** in the architecture.
Review at every retrospective; do not delete a closed risk, mark it instead.

## Technical

| # | Risk | P/I | Trigger | Mitigation | Where it lives |
|---|---|---|---|---|---|
| T1 | Race condition when approving for the last spot: two APPROVED for one spot | M/H | `availableSpots < 0` in the DB, or more `APPROVED` applications for a role than `totalSpots` | conditional UPDATE inside a transaction, 409 when `count == 0`; a test with two parallel approves in the DoD | ADR-0007, `services/applications` |
| T2 | Leak of the owner's Telegram in public responses | M/H | any public JSON contains `telegram` | DTO serializers are the only place where responses are built; a "field is absent" test for PENDING/REJECTED (US-14 sc.2) | `serializers` (ADR-0009) |
| T3 | Owner check only in the UI, not in the API | M/H | 200 on the applications list of someone else's project | `requireOwner` middleware on all `/projects/:id/*` mutations; a 403 test (US-05 sc.3) | `middleware/auth` (ADR-0009) |
| T4 | Form validation and API validation diverge | H/M | the API accepts what the form rejects, or vice versa | the same zod schemas from `packages/shared` on both sides; local validation rules in `apps/*` are forbidden | ADR-0002, ADR-0004 |
| T5 | SQLite + several instances / no persistent disk → data loss | L/H | the PaaS restarted the instance and the DB is empty; or a 2nd instance was spawned | a single instance with a persistent disk; trigger → migration to PostgreSQL per ADR-0005 | ADR-0005, ADR-0008 |
| T6 | Free tier "falls asleep" before the demo | H/L | the first request takes > 20 s | wake it up 5 minutes before the demo; health check in the README | ADR-0008 |
| T7 | Statuses as strings: someone writes an invalid value | L/M | a value outside the enum in the DB | writes only through services; zod enum on input; seed through the same schemas | ADR-0005, `packages/shared` enums |
| T8 | Passwords: weak hash or `passwordHash` leaking into a response | L/H | `passwordHash` in any JSON | bcrypt cost ≥ 10; `User` DTO without `passwordHash`; a test on `GET /me` | ADR-0006, `serializers` |
| T9 | Case of tags / role names: "Java" ≠ "java", duplicates | H/L | the filter does not find obvious matches; a duplicate role with different casing | normalization on input (`tag` lower-case, `name` trim); tests from US-10 sc.1, US-03 sc.3 | `packages/shared` schemas, `services` |

## Product (requirements and user behavior)

| # | Risk | P/I | Trigger | Mitigation | Where it lives |
|---|---|---|---|---|---|
| P1 | Authentication is our assumption (digest, question 1); the course owner expects something else (university account, Telegram sign-in) | M/M | a remark at the first demo | the User model does not depend on the provider; OAuth is added as a second method without changing the schema | ADR-0006 |
| P2 | Spam applications / fake profiles (a pain from the VPC) | M/M | > N applications from one user per day; complaints from leads | in the MVP — only R11 (one active application per role); rate limit on `POST /applications` is one line of middleware, add it when triggered | `middleware` (ADR-0009); digest, question 9 |
| P3 | "Dead" projects in the catalog ("Moderator" persona is out of MVP scope) | H/L | `PUBLISHED` projects > 30 days without changes | sorting by `publishedAt DESC` hides old ones; auto-closing/moderation — post-MVP; the state machine leaves room for `PENDING_REVIEW` | digest A7 |
| P4 | A student applied, the role got filled, the application "hangs" as PENDING forever | H/M | PENDING applications for FILLED roles | a "No spots left" UI hint in "My applications"; auto-rejection — post-MVP | digest, question 10 |
| P5 | Ghosting after approval (a pain from the VPC): the contact was received, but nobody writes | M/L | — (outside the system) | a CTA hint "Message the lead" (US-14 AC); beyond that — out of MVP scope | web `/my/applications` |

## Team

| # | Risk | P/I | Trigger | Mitigation | Where it lives |
|---|---|---|---|---|---|
| C1 | Scope creep: post-MVP features (editable drafts, notifications, export) get pulled into the MVP | H/H | a PR without a US number in traceability | rule: every PR references a US-xx; post-MVP is a separate list in the story map; `/implement-story` refuses stories outside the list | AGENTS.md, skills |
| C2 | Frontend and backend diverge on the contract | M/M | the frontend mocks fields that do not exist in the API contract | the API contract (api.md) is the source of truth; a contract change = a document change in the same PR; shared DTO types | ADR-0002, ADR-0004 |
| C3 | One team member knows Prisma/transactions, the rest do not | M/M | all PRs touching `services/applications` come from one person | `services/applications` is written in pairs; the race test is part of the DoD so that understanding is verified by a test | ADR-0007 |
| C4 | AI generates code the team does not understand (especially auth and transactions) | H/H | at review the author cannot explain a line | review rule: the author explains every non-trivial block; `architecture-reviewer` checks compliance with the ADRs, a human checks understanding | `.claude/agents`, workshop 2 |
| C5 | 6–8 weeks in parallel with other courses — underestimation | H/H | US-01…US-04, US-09, US-11 not closed by mid-term | implementation order: the end-to-end scenario first (create → publish → see → apply → approve), then everything else; recorded in the traceability matrix | traceability.md (written with the sketch) |

## Consciously accepted for the MVP

- No password recovery and no email verification (ADR-0006).
- A single instance, SQLite on disk, backup = a copy of the file (ADR-0005, T5).
- No rate limit until the first P2 signal.
- No notifications; the student checks the status manually (post-MVP in the story map).
- Telegram/GitHub profiles are not verified for existence (`integrations.md`).
