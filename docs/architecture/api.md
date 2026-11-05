# DevMatch — API contract

**Audience:** frontend and backend developers. This is the agreement that lets us work in parallel. When it diverges from the code, this document is the source of truth; if you change the contract, change the document first.

Base path: `/api`. Format: JSON. Authentication: cookie session (ADR-0006); emails are case-insensitive — register and login lower-case them, so `user.email` is always lower-case. All request bodies are validated with zod schemas from `packages/shared` (ADR-0004).

## Endpoints

| Method and path | Story | Access | Success | Errors |
|---|---|---|---|---|
| `POST /auth/register` | ADR-0006 | public | 201 `{ user }` | 400 VALIDATION_ERROR, 409 EMAIL_TAKEN |
| `POST /auth/login` | ADR-0006 | public | 200 `{ user }` | 400 VALIDATION_ERROR, 401 INVALID_CREDENTIALS |
| `POST /auth/logout` | ADR-0006 | auth | 204 (ends only the current session) | 401 UNAUTHENTICATED |
| `GET /me` | ADR-0006 | auth | 200 `{ user }` | 401 UNAUTHENTICATED |
| `PATCH /me` | US-01 | auth | 200 `{ user }` | 400 VALIDATION_ERROR, 401 UNAUTHENTICATED |
| `GET /projects?tag=` | US-09, US-10 | public | 200 `{ items: ProjectCard[] }` | 400 VALIDATION_ERROR (tag > 50) |
| `GET /projects/:id` | US-11 | public (DRAFT — owner only) | 200 `{ project }` | 404 NOT_FOUND |
| `POST /projects` | US-02 | auth | 201 `{ project }` (status DRAFT) | 400 VALIDATION_ERROR, 400 PROFILE_INCOMPLETE (no Telegram), 401 |
| `GET /me/projects` | navigation | auth | 200 `{ items: ProjectCard[] }` | 401 |
| `POST /projects/:id/roles` | US-03 | owner | 201 `{ role }` | 400 VALIDATION_ERROR, 403 FORBIDDEN, 404, 409 DUPLICATE_ROLE, 409 INVALID_STATUS (CLOSED) |
| `POST /projects/:id/publish` | US-04 | owner | 200 `{ project }` | 403, 404, 400 NO_ROLES, 409 INVALID_STATUS (not DRAFT) |
| `POST /projects/:id/close` | US-08 | owner | 200 `{ project }` | 403, 404, 409 INVALID_STATUS (not PUBLISHED) |
| `GET /projects/:id/applications` | US-05 | owner | 200 `{ items: ApplicationForOwner[] }` (PENDING first, then by date DESC) | 401, 403 FORBIDDEN, 404 |
| `POST /roles/:roleId/applications` | US-12 | auth | 201 `{ application }` (status PENDING) | 400 VALIDATION_ERROR, 400 PROJECT_CLOSED, 403 OWN_PROJECT, 404, 409 ROLE_FILLED, 409 DUPLICATE_APPLICATION |
| `POST /applications/:id/approve` | US-06 | project owner | 200 `{ application }` + `applicantTelegram`, `role` with the new counter | 403, 404, 409 ALREADY_DECIDED, 409 ROLE_FILLED |
| `POST /applications/:id/reject` | US-07 | project owner | 200 `{ application }` | 403, 404, 409 ALREADY_DECIDED |
| `GET /me/applications` | US-13, US-14 | auth | 200 `{ items: MyApplication[] }` (date DESC) | 401 |
| `GET /health` | — | public | 200 `{ ok: true }` | |

Access rule: **every** owner/status check is performed on the server independently of the UI (digest §3; US-05 sc.3, US-08 sc.2, US-14 sc.2).

## Error format

```json
{
  "error": {
    "code": "ROLE_FILLED",
    "message": "Cannot approve: all spots for this role are already taken",
    "details": { "field": "message" }
  }
}
```

`details` is present only for `VALIDATION_ERROR` — an object `{ <field>: <message> }`. The frontend shows `message` as is — the texts are the English translations of the acceptance-criteria texts.

## Error-code dictionary

| HTTP | `code` | Message (from AC/Gherkin) | Source |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | per field, e.g. "Username must be 5–32 characters (Latin letters, digits, _)" | US-01 sc.3, US-02 sc.2, US-03 sc.2, US-12 sc.2 |
| 400 | `PROFILE_INCOMPLETE` | "Provide a Telegram contact so the team can reach you" | US-01 sc.2 |
| 400 | `NO_ROLES` | "Cannot publish a project without open roles. Add at least one role" | US-04 sc.2 |
| 400 | `PROJECT_CLOSED` | "Recruitment for this project is closed. Applications are not accepted" | US-08 sc.2 |
| 401 | `UNAUTHENTICATED` | "Sign in to continue" | ADR-0006 |
| 401 | `INVALID_CREDENTIALS` | "Invalid email or password" | ADR-0006 |
| 403 | `FORBIDDEN` | "403 Forbidden. You are not allowed to view applications for this project" / "You are not allowed to manage applications for this project" / "You are not allowed to manage this project" | US-05 sc.3 / US-06, US-07 (not the owner) / US-03, US-04, US-08 (not the owner) |
| 403 | `OWN_PROJECT` | "You cannot apply to your own project" | overview, question 1 |
| 404 | `NOT_FOUND` | "Project not found or it has been deleted" / "Application not found" | US-11 sc.2 / US-06, US-07 |
| 409 | `EMAIL_TAKEN` | "A user with this email already exists" | ADR-0006 |
| 409 | `DUPLICATE_ROLE` | "This role already exists in the project. Change the number of spots on the existing one" | US-03 sc.3 |
| 409 | `INVALID_STATUS` | "This action is not available in the project's current status" | US-03 AC, US-04, US-08 AC |
| 409 | `ROLE_FILLED` | "Cannot approve: all spots for this role are already taken" / "Unfortunately, all spots for this role were just taken" | US-06 sc.3 / US-12 sc.4 |
| 409 | `DUPLICATE_APPLICATION` | "You have already applied for this role. Wait for the lead's reply" | US-12 sc.3 |
| 409 | `ALREADY_DECIDED` | "This application has already been processed" | US-07 sc.2, US-06 AC |

## DTOs (what exactly we return)

```ts
// public card in the catalog (US-09 AC)
ProjectCard = { id, title, excerpt /* ≤150 */, tags: string[], publishedAt, openSpots: number }

// public page (US-11 AC) — WITHOUT the owner's telegram
Project = { id, title, description, tags: string[], status, createdAt, publishedAt,
            owner: { id, displayName }, roles: Role[] }
Role = { id, name, totalSpots, availableSpots, status: 'OPEN' | 'FILLED' }

// for the owner (US-05 AC): githubUrl always, the candidate's telegram — only when APPROVED (US-06 AC)
ApplicationForOwner = { id, role: { id, name }, applicant: { id, displayName },
                        githubUrl, comment, status, createdAt, applicantTelegram?: string }

// for the student (US-13, US-14): leadTelegram — only when APPROVED (US-14 sc.2)
MyApplication = { id, project: { id, title }, role: { id, name }, status, createdAt,
                  leadTelegram?: string }

User = { id, email, displayName, telegram: string | null }   // without passwordHash — never
```

## Examples for non-trivial endpoints

### `POST /roles/:roleId/applications` (US-12)

Request:
```json
{ "telegram": "student_dev", "githubUrl": "https://github.com/student-dev", "comment": "I have experience building UI with React" }
```
Response 201:
```json
{ "application": { "id": "app_1", "roleId": "role_1", "status": "PENDING", "telegram": "@student_dev", "githubUrl": "https://github.com/student-dev", "comment": "I have experience building UI with React", "createdAt": "2026-10-22T10:00:00Z" } }
```
Scenarios: empty `telegram` in the body → taken from the profile; `https://gitlab.com/x` → 400 `VALIDATION_ERROR` `{ "details": { "githubUrl": "Provide a valid GitHub profile link (https://github.com/your_username)" } }`; re-applying → 409 `DUPLICATE_APPLICATION`; the spot was taken → 409 `ROLE_FILLED`; project `CLOSED` → 400 `PROJECT_CLOSED`.

### `POST /applications/:id/approve` (US-06)

Response 200:
```json
{ "application": { "id": "app_1", "status": "APPROVED", "decidedAt": "…" },
  "applicantTelegram": "@student_dev",
  "role": { "id": "role_1", "availableSpots": 0, "status": "FILLED" } }
```
We return `role` so that the frontend can update the counter without an extra request (US-06 sc.1, sc.2).

### `GET /me/applications` (US-13, US-14)

```json
{ "items": [
  { "id": "app_2", "project": { "id": "p_1", "title": "Project A" }, "role": { "id": "r_1", "name": "Backend Developer" }, "status": "APPROVED", "createdAt": "…", "leadTelegram": "@orest_lead" },
  { "id": "app_1", "project": { "id": "p_2", "title": "Project B" }, "role": { "id": "r_5", "name": "QA" }, "status": "PENDING", "createdAt": "…" }
] }
```
The `leadTelegram` field is **absent** (not `null`, but absent) for `PENDING`/`REJECTED` — a test for this is mandatory (US-14 sc.2).

### `GET /projects?tag=java` (US-10)

The tag is normalized to lower case on the server; an empty result → `{ "items": [] }` (200, not 404) — the frontend shows "No projects found for tag 'Java'" and a reset button (US-10 sc.2).
