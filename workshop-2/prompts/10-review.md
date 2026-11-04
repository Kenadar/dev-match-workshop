# Step 10 — Review: an AI-written PR for US-06

**Goal:** students review AI output the way it actually arrives — a tidy PR with green tests — and learn to turn a reviewer's claim into a failing test before fixing anything.
**Key idea:** an AI review is a filter, not a verdict. A finding is a hypothesis until a test goes red. And the PR's own tests prove only what its author thought of.

## The material (all real, all in git)

| Ref | What it is |
|---|---|
| `step-10-review` (commit `US-06: approve an application (API)`) | the "AI PR": service, route, serializer, factories, 5 tests — **all green**, traceability says "Done" |
| next commit `US-06 review: tests that prove the findings (red)` | 6 new tests; 4 of 11 fail on the PR code |
| next commit `US-06 review: fix …` | the fix; 11/11 green (race test passed 5 runs of 5) |
| `step-10` | merge into main |
| `workshop-2/demo/10-review-results.md` | what four reviewers found, side by side (incl. Copilot) |
| `workshop-2/demo/10-copilot-review.md` | saved copy of Copilot's review on PR #1 |

Branch `ai/us-06-approve` = the PR. To open it: `git switch --detach step-10-review` (`go.sh` takes numeric steps only).

## The three defects (do not reveal before students look)

| # | Defect | Looks fine because | Breaks |
|---|---|---|---|
| 1 | Reads the role, checks `availableSpots > 0`, then writes an **absolute** `availableSpots - 1` | it *is* inside `prisma.$transaction([...])` | ADR-0007 option A (rejected). Two parallel approves: **both 200, two APPROVED, counter shows 0 FILLED** — the counter looks right, the team has one member too many |
| 2 | `approveApplication(id)` — no user passed, no owner check | the route has `requireAuth` | any signed-in user approves anyone's candidate and gets their Telegram (200) |
| 3 | serializer: `const { role: _role, ...rest } = application` | it visibly "strips" the nested object | `rest.applicant` is the full User row → **`passwordHash` and email in the JSON** |

And a fourth, quieter one: the test named "US-06 sc.3" seeds `availableSpots: 0` and calls once. The Gherkin scenario is a race; the test isn't. Traceability says "Done".

## On stage (13 min)

1. **Students first (3 min).** Link to the PR diff in chat (`git diff step-08 step-10-review`, or the PR in the fork). "Would you merge it? Tests are green." Collect findings in chat.
2. **Copilot on the PR (2 min, presenter's account).** [PR #1](https://github.com/Kenadar/dev-match-workshop/pull/1) already has its review; re-request live (Reviewers → Copilot) only if time allows, the saved copy is `workshop-2/demo/10-copilot-review.md`. It reads `AGENTS.md` from the PR branch, so it is not a context-free reviewer: it found all three defects, named ADR-0007, and — through the repo's `check-story` skill — caught the fake race test and the untested REJECTED case. Show one thing from the API: `https://api.github.com/repos/Kenadar/dev-match-workshop/pulls/1/comments`, field `copilot_code_review_sources` — the test findings list `AGENTS.md` + `check-story`. That is step 7 paying off. Ask: which of these are real? How would you know? It gives no severity per finding — who decides what blocks the merge? Optional before/after: repo Settings → Copilot → Code review → "Use custom instructions when reviewing pull requests" off, re-request, compare.
3. **Local project reviewer (2 min) — what every student can run, no subscription.** Claude: the `architecture-reviewer` agent; Gemini CLI: `/arch-review`. Same three findings, each with the ADR / document it breaks, and the false "Done" in traceability.
4. **Prove, then fix (5 min).** `git switch --detach` to the "tests that prove the findings" commit → `pnpm --filter @devmatch/api test -- applications` → 4 red. Read the race test aloud (it is the `testing.md` example). Then the fix commit → green. Show the fixed service: the counts decide, nothing read earlier is written.
5. **Lesson (1 min)** — below.

🎤 "Every reviewer found the same three defects. That was not the hard part. The hard part is: which finding is real, how bad, and how do we keep it fixed. The generic reviewer said the password leak 'can expose' sensitive data — medium. Copilot found it but did not rank it. The project reviewer said 'passwordHash never leaves the server' — critical. And none of them is proof. Proof is the red test."

## Prompt to fix — the order matters

```text
The reviewer's findings 1–3 on this branch are hypotheses. For each one, first write the test that would fail if
the finding is real (US-06 naming, testing.md race pattern for #1), run it, and show me it is red.
Do not change production code until I have seen the red run. Then fix with the ADR-0007 pattern from apps/api/AGENTS.md.
```

**What to pay attention to:** in the defective version the counter ends at **0 FILLED**, not −1. A test that checks only the counter passes. The race test in `testing.md` counts APPROVED rows — that is why it was written that way.
