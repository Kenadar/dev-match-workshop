---
name: check-story
description: Verify that a DevMatch user story (US-01..US-14) is fully implemented - maps every acceptance criterion and Gherkin scenario to code and tests, and reports a covered / not-covered table. Use before marking a story done or when reviewing a PR that claims to implement a story.
---

<!-- Thin wrapper for Antigravity. The procedure itself is .claude/skills/check-story/SKILL.md, the single source shared with Claude Code. -->

Read `.claude/skills/check-story/SKILL.md` and follow it exactly; ignore its YAML frontmatter.
Wherever it says `$ARGUMENTS`, use the text the user wrote after `/check-story` (expected: US-xx).
If nothing was given, ask for it before doing anything else.
