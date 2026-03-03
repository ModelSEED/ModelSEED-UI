---
description: Show current position in roadmap and next steps
updated_at: 2026-03-03T13:45:14-07:59
---

# /progress Workflow

<objective>
Quick status check — where are we and what's next?
</objective>

<process>

## 1. Load Current State

Read:
- `.gsd/STATE.md` — Current position
- `.gsd/ROADMAP.md` — Phase statuses

---

## 2. Calculate Progress

Count phases:
- Total phases
- Completed phases (✅)
- In progress (🔄)
- Blocked (⏸️)
- Not started (⬜)

---

## 3. Display Status

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {project name from SPEC.md}
Milestone: {milestone from ROADMAP.md}

───────────────────────────────────────────────────────

PHASES

✅ Phase 1: {Name}
✅ Phase 2: {Name}
🔄 Phase 3: {Name} ← CURRENT
⬜ Phase 4: {Name}
⬜ Phase 5: {Name}

Progress: {completed}/{total} ({percentage}%)

───────────────────────────────────────────────────────

CURRENT TASK

{Current task from STATE.md, or "None"}

───────────────────────────────────────────────────────

BLOCKERS

{Blockers from STATE.md, or "None"}

───────────────────────────────────────────────────────

▶ NEXT UP

{Recommended next action based on state}

───────────────────────────────────────────────────────
```

---

## 4. Suggest Action

Based on status, recommend:

| State | Recommendation |
|-------|----------------|
| Phase in progress | `/execute {N}` to continue |
| Phase done, not verified | `/verify {N}` |
| Verification failed | `/execute {N} --gaps-only` |
| All phases complete | Celebrate! 🎉 |
| No phases started | `/plan 1` to begin |
| SPEC not finalized | Complete SPEC.md first |

</process>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
