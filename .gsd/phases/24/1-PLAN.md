---
phase: 24
plan: 1
wave: 1
---

# Plan 24.1: Apply New Endpoint Wrappers to User Pages

## Objective
Adopt newly added `modelseed.ts` endpoint wrappers in the most relevant pages so page behavior aligns with documented backend capabilities and legacy parity expectations.

## Context
- .gsd/phases/24/RESEARCH.md
- lib/api/modelseed.ts
- app/(user-data)/myMedia/page.tsx
- app/model/[...path]/page.tsx
- external/ModelSEED-UI/app/views/my-media.html
- external/ModelSEED-UI/app/views/my-models.html

## Tasks

<task type="auto">
  <name>Wire media export endpoint into My Media page commands</name>
  <files>app/(user-data)/myMedia/page.tsx, lib/api/modelseed.ts</files>
  <action>
    Add row-level command usage for `/api/media/export` in `myMedia`.
    - Use `exportMediaFromApi()` from `modelseed.ts`.
    - Preserve current table visual structure and non-destructive behavior.
    - Show clear success/error feedback per row export action.
  </action>
  <verify>npx eslint "app/(user-data)/myMedia/page.tsx" "lib/api/modelseed.ts"</verify>
  <done>My Media table provides API-backed export action without direct fetch calls in the component.</done>
</task>

<task type="auto">
  <name>Expose model edit-history endpoint status in Model Detail</name>
  <files>app/model/[...path]/page.tsx, lib/api/modelseed.ts</files>
  <action>
    Use `listModelEditsFromApi()` to surface edit-history availability in model detail.
    - Add resilient handling for backend 501/unavailable responses.
    - Keep model load flow stable and avoid blocking page rendering on edit-history fetch.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" "lib/api/modelseed.ts"</verify>
  <done>Model detail page reflects edit-history API state without regressions in model tab rendering.</done>
</task>

## Success Criteria
- [ ] `myMedia` uses the new export endpoint wrapper from `modelseed.ts`.
- [ ] Model detail consumes edit-history endpoint wrapper with robust fallback behavior.

## Timestamp Log
- Created: 2026-03-16 09:46:46 CDT
