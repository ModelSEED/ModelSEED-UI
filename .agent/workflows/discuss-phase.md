---
description: Discuss a phase before planning (clarify scope and approach)
argument-hint: "<phase-number>"
updated_at: 2026-03-03T13:45:14-06:00
---

# /discuss-phase Workflow

<objective>
Interactive discussion about a phase to clarify scope, approach, and concerns before creating plans.
</objective>

<context>
Run BEFORE `/plan` when:
- Phase scope is unclear
- Multiple implementation approaches exist
- Trade-offs need user input
- Dependencies are complex
</context>

<process>

## 1. Load Phase Context

Read from ROADMAP.md:
- Phase objective
- Dependencies
- Current status

---

## 2. Analyze Requirements

From phase objective, extract:
- What needs to be built
- What constraints exist
- What decisions need to be made

---

## 3. Present Discussion Points

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► DISCUSS PHASE {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase: {name}
Objective: {objective}

───────────────────────────────────────────────────────

TOPICS TO DISCUSS

1. SCOPE CLARIFICATION
   - {question about scope}
   - {question about boundaries}

2. IMPLEMENTATION APPROACH
   Option A: {approach}
   Option B: {approach}
   Which do you prefer and why?

3. DEPENDENCIES
   - Requires: {what from previous phases}
   - Missing: {any gaps in earlier work}

4. CONCERNS
   - {potential issue}
   - {risk to flag}

───────────────────────────────────────────────────────
```

---

## 4. Gather User Input

Listen for:
- Scope decisions
- Approach preferences
- Constraints not in spec
- Priority clarifications

---

## 5. Document Decisions

Update `.gsd/DECISIONS.md`:

```markdown
## Phase {N} Decisions

**Date:** {date}

### Scope
- {decision about scope}

### Approach
- Chose: {approach}
- Reason: {rationale}

### Constraints
- {constraint identified}
```

---

## 6. Offer Next Steps

```
───────────────────────────────────────────────────────

✓ Discussion documented in DECISIONS.md

▶ NEXT

/plan {N} — Create execution plans with this context
/research-phase {N} — Deep dive on technical options

───────────────────────────────────────────────────────
```

</process>


<timestamp_tracking>

## Date & Time Tracking
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST include the current date and time in the file.
- **New Files**: Add a timestamp at the top or bottom of the file (e.g., `Created: YYYY-MM-DD HH:MM:SS TZ`).
- **File Updates**: Do not remove old timestamps. Instead, append a new timestamp indicating when the update occurred (e.g., `Update: YYYY-MM-DD HH:MM:SS TZ`). You can maintain a changelog or a simple list of update timestamps within the document.

</timestamp_tracking>
