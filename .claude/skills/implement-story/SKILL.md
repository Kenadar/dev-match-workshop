---
name: implement-story
description: Implement a DevMatch user story end to end (US-01..US-14) - reads the story, plans endpoint/page/schema/tests from its Gherkin scenarios, waits for approval, then implements and updates traceability. Use when asked to implement, build or start a user story by number.
argument-hint: US-xx
---

Implement user story `$ARGUMENTS` for DevMatch.

## 1. Read, don't assume

- Find the story in `docs/US-INIT-1.md` or `docs/US-STUD-1.md`. If `$ARGUMENTS` is not one of US-01..US-14, stop: it is outside MVP scope. Suggest `/adr` or ask the course owner.
- Read its row in `docs/architecture/traceability.md`, the matching endpoints in `docs/architecture/api.md`, the entities and invariants in `docs/architecture/domain-model.md`.
- Read the existing code for the endpoint(s) and page(s) named in that row. Note what already exists.

## 2. Plan and wait

Present a short plan and **wait for confirmation** before writing code:

- Endpoint(s): method, path, access rule, success and error codes (copy from api.md; flag any mismatch).
- Service function(s) and the invariants they enforce; whether a transaction is required (ADR-0007).
- Schema changes, if any (must match `data-model.md`; if not, say so first).
- Frontend page/component and the queries to invalidate after mutations.
- Test list: one test per acceptance criterion and per Gherkin scenario, named `US-xx sc.N <short>`. Include the race test for US-06 and US-12.
- Assumptions you are making and open questions from `docs/analysis/requirements-digest.md` §4 that this story touches.

## 3. Implement

Order: shared schema/DTO → service → route → tests (api) → page/query (web) → manual check with `pnpm dev`.

Rules (from AGENTS.md): validation only through `packages/shared`; errors only through `ApiError` with codes from api.md; no business logic in routes or components; DTOs via serializers.

## 4. Close

- Run `pnpm typecheck && pnpm test`. Paste the summary.
- Update the story's row in `docs/architecture/traceability.md` (tests that now exist, deviations). If the contract moved, update `api.md` in the same change.
- List what was NOT done and why.
