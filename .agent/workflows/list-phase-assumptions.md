---
description: List assumptions made during phase planning
argument-hint: "<phase-number>"
updated_at: 2026-03-03T13:45:14-07:59
---

# /list-phase-assumptions Workflow

<objective>
Surface and document assumptions made during phase planning that should be validated.
</objective>

<process>

## 1. Load Phase Plans

```powershell
Get-ChildItem ".gsd/phases/{N}/*-PLAN.md"
```

---

## 2. Extract Assumptions

Scan plans for:
- Technology choices without justification
- Implied dependencies
- Expected behaviors not verified
- Time estimates
- Scope boundaries

---

## 3. Categorize Assumptions

| Category | Risk Level |
|----------|------------|
| Technical | API exists, library works, syntax correct |
| Integration | Services compatible, auth works |
| Scope | Feature boundaries, what's excluded |
| Performance | Will handle load, fast enough |
| Timeline | Estimates accurate |

---

## 4. Display Assumptions

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {N} ASSUMPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TECHNICAL
🟡 {assumption 1} — Validate before execution
🟢 {assumption 2} — Low risk

INTEGRATION
🔴 {assumption 3} — High risk, verify first

SCOPE
🟡 {assumption 4} — Confirm with user

───────────────────────────────────────────────────────

▶ ACTIONS

• Validate high-risk assumptions before /execute
• Add verified assumptions to RESEARCH.md
• Flag for user review if scope-related

───────────────────────────────────────────────────────
```

---

## 5. Offer Validation

Ask if user wants to:
- Validate specific assumptions now
- Add to TODO.md for later
- Accept and proceed

</process>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
