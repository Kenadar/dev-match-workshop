# Three reviewers on the same US-06 PR (real runs, 2026-11-04)

Input: `git diff step-08 step-10-review`. Runs: the project `architecture-reviewer` twice (independent), and a
generic reviewer that saw **only the diff** — no repo, no docs (stand-in for an out-of-the-box Copilot / Gemini PR review;
re-run the real Gemini Code Assist on the fork's PR before the workshop and add its column).

| Finding | Generic (diff only) | Project reviewer, run 1 | Project reviewer, run 2 | Proven by test |
|---|---|---|---|---|
| No owner check | **critical** | **critical** — api.md access rule, domain-model "Data visibility", AGENTS.md | **critical** — same sources | `US-06 a user who does not own the project → 403` |
| Read-then-write race | **critical** | **critical** — "this is ADR-0007 option A, rejected" | **critical** — same | `US-06 sc.3 parallel approves …` (both 200, two APPROVED, counter 0) |
| Same application approved twice in parallel | mentioned inside the race finding | **critical** (part of #2) | **critical** (part of #2) | `US-06 AC 5 the same application approved twice in parallel …` |
| `passwordHash` / email in the response | **medium** ("can expose") | **critical** — "CLAUDE.md: passwordHash never leaves the server" | **critical** — same | `US-06 the response is exactly the api.md DTO …` |
| "sc.3" test is not the race test; traceability falsely says Done | high (tests missing) | **high** — testing.md, ADR-0007 DoD | **high / medium** | — (a process finding) |
| Role status from a stale value | high | inside #2 | low (#9) | covered by the race test |
| Rejected application not tested | — | — | **high** (US-06 AC 5 says "rejected or approved") | `US-06 AC 5 a rejected application …` |
| Response type not in `packages/shared` | — | medium — ADR-0002 | medium — "that is why the compiler missed the leak" | — (fixed: `ApproveApplicationResponseDto`) |
| `NOT_FOUND` message not in api.md | — | low | low | — (fixed: api.md dictionary) |
| Over-fetching, `:id` not validated, 404 test without code | low / medium | — | — | 404 test now asserts the code |

## What this shows — and what it does not

- On a PR with textbook defects, **all three reviewers found all three**. Do not tell students "only the project reviewer finds it" — on this diff that would be false.
- The difference is **severity and grounding**. The generic reviewer guessed ("can expose", medium); the project reviewer cited the rule it breaks and ranked by it. Prioritising is what a busy lead needs from a review.
- Only the project reviewer could say traceability lies, because only it read traceability and testing.md.
- Two runs of the same reviewer agreed on the criticals but not on the tail (one found the untested REJECTED case, the other didn't). Reviews are not deterministic; run them more than once on important PRs, or make them cheap enough to run on every PR.
- No reviewer's finding was accepted until a test was red. 4 of 11 tests failed on the PR code; the same 11 pass after the fix.
