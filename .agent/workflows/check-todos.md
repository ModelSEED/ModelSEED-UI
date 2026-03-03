---
description: List all pending todo items
argument-hint: "[--all] [--priority high|medium|low]"
updated_at: 2026-03-03T13:45:14-06:00
---

# /check-todos Workflow

<objective>
Display pending todo items, optionally filtered by priority or status.
</objective>

<context>
**Flags:**
- `--all` — Show completed items too
- `--priority high|medium|low` — Filter by priority

**Input:**
- `.gsd/TODO.md` — Todo items
</context>

<process>

## 1. Load TODO.md

```powershell
if (-not (Test-Path ".gsd/TODO.md")) {
    Write-Output "No todos found. Use /add-todo to create one."
    exit
}

Get-Content ".gsd/TODO.md"
```

---

## 2. Parse and Filter

Count items by status:
- `- [ ]` = pending
- `- [x]` = complete

Filter by priority if flag provided.

---

## 3. Display

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TODOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PENDING ({N} items)
───────────────────
🔴 {high priority item}
🟡 {medium priority item}
🟢 {low priority item}

{If --all flag:}
COMPLETED ({M} items)
─────────────────────
✅ {completed item}

───────────────────────────────────────────────────────

/add-todo <item> — add new item

───────────────────────────────────────────────────────
```

</process>

<priority_indicators>
| Priority | Indicator |
|----------|-----------|
| high | 🔴 |
| medium | 🟡 |
| low | 🟢 |
| done | ✅ |
</priority_indicators>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
