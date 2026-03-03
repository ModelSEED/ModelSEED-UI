---
description: Mark current milestone as complete and archive
updated_at: 2026-03-03T13:45:14-07:59
---

# /complete-milestone Workflow

<objective>
Finalize the current milestone, archive documentation, and prepare for next milestone.
</objective>

<process>

## 1. Verify All Phases Complete

**PowerShell:**
```powershell
# Check ROADMAP.md for incomplete phases
Select-String -Path ".gsd/ROADMAP.md" -Pattern "Status.*Not Started|Status.*In Progress"
```

**Bash:**
```bash
# Check ROADMAP.md for incomplete phases
grep -E "Status.*Not Started|Status.*In Progress" ".gsd/ROADMAP.md"
```

**If incomplete phases found:**
```
⚠️ Cannot complete milestone — {N} phases incomplete

Run /progress to see status.
```

---

## 2. Run Final Verification

Verify all must-haves from ROADMAP.md:
- Run verification commands
- Capture evidence
- Create VERIFICATION.md if not exists

---

## 3. Generate Milestone Summary

Create `.gsd/milestones/{name}-SUMMARY.md`:

```markdown
# Milestone: {name}

## Completed: {date}

## Deliverables
- ✅ {must-have 1}
- ✅ {must-have 2}

## Phases Completed
1. Phase 1: {name} — {date}
2. Phase 2: {name} — {date}
...

## Metrics
- Total commits: {N}
- Files changed: {M}
- Duration: {days}

## Lessons Learned
{Auto-extract from DECISIONS.md and JOURNAL.md}
```

---

## 4. Archive Current State

**PowerShell:**
```powershell
# Create milestone archive
New-Item -ItemType Directory -Force ".gsd/milestones/{name}"

# Move phase-specific files
Move-Item ".gsd/phases/*" ".gsd/milestones/{name}/"
```

**Bash:**
```bash
# Create milestone archive
mkdir -p ".gsd/milestones/{name}"

# Move phase-specific files
mv .gsd/phases/* ".gsd/milestones/{name}/"
```

---

## 5. Reset for Next Milestone

Clear ROADMAP.md phases section (keep header).
Update STATE.md to show milestone complete.

---

## 6. Commit and Tag

```bash
git add -A
git commit -m "docs: complete milestone {name}"
git tag -a "{name}" -m "Milestone {name} complete"
```

---

## 7. Celebrate

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► MILESTONE COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{name}

Phases: {N} completed
Tag: {name}

───────────────────────────────────────────────────────

▶ NEXT

/new-milestone — Start next milestone
/audit-milestone {name} — Review this milestone

───────────────────────────────────────────────────────
```

</process>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
