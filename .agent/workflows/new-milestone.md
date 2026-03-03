---
description: Create a new milestone with phases
argument-hint: "<milestone-name>"
updated_at: 2026-03-03T13:45:14-06:00
---

# /new-milestone Workflow

<objective>
Define a new milestone with goal, phases, and success criteria.
</objective>

<process>

## 1. Validate SPEC Exists

**PowerShell:**
```powershell
if (-not (Test-Path ".gsd/SPEC.md")) {
    Write-Error "SPEC.md required. Run /new-project first."
}
```

**Bash:**
```bash
if [ ! -f ".gsd/SPEC.md" ]; then
    echo "Error: SPEC.md required. Run /new-project first." >&2
fi
```

---

## 2. Gather Milestone Information

Ask for:
- **Name** — Milestone identifier (e.g., "v1.0", "MVP", "Beta")
- **Goal** — What does this milestone achieve?
- **Must-haves** — Non-negotiable deliverables
- **Nice-to-haves** — Optional if time permits

---

## 3. Generate Phase Breakdown

Based on goal and must-haves, suggest phases:

```markdown
## Suggested Phases

Phase 1: {Foundation/Setup}
Phase 2: {Core Feature A}
Phase 3: {Core Feature B}
Phase 4: {Integration/Polish}
Phase 5: {Verification/Launch}
```

Ask user to confirm or modify.

---

## 4. Update ROADMAP.md

```markdown
# ROADMAP.md

> **Current Milestone**: {name}
> **Goal**: {goal}

## Must-Haves
- [ ] {must-have 1}
- [ ] {must-have 2}

## Phases

### Phase 1: {name}
**Status**: ⬜ Not Started
**Objective**: {description}

### Phase 2: {name}
**Status**: ⬜ Not Started
**Objective**: {description}

...
```

---

## 5. Update STATE.md

```markdown
## Current Position
- **Milestone**: {name}
- **Phase**: Not started
- **Status**: Milestone planned
```

---

## 6. Commit

```bash
git add .gsd/ROADMAP.md .gsd/STATE.md
git commit -m "docs: create milestone {name}"
```

---

## 7. Offer Next Steps

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► MILESTONE CREATED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Milestone: {name}
Phases: {N}

───────────────────────────────────────────────────────

▶ NEXT

/plan 1 — Create Phase 1 execution plans

───────────────────────────────────────────────────────
```

</process>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
