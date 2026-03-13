---
name: audit-milestone
description: Audit a milestone for quality and completeness
argument-hint: "[milestone-name]"
updated_at: 2026-03-03T13:45:14-06:00
---

# /audit-milestone Workflow

<objective>
Review a completed (or in-progress) milestone for quality, completeness, and lessons learned.
</objective>

<process>

## 1. Load Milestone Context

If milestone name provided, load from archive:
```powershell
Get-Content ".gsd/milestones/{name}-SUMMARY.md"
```

If no name, audit current milestone from ROADMAP.md.

---

## 2. Check Must-Haves Verification

For each must-have in the milestone:
- Was it verified with empirical evidence?
- Is the evidence still valid?
- Any regressions since completion?

---

## 3. Review Technical Debt

Check TODO.md and DECISIONS.md for:
- Deferred items during this milestone
- Technical debt acknowledged
- Items that should be addressed

---

## 4. Analyze Phase Quality

For each phase:
- Review VERIFICATION.md
- Check for gap closures (were there many?)
- Note recurring issues

---

## 5. Generate Audit Report

```markdown
# Milestone Audit: {name}

**Audited:** {date}

## Summary
| Metric | Value |
|--------|-------|
| Phases | {N} |
| Gap closures | {M} |
| Technical debt items | {K} |

## Must-Haves Status
| Requirement | Verified | Evidence |
|-------------|----------|----------|
| {req 1} | ✅ | {link} |
| {req 2} | ✅ | {link} |

## Concerns
- {concern 1}
- {concern 2}

## Recommendations
1. {recommendation 1}
2. {recommendation 2}

## Technical Debt to Address
- [ ] {item 1}
- [ ] {item 2}
```

---

## 6. Offer Actions

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUDIT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Milestone: {name}
Health: {GOOD | CONCERNS | NEEDS ATTENTION}

───────────────────────────────────────────────────────

▶ ACTIONS

/plan-milestone-gaps — Create plans to address gaps
/add-todo — Capture debt items for later

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
