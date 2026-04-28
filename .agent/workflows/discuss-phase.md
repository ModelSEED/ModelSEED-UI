---
name: discuss-phase
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
**CRITICAL REQUIREMENT:** Whenever you create or update ANY Markdown file as part of this workflow, you MUST rigorously track the date and time.
- **Do NOT overwrite `updated_at` frontmatter** or any existing timestamps. Leave `updated_at` in frontmatter alone if it exists.
- **New Files**: You MUST add a `## Timestamp Log` section at the bottom of the file, with the first entry being `- Created: YYYY-MM-DD HH:MM:SS TZ`.
- **File Updates**: You MUST append a new line to the `## Timestamp Log` section at the bottom of the file (e.g., `- Updated: YYYY-MM-DD HH:MM:SS TZ - <brief description of changes>`). If the section doesn't exist, create it.
**Failure to append timestamps instead of overwriting them is a violation of the protocol.**

</timestamp_tracking>
