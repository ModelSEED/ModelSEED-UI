---
phase: 27
plan: 1
wave: 1
---

# Plan 27.1: Model Detail Formatting and Cross-Link Parity

## Objective
Align model-detail and user-model tables with legacy chemical formatting and cross-link behavior so that reactions, compounds, biomass entries, pathways, and genome refs feel consistent with both the legacy UI and the biochem reference pages.

## Context
- .gsd/phases/26/PARITY-INVENTORY.md
- app/model/[...path]/page.tsx
- app/(user-data)/my-models/page.tsx
- app/(reference-data)/biochem/compounds/page.tsx
- app/(reference-data)/biochem/reactions/page.tsx
- external/ModelSEED-UI/app/views/data/model.html
- external/ModelSEED-UI/app/views/data/model-generic.html

## Tasks

<task type="auto">
  <name>Normalize chemical equation and formula formatting for model-detail tables</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Introduce and apply a shared formatting helper for equations and formulas so user-model tables visually match legacy expectations.
    - Reuse or extend the existing v1-alpha formatting utilities created in Phase 13 instead of inventing a separate pattern.
    - Apply consistent formatting for model reactions (equation), compounds (formula/charge), and biomass component rows.
    - Preserve current grid performance and avoid breaking reference biochem tables.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" && npm run build</verify>
  <done>Model-detail reactions, compounds, and biomass tables render chemically formatted equations/formulas consistent with reference biochem tables.</done>
</task>

<task type="auto">
  <name>Add cross-links from model-detail to reference/related detail pages</name>
  <files>app/model/[...path]/page.tsx, app/(reference-data)/biochem/compounds/page.tsx, app/(reference-data)/biochem/reactions/page.tsx</files>
  <action>
    Wire IDs in model-detail tables to the appropriate detail routes and ensure links behave predictably.
    - Make reaction IDs clickable and route to `/biochem/reactions/[id]` using the same encode/decode behavior as existing biochem routes.
    - Make compound IDs clickable and route to `/biochem/compounds/[id]` with stable loading/error states.
    - If possible, make the Genome Ref in the Overview tab link to the appropriate `/genome/...` detail page; otherwise, add clear text indicating when no valid genome route is available.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" && npm run build</verify>
  <done>Reaction, compound, and (where possible) genome references from the model-detail page navigate to working detail pages without breaking existing flows.</done>
</task>

## Success Criteria
- [ ] Chemical equations and formulas in model-detail tables match the formatting style used in biochem reference tables.
- [ ] Reaction and compound IDs in model-detail tables are clickable and lead to stable detail pages.
- [ ] Genome refs in the Overview tab either link to a valid genome detail page or show an explicit, non-broken non-link state.

## Timestamp Log
- Created: 2026-03-16 11:39:55 CDT
