---
description: Insert a phase between existing phases (renumbers subsequent)
argument-hint: "<position> <phase-name>"
updated_at: 2026-03-03T13:45:14-06:00
---

# /insert-phase Workflow

<objective>
Insert a new phase at a specific position, renumbering all subsequent phases.
</objective>

<process>

## 1. Parse Arguments

Extract:
- **Position** — Where to insert (e.g., 2 inserts before current Phase 2)
- **Name** — Phase title

---

## 2. Validate Position

**PowerShell:**
```powershell
$totalPhases = (Select-String -Path ".gsd/ROADMAP.md" -Pattern "### Phase \d+").Count
if ($position -lt 1 -or $position -gt $totalPhases + 1) {
    Write-Error "Invalid position. Valid: 1-$($totalPhases + 1)"
}
```

**Bash:**
```bash
total_phases=$(grep -c "### Phase [0-9]" ".gsd/ROADMAP.md")
if [ "$position" -lt 1 ] || [ "$position" -gt $((total_phases + 1)) ]; then
    echo "Error: Invalid position. Valid: 1-$((total_phases + 1))" >&2
fi
```

---

## 3. Gather Phase Information

Ask for:
- **Objective** — What this phase achieves
- **Dependencies** — What it needs from earlier phases

---

## 4. Renumber Existing Phases

For phases >= position, increment phase number by 1.

**Also update:**
- Phase directory names (`.gsd/phases/{N}/`)
- References in PLAN.md files
- Dependencies in ROADMAP.md

---

## 5. Insert New Phase

Add at position with correct numbering.

---

## 6. Update STATE.md

If currently in a phase >= position, update position reference.

---

## 7. Commit

```bash
git add -A
git commit -m "docs: insert phase {N} - {name} (renumbered {M} phases)"
```

---

## 8. Display Result

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE INSERTED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Inserted: Phase {N}: {name}
Renumbered: Phases {N+1} through {M}

───────────────────────────────────────────────────────

▶ NEXT

/plan {N} — Create plans for new phase
/progress — See updated roadmap

───────────────────────────────────────────────────────
```

</process>

<warning>
Phase insertion can be disruptive. Consider:
- In-progress phases may have commits referencing old numbers
- Existing plans reference phase numbers
- Use sparingly and early in milestone lifecycle
</warning>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
