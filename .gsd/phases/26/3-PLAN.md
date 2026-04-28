---
phase: 26
plan: 3
wave: 2
---

# Plan 26.3: Translation Inventory Closure and Validation Pass

## Objective
Produce an explicit translated-vs-untranslated inventory for model-detail legacy features and run browser/API validation checks to support full parity sign-off.

## Context
- .gsd/phases/26/RESEARCH.md
- app/model/[...path]/page.tsx
- external/ModelSEED-UI/app/views/data/model.html
- external/ModelSEED-UI/app/views/data/model-generic.html
- .gsd/STATE.md
- .gsd/ROADMAP.md

## Tasks

<task type="auto">
  <name>Create model-detail parity inventory artifact</name>
  <files>.gsd/phases/26/PARITY-INVENTORY.md, app/model/[...path]/page.tsx, external/ModelSEED-UI/app/views/data/model.html</files>
  <action>
    Write a concrete feature matrix covering legacy model-detail surfaces.
    - For each feature, mark: translated, partially translated, or intentionally deferred.
    - Include rationale for any deferred/unsupported features.
    - Keep inventory specific to model detail validation scope.
  </action>
  <verify>Verify `.gsd/phases/26/PARITY-INVENTORY.md` exists and lists all legacy model-detail feature groups.</verify>
  <done>Parity inventory is explicit enough to drive final validation review.</done>
</task>

<task type="auto">
  <name>Run model-detail validation checks and capture outcomes</name>
  <files>.gsd/phases/26/VERIFICATION.md, app/model/[...path]/page.tsx</files>
  <action>
    Perform non-destructive validation for the translated model-detail flow.
    - Validate Visualize Data panel behavior and tab interactions in browser.
    - Validate data/error states for FBA/GapFill/Expression views.
    - Record PASS/PARTIAL/FAIL evidence in Phase 26 verification report.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" && npm run build</verify>
  <done>Phase 26 has an evidence-backed verification report for model-detail parity status.</done>
</task>

## Success Criteria
- [ ] Model-detail parity inventory is documented in phase artifacts.
- [ ] Validation evidence exists for translated features and explicit remaining gaps.

## Timestamp Log
- Created: 2026-03-16 11:07:14 CDT
