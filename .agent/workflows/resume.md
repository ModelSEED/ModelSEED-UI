---
description: Restore context from previous session
updated_at: 2026-03-03T13:45:14-07:59
---

# /resume Workflow

<objective>
Start a new session with full context from where we left off.
</objective>

<process>

## 1. Load Saved State

Read `.gsd/STATE.md` completely.

---

## 2. Display Context

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESUMING SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAST POSITION
─────────────
Phase: {phase from STATE.md}
Task: {task from STATE.md}
Status: {status when paused}

───────────────────────────────────────────────────────

CONTEXT FROM LAST SESSION
─────────────────────────
{Context dump content from STATE.md}

───────────────────────────────────────────────────────

BLOCKERS
────────
{Blockers from STATE.md, or "None"}

───────────────────────────────────────────────────────

NEXT STEPS (from last session)
──────────────────────────────
1. {First priority}
2. {Second priority}
3. {Third priority}

───────────────────────────────────────────────────────
```

---

## 3. Load Recent Journal

Show last entry from `.gsd/JOURNAL.md`:
- What was accomplished
- Handoff notes
- Any issues encountered

---

## 4. Check for Conflicts

```bash
# Check for uncommitted changes
git status --porcelain
```

**If changes found:**
```
⚠️ UNCOMMITTED CHANGES DETECTED

{list of modified files}

These may be from the previous session.
Review before proceeding.
```

---

## 5. Update State

Mark session as active in `.gsd/STATE.md`:
```markdown
**Status**: Active (resumed {timestamp})
```

---

## 6. Suggest Action

```
───────────────────────────────────────────────────────

▶ READY TO CONTINUE

Suggested action based on state:

{One of:}
• /execute {N} — Continue phase execution
• /verify {N} — Verify completed phase
• /plan {N} — Create plans for phase
• /progress — See full roadmap status

───────────────────────────────────────────────────────

💡 Fresh session = fresh perspective

You have all the context you need.
The previous struggles are documented.
Time to solve this with fresh eyes.

───────────────────────────────────────────────────────
```

</process>

<fresh_context_advantage>
A resumed session has advantages:

1. **No accumulated confusion** — You see the problem clearly
2. **Documented failures** — You know what NOT to try
3. **Hypothesis preserved** — Pick up where logic left off
4. **Full context budget** — 200k tokens of fresh capacity

Often the first thing a fresh context sees is the obvious solution that a tired context missed.
</fresh_context_advantage>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST rigorously track the date and time.
- **Do NOT overwrite `updated_at` frontmatter** or any existing timestamps. Leave `updated_at` in frontmatter alone if it exists.
- **New Files**: You MUST add a `## Timestamp Log` section at the bottom of the file, with the first entry being `- Created: YYYY-MM-DD HH:MM:SS TZ`.
- **File Updates**: You MUST append a new line to the `## Timestamp Log` section at the bottom of the file (e.g., `- Updated: YYYY-MM-DD HH:MM:SS TZ - <brief description of changes>`). If the section doesn't exist, create it.
**Failure to append timestamps instead of overwriting them is a violation of the protocol.**

</timestamp_tracking>
