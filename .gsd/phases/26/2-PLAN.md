---
phase: 26
plan: 2
wave: 2
---

# Plan 26.2: Model Detail Surface Parity (Panels, Drill-Ins, Downloads)

## Objective
Close major model-detail UI parity gaps by translating missing detail/drill-in surfaces from legacy model page into modern equivalents.

## Context
- .gsd/phases/26/RESEARCH.md
- app/model/[...path]/page.tsx
- components/ui/ModelDetailHeader.tsx
- external/ModelSEED-UI/app/views/data/model.html
- external/ModelSEED-UI/app/views/data/model-generic.html
- app/(user-data)/my-models/page.tsx
- components/ui/DownloadModelMenu.tsx

## Tasks

<task type="auto">
  <name>Add reaction/compound detail drill-in surfaces on model page</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Implement row-level detail drill-ins for reactions and compounds inspired by legacy side panels.
    - Add click/command entry points in the relevant tabs.
    - Display expanded reaction/compound metadata without route changes.
    - Ensure keyboard/close behavior is stable.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx"</verify>
  <done>Users can open and close detail drill-ins for reaction and compound rows.</done>
</task>

<task type="auto">
  <name>Translate model-detail download/options UX into modern equivalent</name>
  <files>app/model/[...path]/page.tsx, components/ui/DownloadModelMenu.tsx, lib/api/modelseed.ts</files>
  <action>
    Provide a model-detail-local download/options surface that mirrors legacy intent.
    - Expose existing export formats from model detail context.
    - Include clear status/error feedback on export actions.
    - Keep behavior aligned with existing backend export capabilities.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" "components/ui/DownloadModelMenu.tsx" "lib/api/modelseed.ts" && npm run build</verify>
  <done>Model detail includes a translated download/options interaction that works end-to-end.</done>
</task>

## Success Criteria
- [ ] Reaction/compound drill-ins are available in model detail.
- [ ] Model detail has a functional download/options surface.

## Timestamp Log
- Created: 2026-03-16 11:07:14 CDT
