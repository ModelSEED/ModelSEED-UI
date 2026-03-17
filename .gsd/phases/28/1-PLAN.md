---
phase: 28
plan: 1
wave: 1
---

# Plan 28.1: FBA, Gapfill, and Genome Detail Pages

## Objective
Replace the three "under construction" placeholder pages (`/fba/[...path]`, `/gapfill/[...path]`, `/genome/[...path]`) with functional detail views matching the legacy UI's data display patterns. These pages are already routed — they just need real content.

## Context
- .gsd/SPEC.md
- app/fba/[...path]/page.tsx — current placeholder (28 lines)
- app/gapfill/[...path]/page.tsx — current placeholder (28 lines)
- app/genome/[...path]/page.tsx — current placeholder (28 lines)
- external/ModelSEED-UI/app/views/data/fba.html — legacy FBA view (3 tabs: Reaction Fluxes, Exchange Fluxes, Pathways)
- external/ModelSEED-UI/app/views/data/gapfill.html — legacy Gapfill view (reactions table)
- external/ModelSEED-UI/app/views/data/genome.html — legacy Genome view (Features + Annotations tabs)
- lib/api/modelseed.ts — getModelFbaFromApi, listModelGapfillsFromApi already exist
- lib/api/workspace.ts — workspaceGet for genome data
- components/layout/DataControlHeader.tsx — standard toolbar for DataGrid
- components/ui/ChemicalEquation.tsx — for reaction formatting

## Tasks

<task type="auto">
  <name>Implement FBA detail page</name>
  <files>app/fba/[...path]/page.tsx</files>
  <action>
    Replace the placeholder with a functional FBA detail view:
    1. Parse the workspace path from `params.path` (catch-all route gives segments)
    2. Use `getModelFbaFromApi(ref)` to fetch FBA data. The FBA data is a dict with keys like `FBAReactionVariables`, `FBACompoundVariables`, `FBAMetaboliteProductionResults`, etc.
    3. Extract the parent model ref from the path (strip last segment for the FBA object name)
    4. Display breadcrumb: My Models > ModelName > FBA Name
    5. Build three tabs matching legacy:
       - **Reaction Fluxes**: DataGrid with columns: Reaction, Name, Flux, Min, Max, Class
       - **Exchange Fluxes**: DataGrid with columns: Compound, Name, Flux, Min, Max, Class  
       - **Pathways**: DataGrid with columns: Map, Name (if pathway data available)
    6. Use DataControlHeader as toolbar in DataGrid
    7. Handle loading/error states
    8. The FBA data shape from `/api/models/fba?ref=<modelRef>` returns model-level FBA. The page at `/fba/<fbaRef>` should fetch the specific FBA object via workspace if needed, or if backend only supports model-level FBA, show the model's FBA data with a note.
    - IMPORTANT: Keep the same catch-all `[...path]` URL pattern — URLs must match legacy exactly (e.g., `/fba/user/models/MyModel/fba/gf.0`)
  </action>
  <verify>grep -c "DataGrid" app/fba/\[...path\]/page.tsx</verify>
  <done>FBA detail page renders tabbed data tables with Reaction Fluxes and Exchange Fluxes from API data</done>
</task>

<task type="auto">
  <name>Implement Gapfill detail page</name>
  <files>app/gapfill/[...path]/page.tsx</files>
  <action>
    Replace the placeholder with a functional Gapfill detail view:
    1. Parse workspace path from params
    2. Extract parent model ref from the path
    3. Use `listModelGapfillsFromApi(modelRef)` to get all gapfills, then filter to show the specific gapfill matching the path
    4. Display breadcrumb: My Models > ModelName > Gapfill Name
    5. Build a single tab with a DataGrid showing gapfill reactions:
       - Columns: Reaction ID (linked to /biochem/reactions/<id>), Name, Direction, Compartment
    6. Use DataControlHeader as toolbar
    7. Handle loading/error states
    - IMPORTANT: URLs must match legacy exactly (e.g., `/gapfill/user/models/ModelName/gapfilling/gf.0`)
  </action>
  <verify>grep -c "DataGrid" app/gapfill/\[...path\]/page.tsx</verify>
  <done>Gapfill detail page renders a reactions table from the gapfill data</done>
</task>

<task type="auto">
  <name>Implement Genome detail page</name>
  <files>app/genome/[...path]/page.tsx</files>
  <action>
    Replace the placeholder with a functional Genome detail view:
    1. Parse workspace path from params
    2. Use `workspaceGet([path])` to fetch genome object data
    3. Display heading: "Genome" with genome name
    4. Build two tabs matching legacy:
       - **Features**: DataGrid with columns: Feature ID, Type, Function, Location
       - **Annotations**: DataGrid with columns: Feature, Role, Subsystem
    5. Parse genome object which contains `features` array — each feature has id, type, function, location
    6. Use DataControlHeader as toolbar
    7. Handle loading/error states with a helpful message if workspace returns 500
    - IMPORTANT: URLs must match legacy exactly (e.g., `/genome/plantseed/Genomes/Athaliana`)
  </action>
  <verify>grep -c "DataGrid" app/genome/\[...path\]/page.tsx</verify>
  <done>Genome detail page renders Features and Annotations tabs from workspace data</done>
</task>

## Success Criteria
- [ ] `/fba/<ref>` shows tabbed FBA data instead of "under construction"
- [ ] `/gapfill/<ref>` shows gapfill reactions table instead of "under construction"
- [ ] `/genome/<ref>` shows genome features/annotations instead of "under construction"
- [ ] All three pages use DataGrid + DataControlHeader consistent with rest of app
- [ ] Build passes with no new TypeScript errors

## Timestamp Log
- Created: 2026-03-17 09:23:45 -05:00
