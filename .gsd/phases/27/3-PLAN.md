---
phase: 27
plan: 3
wave: 2
---

# Plan 27.3: Formatting/Link Audit and Validation Closure

## Objective
Run a cross-cutting audit of formatting, links, and legacy parity across model-detail, My Models, My Media, and reference biochem pages, then produce a final validation-ready report and fix any remaining high-severity inconsistencies.

## Context
- .gsd/phases/26/PARITY-INVENTORY.md
- .gsd/phases/27/1-PLAN.md
- .gsd/phases/27/2-PLAN.md
- app/model/[...path]/page.tsx
- app/(user-data)/my-models/page.tsx
- app/(user-data)/myMedia/page.tsx
- app/(reference-data)/list-media/page.tsx
- app/(reference-data)/biochem/compounds/page.tsx
- app/(reference-data)/biochem/reactions/page.tsx

## Tasks

<task type="auto">
  <name>Create formatting and link audit matrix for user flows</name>
  <files>.gsd/phases/27/FORMATTING-LINK-AUDIT.md</files>
  <action>
    Document how formatting and links behave across key user flows and pages.
    - List each relevant table/section (model-detail tabs, My Models, My Media, reference biochem pages) and note formatting status (OK, inconsistent, broken).
    - Note link behavior for IDs, genome refs, media refs, jobs, and any other important cross-links.
    - Flag any high-severity inconsistencies that would confuse a validation user comparing against legacy.
  </action>
  <verify>Verify `.gsd/phases/27/FORMATTING-LINK-AUDIT.md` exists and covers model-detail, user data, and biochem reference flows.</verify>
  <done>The audit matrix clearly shows where formatting and link behavior are aligned vs inconsistent, suitable for validation review.</done>
</task>

<task type="auto">
  <name>Fix high-severity formatting/link inconsistencies found in audit</name>
  <files>.gsd/phases/27/FORMATTING-LINK-AUDIT.md, app/model/[...path]/page.tsx, app/(user-data)/my-models/page.tsx, app/(user-data)/myMedia/page.tsx</files>
  <action>
    Apply targeted fixes for the most user-visible and validation-blocking gaps called out in the audit.
    - Prioritize broken or misleading links (e.g., IDs that look clickable but are not, or routes that 404).
    - Address obvious formatting regressions where legacy behavior is clearly better (e.g., chemical equations rendered inconsistently between reference and model tables).
    - Keep the scope to fixes that do not require backend changes and avoid expanding into new features.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" "app/(user-data)/my-models/page.tsx" "app/(user-data)/myMedia/page.tsx" && npm run build</verify>
  <done>All audit-marked high-severity formatting/link inconsistencies are resolved or explicitly documented as blocked by backend constraints.</done>
</task>

## Success Criteria
- [ ] A single audit document clearly captures formatting and link behavior across the main user flows.
- [ ] There are no remaining high-severity formatting/link inconsistencies that would confuse validation users or contradict the legacy UI’s behavior (excluding backend-blocked paths).

## Timestamp Log
- Created: 2026-03-16 11:39:55 CDT
