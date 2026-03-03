---
description: Show recent GSD changes and new features
updated_at: 2026-03-03T13:45:14-06:00
---

# /whats-new Workflow

<objective>
Display recent changes, new features, and improvements to GSD for Antigravity.
</objective>

<process>

## 1. Read CHANGELOG.md

```bash
# Read the latest version section from CHANGELOG.md
head -50 CHANGELOG.md
```

## 2. Display Recent Changes

Display the latest version(s) from CHANGELOG.md:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► WHAT'S NEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VERSION 1.2.0 — 2026-01-17
══════════════════════════

🌍 CROSS-PLATFORM SUPPORT

• All 16 workflow files now have Bash equivalents
• README with dual-syntax Getting Started
• /web-search workflow for research

───────────────────────────────────────────────────────

VERSION 1.1.0 — 2026-01-17
══════════════════════════

📚 TEMPLATE PARITY & EXAMPLES

• 14 new templates (DEBUG.md, UAT.md, etc.)
• Examples directory with walkthroughs
• /add-todo and /check-todos workflows
• Cross-references between workflows

───────────────────────────────────────────────────────

VERSION 1.0.0 — 2026-01-17
══════════════════════════

🎉 INITIAL RELEASE

Full port of GSD methodology to Google Antigravity.
• 24 workflows, 8 skills, 14 templates
• 4 core rules: Planning Lock, State Persistence,
  Context Hygiene, Empirical Validation

───────────────────────────────────────────────────────

📚 Full changelog: CHANGELOG.md

───────────────────────────────────────────────────────
```

</process>

<related>
## Related

### Workflows
| Command | Relationship |
|---------|--------------|
| `/update` | Update GSD to latest version |
| `/help` | List all commands |

</related>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
