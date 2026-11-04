# Copilot code review on the US-06 PR (saved copy, 2026-11-04)

PR: https://github.com/Kenadar/dev-match-workshop/pull/1 (`review/us-06-ai-pr` → `review/base-step-08`).
Requested by the presenter, review effort "Balanced". Fallback for the workshop if the live request is slow.

**Summary:** 🟡 Changes recommended — "The approval flow allows non-owners to approve applications, can overbook
roles under concurrent requests, and exposes applicants' password hashes."

`Sources` is what the GitHub API reports in `copilot_code_review_sources` for each comment.

| # | Title | Where | Sources |
|---|---|---|---|
| 1 | Exclude applicant password hashes from approval responses | `serializers/applications.ts:7–9` | — |
| 2 | Restrict application approval to the project owner | `services/applications.ts:8–10` | — |
| 3 | Prevent concurrent approvals from overbooking a role | `services/applications.ts:23–25` | — |
| 4 | Test concurrent approvals competing for the final spot | `tests/applications.test.ts:38–39` | `AGENTS.md`, `.claude/skills/check-story/SKILL.md` |
| 5 | Test that rejected applications cannot be approved | `tests/applications.test.ts:48–50` | `AGENTS.md`, `.claude/skills/check-story/SKILL.md` |

## Comment texts

1. Removing `role` does not remove `applicant`: `withDetails` loads the complete applicant User, including
   `passwordHash`, and `rest` sends that nested object in the response. Every successful approval therefore exposes
   the student's password hash. Build the approval application DTO from the documented fields explicitly rather than
   spreading the Prisma record.
2. `requireAuth` only checks for a valid session, and this service never checks the project's owner. Any signed-in
   user who knows an application ID—including the applicant—can approve it, consume a spot, and retrieve the
   applicant's contact. Pass the current user's ID from the route and compare it with
   `application.role.project.ownerId` in the service, returning `FORBIDDEN` before processing a non-owner's request.
3. Two approvals can both read one available spot before their transactions, then each approve a candidate and write
   zero, overbooking the role. Use an interactive transaction with ADR-0007's conditional `updateMany` decrement and
   checked count, returning `ROLE_FILLED` and rolling back the losing approval. Guard the PENDING-to-APPROVED
   transition inside the same transaction so concurrent requests cannot process one application twice.
4. This test starts with zero spots and makes only one request, so it does not exercise the mandatory US-06 sc.3 race
   described in `docs/architecture/testing.md:42–53` and the traceability row. The current unsafe counter update
   passes it. Add two PENDING applications competing for one spot via `Promise.all`, asserting one 200, one 409
   ROLE_FILLED, exactly one APPROVED application, and a PENDING loser before marking the API done.
5. US-06 AC 5 also forbids approving an application that was previously REJECTED, but this test covers only APPROVED.
   Please include the REJECTED case so the acceptance criterion is fully tested; otherwise a regression allowing
   rejected candidates to be approved would still leave the claimed AC 5 coverage green.
