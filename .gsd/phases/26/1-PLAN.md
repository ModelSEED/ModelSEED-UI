---
phase: 26
plan: 1
wave: 1
---

# Plan 26.1: Functional Visualize Data Panel Translation

## Objective
Translate legacy "Visualize Data" interaction on model detail into a functional modern UI that shows FBA, GapFill, and Expression content states under the dropdown, while keeping existing Run FBA/Run Gapfill button behavior unchanged.

## Context
- .gsd/phases/26/RESEARCH.md
- app/model/[...path]/page.tsx
- components/ui/ModelDetailHeader.tsx
- lib/api/modelseed.ts
- external/ModelSEED-UI/app/views/data/model.html
- external/ModelSEED-UI/app/views/lists/model-fbas.html
- external/ModelSEED-UI/app/views/lists/model-gapfills.html
- external/ModelSEED-UI/app/views/lists/expanded-expression.html

## Tasks

<task type="auto">
  <name>Wire Visualize Data dropdown to render model-scoped panels</name>
  <files>app/model/[...path]/page.tsx, components/ui/ModelDetailHeader.tsx</files>
  <action>
    Make the Visualize Data selector drive conditional content rendering below the model header.
    - Preserve option set: FBA, Expression, GapFill.
    - Show explicit legacy-style empty states when no data exists.
    - Keep current Run FBA/Run Gapfilling buttons unchanged.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" "components/ui/ModelDetailHeader.tsx"</verify>
  <done>Changing Visualize Data selection reliably changes the rendered panel state.</done>
</task>

<task type="auto">
  <name>Bind FBA/Gapfill/Expression data sources to Visualize Data panels</name>
  <files>app/model/[...path]/page.tsx, lib/api/modelseed.ts</files>
  <action>
    Populate each Visualize Data panel using available model data APIs and fields.
    - Use model-scoped FBA and gapfill APIs for list rendering.
    - Use expression data from model payload when present, otherwise show deterministic "No expression data" state.
    - Surface API failures with concise, non-crashing user messages.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" "lib/api/modelseed.ts" && npm run build</verify>
  <done>Visualize Data panels load and render without breaking model detail page rendering.</done>
</task>

## Success Criteria
- [ ] Visualize Data dropdown is functionally translated.
- [ ] FBA, GapFill, and Expression views show correct empty/data/error states.

## Timestamp Log
- Created: 2026-03-16 11:07:14 CDT
