---
name: unit-tests
description: Write unit and API (integration) tests for a DevMatch user story (US-01..US-14) or a module - one vitest test per Gherkin scenario and acceptance criterion, named "US-xx sc.N ...", using the shared test DB helpers and supertest. Use when asked to write, add or complete tests for a story, an endpoint, a service or a schema.
---

<!-- Thin wrapper for Antigravity. The procedure itself is .claude/skills/unit-tests/SKILL.md, the single source shared with Claude Code. -->

Read `.claude/skills/unit-tests/SKILL.md` and follow it exactly; ignore its YAML frontmatter.
Wherever it says `$ARGUMENTS`, use the text the user wrote after `/unit-tests` (expected: US-xx | path/to/module.ts).
If nothing was given, ask for it before doing anything else.
