---
phase: 27
plan: 2
wave: 1
---

# Plan 27.2: Legacy Model-Detail Surfaces and Explicit Deferrals

## Objective
Implement or clearly defer the remaining legacy model-detail surfaces (Predictions tab, dynamic pathway tabs, organism image/links block) with modern equivalents and explicit unsupported-feature UX where backend capability is missing.

## Context
- .gsd/phases/26/PARITY-INVENTORY.md
- app/model/[...path]/page.tsx
- external/ModelSEED-UI/app/views/data/model.html
- external/ModelSEED-UI/app/views/data/model-generic.html
- external/ModelSEED-UI/app/views/genomes/plant.html

## Tasks

<task type="auto">
  <name>Design and implement modern UX for legacy Predictions/dynamic pathway tabs or mark them deferred</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Decide, per feature, whether to implement a minimal modern equivalent or clearly surface it as unsupported.
    - For plant-only Predictions: either add a simple, data-backed tab if the backend exposes a compatible endpoint, or show an explicit "Not yet supported" stub describing what the legacy did.
    - For dynamic pathway tabs: add a modern representation (e.g., a “Pathway Maps” summary panel) or a clear message that dynamic map tabs are not yet supported in the v1-beta UI.
    - Ensure any new stubs are visually consistent with existing alerts/empty states and do not break current routing.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" && npm run build</verify>
  <done>Remaining legacy model-detail surfaces are either functionally implemented or explicitly marked as deferred with clear user-facing messaging.</done>
</task>

<task type="auto">
  <name>Restore or explicitly replace organism image and external links block</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Bring back the right-rail organism image and external links behavior in a modern, data-driven way.
    - Use fields already available on the model/genome object (image URL, organism name, external links) where possible rather than introducing new backend contracts.
    - Place the block in a way that does not collide with the Visualize Data and tables layout (e.g., a right-column card above the drawer).
    - If required data is not available in the modern API, surface a compact “Links not yet available” stub instead of leaving the area empty.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" && npm run build</verify>
  <done>The model-detail page includes either a working organism image/links block or a clear placeholder indicating that legacy links are not yet available.</done>
</task>

## Success Criteria
- [ ] Users can see whether the Predictions and dynamic pathway surfaces are implemented or intentionally deferred.
- [ ] The modern model-detail page contains a clearly defined organism image/links area that does not break layout or navigation.

## Timestamp Log
- Created: 2026-03-16 11:39:55 CDT
