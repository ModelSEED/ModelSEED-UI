---
description: Capture a todo item for later
argument-hint: "<description> [--priority high|medium|low]"
updated_at: 2026-03-03T13:45:14-06:00
---

# /add-todo Workflow

<objective>
Quickly capture an idea, task, or issue without interrupting current work flow.
</objective>

<context>
**Item:** $ARGUMENTS (the todo description)

**Flags:**
- `--priority high|medium|low` — Set priority (default: medium)

**Output:**
- `.gsd/TODO.md` — Accumulated todo items
</context>

<process>

## 1. Parse Arguments

Extract:
- Todo description
- Priority (default: medium)

---

## 2. Ensure TODO.md Exists

```powershell
if (-not (Test-Path ".gsd/TODO.md")) {
    # Create with header
}
```

---

## 3. Add Todo Item

Append to `.gsd/TODO.md`:

```markdown
- [ ] {description} `{priority}` — {date}
```

---

## 4. Confirm

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TODO ADDED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{description}
Priority: {priority}

───────────────────────────────────────────────────────

/check-todos — see all pending items

───────────────────────────────────────────────────────
```

</process>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
