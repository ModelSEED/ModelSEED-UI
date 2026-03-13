---
name: plan-milestone-gaps
description: Create plans to address gaps found in milestone audit
updated_at: 2026-03-03T13:45:14-06:00
---

# /plan-milestone-gaps Workflow

<objective>
Create targeted plans to address gaps, technical debt, and issues identified during milestone audit.
</objective>

<process>

## 1. Load Gap Information

Read from:
- Latest AUDIT.md or VERIFICATION.md
- TODO.md for deferred items
- DECISIONS.md for acknowledged debt

---

## 2. Categorize Gaps

| Category | Priority | Action |
|----------|----------|--------|
| Must-have failures | 🔴 High | Create fix phase |
| Technical debt | 🟡 Medium | Add to roadmap |
| Nice-to-have misses | 🟢 Low | Add to backlog |

---

## 3. Create Gap Closure Phase

Add new phase to ROADMAP.md:

```markdown
### Phase {N}: Gap Closure
**Status**: ⬜ Not Started
**Objective**: Address gaps from milestone audit

**Gaps to Close:**
- [ ] {gap 1}
- [ ] {gap 2}
```

---

## 4. Create PLAN.md for Each Gap

```markdown
---
phase: {N}
plan: fix-{gap-id}
wave: 1
gap_closure: true
---

# Fix: {Gap Description}

## Problem
{What the audit found}

## Root Cause
{Why it exists}

## Tasks

<task type="auto">
  <name>Fix {issue}</name>
  <files>{files}</files>
  <action>{fix instructions}</action>
  <verify>{original verification that failed}</verify>
  <done>{criteria}</done>
</task>
```

---

## 5. Update STATE.md

```markdown
## Gap Closure Mode
Addressing {N} gaps from milestone audit.
```

---

## 6. Commit Plans

```powershell
git add .gsd/
git commit -m "docs: create gap closure plans"
```

---

## 7. Offer Execution

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► GAP CLOSURE PLANS CREATED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gaps identified: {N}
Plans created: {M}

───────────────────────────────────────────────────────

▶ NEXT

/execute {N} --gaps-only — Execute gap closure plans

───────────────────────────────────────────────────────
```

</process>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST rigorously track the date and time.
- **Do NOT overwrite `updated_at` frontmatter** or any existing timestamps. Leave `updated_at` in frontmatter alone if it exists.
- **New Files**: You MUST add a `## Timestamp Log` section at the bottom of the file, with the first entry being `- Created: YYYY-MM-DD HH:MM:SS TZ`.
- **File Updates**: You MUST append a new line to the `## Timestamp Log` section at the bottom of the file (e.g., `- Updated: YYYY-MM-DD HH:MM:SS TZ - <brief description of changes>`). If the section doesn't exist, create it.
**Failure to append timestamps instead of overwriting them is a violation of the protocol.**

</timestamp_tracking>
