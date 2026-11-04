# Four reviewers on the same US-06 PR (real runs, 2026-11-04)

Input: `git diff step-08 step-10-review`. Runs: the project `architecture-reviewer` twice (independent), a
generic reviewer that saw **only the diff** — no repo, no docs (a context-free PR reviewer), and Copilot code review
on the PR in the fork ([PR #1](https://github.com/Kenadar/dev-match-workshop/pull/1), effort "Balanced"; saved copy in
`10-copilot-review.md`). Copilot reads `AGENTS.md` from the PR branch, and on this PR it also used the `check-story` skill.

Copilot gives no per-finding severity, only one verdict for the whole review ("🟡 Changes recommended"), so its
column shows whether it found the issue and what it grounded it in.

| Finding | Generic (diff only) | Copilot on the PR | Project reviewer, run 1 | Project reviewer, run 2 | Proven by test |
|---|---|---|---|---|---|
| No owner check | **critical** | found — "any signed-in user … including the applicant"; no source cited | **critical** — api.md access rule, domain-model "Data visibility", AGENTS.md | **critical** — same sources | `US-06 a user who does not own the project → 403` |
| Read-then-write race | **critical** | found — names "ADR-0007's conditional `updateMany`" | **critical** — "this is ADR-0007 option A, rejected" | **critical** — same | `US-06 sc.3 parallel approves …` (both 200, two APPROVED, counter 0) |
| Same application approved twice in parallel | mentioned inside the race finding | found, inside the race comment ("guard the PENDING-to-APPROVED transition") | **critical** (part of #2) | **critical** (part of #2) | `US-06 AC 5 the same application approved twice in parallel …` |
| `passwordHash` / email in the response | **medium** ("can expose") | found — "every successful approval exposes the student's password hash"; no source cited | **critical** — "CLAUDE.md: passwordHash never leaves the server" | **critical** — same | `US-06 the response is exactly the api.md DTO …` |
| "sc.3" test is not the race test; traceability falsely says Done | high (tests missing) | found — cites `testing.md:42–53` and the traceability row; sources: AGENTS.md, `check-story` | **high** — testing.md, ADR-0007 DoD | **high / medium** | — (a process finding) |
| Role status from a stale value | high | — (covered by the race fix) | inside #2 | low (#9) | covered by the race test |
| Rejected application not tested | — | found — "US-06 AC 5 also forbids … REJECTED"; sources: AGENTS.md, `check-story` | — | **high** (US-06 AC 5 says "rejected or approved") | `US-06 AC 5 a rejected application …` |
| Response type not in `packages/shared` | — | — | medium — ADR-0002 | medium — "that is why the compiler missed the leak" | — (fixed: `ApproveApplicationResponseDto`) |
| `NOT_FOUND` message not in api.md | — | — | low | low | — (fixed: api.md dictionary) |
| Over-fetching, `:id` not validated, 404 test without code | low / medium | — | — | — | 404 test now asserts the code |

## What this shows — and what it does not

- On a PR with textbook defects, **all four reviewers found all three**. Do not tell students "only the project reviewer finds it" — on this diff that would be false.
- The difference is **severity and grounding**. The generic reviewer guessed ("can expose", medium); the project reviewer cited the rule it breaks and ranked by it. Prioritising is what a busy lead needs from a review.
- **Copilot sits where we expected: between the two.** Because the PR branch has `AGENTS.md`, it named ADR-0007, cited `testing.md` by line, and used the repo's own `check-story` procedure to catch the fake race test and the missing REJECTED case — things the diff-only reviewer could not know. It did not rank findings, and it skipped the ADR-0002 / api.md drift the project reviewer reported.
- The GitHub API shows *which* context each Copilot comment used (`copilot_code_review_sources`): the two test findings came from `AGENTS.md` + `check-story`; the three code findings list no source. That is the step-7 lesson in one field: the findings that needed the project's rules came from the project's context files.
- Only reviewers that read traceability and testing.md could say the "Done" is false — the project reviewer and Copilot (via `check-story`).
- Two runs of the same reviewer agreed on the criticals but not on the tail (one found the untested REJECTED case, the other didn't). Reviews are not deterministic; run them more than once on important PRs, or make them cheap enough to run on every PR.
- No reviewer's finding was accepted until a test was red. 4 of 11 tests failed on the PR code; the same 11 pass after the fix.
