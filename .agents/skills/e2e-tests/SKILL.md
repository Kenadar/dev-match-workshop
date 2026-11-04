---
name: e2e-tests
description: Write a Playwright end-to-end spec for a DevMatch user journey that spans several user stories (e.g. lead creates and publishes a project, student applies, lead approves). Seeds data through the API, locates elements by role, follows the e2e rules in docs/architecture/testing.md. Use when asked for an e2e, browser, journey or Playwright test.
---

<!-- Thin wrapper for Antigravity. The procedure itself is .claude/skills/e2e-tests/SKILL.md, the single source shared with Claude Code. -->

Read `.claude/skills/e2e-tests/SKILL.md` and follow it exactly; ignore its YAML frontmatter.
Wherever it says `$ARGUMENTS`, use the text the user wrote after `/e2e-tests` (expected: journey name or list of stories, e.g. "student-applies" or "US-09 US-11 US-12 US-13").
If nothing was given, ask for it before doing anything else.
