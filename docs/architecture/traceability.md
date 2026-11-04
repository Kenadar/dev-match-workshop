# DevMatch — traceability matrix

User story → endpoint → page → entities → key tests. This is both the implementation plan and the review checklist: a PR without a row here is either unnecessary work or an undocumented requirement.

| US | Name | Endpoint(s) | Page | Entities | Key tests (from Gherkin) |
|---|---|---|---|---|---|
| US-01 | Telegram on first sign-in | `PATCH /me` | `/onboarding` | User | sc.1 normalization `orest_lead` → `@orest_lead`; sc.2 empty → VALIDATION_ERROR; sc.3 `orest lead!` and `abc` → VALIDATION_ERROR. **Done:** `apps/api/tests/me.test.ts` (sc.1–3, AC 2 normalization, AC 3 bound to account, 401), `apps/web/src/__tests__/onboarding.test.tsx` (sc.1–3 on the page) |
| US-02 | Creating a project card | `POST /projects` | `/my/projects/new` | Project, ProjectTag | sc.1 → 201, status DRAFT, owner = current user; sc.2 description < 30 → 400 on the `description` field; without telegram → 400 PROFILE_INCOMPLETE |
| US-03 | Adding a role | `POST /projects/:id/roles` | `/my/projects/:id` (Roles) | Role | sc.1 → availableSpots == totalSpots; sc.2 0, -2, 1.5 → 400; sc.3 duplicate (including different casing) → 409 DUPLICATE_ROLE; not the owner → 403; CLOSED → 409 INVALID_STATUS |
| US-04 | Publishing | `POST /projects/:id/publish` | `/my/projects/:id` | Project | sc.1 → PUBLISHED, publishedAt set, appears in `GET /projects`; sc.2 without roles → 400 NO_ROLES; re-publishing → 409 INVALID_STATUS |
| US-05 | Applications list | `GET /projects/:id/applications` | `/my/projects/:id` (Applications) | Application | sc.1 2 applications, PENDING first, githubUrl present; sc.2 empty → `items: []`; sc.3 not the owner → 403 FORBIDDEN |
| US-06 | Approving | `POST /applications/:id/approve` | `/my/projects/:id` (Applications) | Application, Role | sc.1 2→1, APPROVED, applicantTelegram in the response; sc.2 1→0, role FILLED; sc.3 **parallel approves** → one 200, one 409 ROLE_FILLED, the second one's status remains PENDING; repeat → 409 ALREADY_DECIDED. **Done (API):** `apps/api/tests/applications.test.ts` (sc.1–3, AC 5, 404); UI comes with US-05 |
| US-07 | Rejecting | `POST /applications/:id/reject` | `/my/projects/:id` (Applications) | Application | sc.1 → REJECTED, availableSpots unchanged; sc.2 reject/approve again → 409 ALREADY_DECIDED |
| US-08 | Closing recruitment | `POST /projects/:id/close` | `/my/projects/:id` | Project | sc.1 → CLOSED; the card in the catalog gets a badge (frontend); sc.2 `POST /roles/:id/applications` → 400 PROJECT_CLOSED; PENDING applications remain in `GET /projects/:id/applications` |
| US-09 | Catalog | `GET /projects` | `/` | Project, ProjectTag, Role | sc.1 3 PUBLISHED → 3 cards, order publishedAt DESC, openSpots = sum; sc.2 → `items: []` + empty state; sc.3 DRAFT not in the output |
| US-10 | Filter by tag | `GET /projects?tag=` | `/` | ProjectTag | sc.1 `java` finds "Java" and "JAVA", not "Python"; sc.2 `rust` → `[]` + reset button; sc.3 reset → full list |
| US-11 | Project card | `GET /projects/:id` | `/projects/:id` | Project, Role | sc.1 roles with a button/badge depending on availableSpots; **the response does not contain the owner's telegram**; sc.2 `/projects/999` → 404 NOT_FOUND; someone else's DRAFT → 404 |
| US-12 | Submitting an application | `POST /roles/:roleId/applications` | `/projects/:id` | Application | sc.1 → 201 PENDING; sc.2 gitlab.com / `my-repo` → 400 on the `githubUrl` field; sc.3 duplicate → 409 DUPLICATE_APPLICATION; sc.4 role FILLED → 409 ROLE_FILLED; after REJECTED re-applying is allowed |
| US-13 | My applications | `GET /me/applications` | `/my/applications` | Application | sc.1 two statuses, badges; order createdAt DESC; sc.2 empty → empty state with a link to `/` |
| US-14 | Lead's contact | `GET /me/applications` | `/my/applications` | Application, User | sc.1 APPROVED → `leadTelegram: "@orest_lead"`, link `https://t.me/orest_lead`; sc.2 PENDING/REJECTED → **the field is absent from the JSON** |
| — | Auth (ADR-0006) | `POST /auth/register`, `/login`, `/logout`, `GET /me` | `/login`, `/register` | User, Session | duplicate email → 409; wrong password → 401; `GET /me` without a cookie → 401; `passwordHash` absent from the response. **Done:** `apps/api/tests/auth.test.ts` (register, duplicate, login, wrong password, unknown email, `/me` with/without/expired session, logout) |

## Assumptions made while implementing

| Story | Assumption | Why |
|---|---|---|
| Auth | Emails are case-insensitive: `registerSchema` / `loginSchema` lower-case them | one account per address; `Orest@x` and `orest@x` must not be two users |
| Auth | Logout deletes only the current session; other sessions of the user stay | "sign out" on one device should not sign out the others; no story says otherwise |
| Auth | Unknown email and wrong password return the same 401 `INVALID_CREDENTIALS` and take the same time | do not reveal which emails are registered |
| Auth | `bcryptjs` (pure JS, cost 10) instead of native `bcrypt` | same algorithm and cost as risks.md T8, no native build on students' machines |
| US-01 | "First sign-in" = any sign-in or registration while `telegram` is empty → `/onboarding` | the story does not define "first"; an empty contact is the observable condition |
| US-01 sc.1 | "Project management panel" = `/my/projects` | the only page matching that description in overview.md |

## Implementation order (recommended)

The end-to-end scenario first — it proves the architecture and gives a demo the earliest:

1. Auth + US-01 (identity) → 2. US-02, US-03, US-04 (something to show) → 3. US-09, US-11 (something to see) → 4. US-12 (something to apply to) → 5. US-05, US-06, US-07 (the intersection point) → 6. US-13, US-14 → 7. US-10, US-08.

After step 5 the system demonstrates the whole journey from `project_context.md`.

## Weakly covered or dependent on assumptions

| What | Depends on | What to do |
|---|---|---|
| US-01 "is displayed in project cards for approved members" | US-14 implements this via `leadTelegram`; there is no separate endpoint | sufficient; make sure the US-14 sc.1 test covers it |
| US-05 "candidate's name/username" | digest, question 8 (displayName) | a test that `applicant.displayName` is present |
| US-11 "creation date" and "author's username" | DTO `Project.owner.displayName`, `createdAt` | present in the DTO table; do not forget it in the frontend |
| US-12 "by Telegram username" for duplicates | digest, question 4 — decided in favor of `applicantId` | pin it down in the sc.3 test: the same user, even with a different telegram in the form → 409 |
| The owner applies to their own project | overview, question 1 | 403 OWN_PROJECT; confirm with the course owner |
| US-08 "badge in the catalog" | the catalog shows only PUBLISHED (US-09 AC) — therefore CLOSED projects are **not in the catalog**, and the badge is visible only via the direct link `/projects/:id` | **contradiction in the requirements**: US-08 AC "in the general catalog the project gets a badge" vs US-09 AC "only PUBLISHED". Proposal: the catalog — only PUBLISHED; the badge — on the project page. Escalate to the course owner |
