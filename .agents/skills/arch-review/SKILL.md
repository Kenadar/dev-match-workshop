---
name: arch-review
description: Review the current branch (or the given ref range) against DevMatch ADRs and architecture docs. Read-only. Use before opening a PR or when asked for an architecture review.
---

<!-- Antigravity entry point for the architecture-reviewer subagent (.agents/agents/architecture-reviewer.md). -->

Delegate to the `architecture-reviewer` subagent. Scope: the text the user wrote after `/arch-review`;
if empty, the changes of the current branch against main (`git diff main...HEAD`).
Return its report as is. Do not edit any file.
