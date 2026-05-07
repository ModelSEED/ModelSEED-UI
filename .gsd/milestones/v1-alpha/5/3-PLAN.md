---
phase: 5
plan: 3
---

# Plan 5.3: Public Plant Models & Subsystems DataGrids

## Objective
Implement the "Public Plant Models" and "Subsystems" pages under the `/reference-data` route using the MUI DataGrid and the new Workspace API fetching logic.

## Details
1. **Public Plant Models (`app/reference-data/plants/page.tsx`)**:
   - Use `useQuery` via React Query to fetch data using `workspaceLs(['/plantseed/plantseed/'])`.
   - The Workspace API returns metadata tuples. Extract the organism lists. In legacy, it listed nested modelfolders inside `/plantseed/plantseed/`. Note: we verified `Workspace.ls` returns `result[0]["/plantseed/plantseed/"]` containing modelfolder metadata.
   - Implement an MUI DataGrid with columns matching legacy: ModelID (Genome Name), Species, SpeciesDomain, Reactions, Genes, FBA, Gapfilling, ModificationDate.
   - The properties are inside index 7 (the dict) of the returned arrays.

2. **Subsystems (`app/reference-data/subsystems/page.tsx`)**:
   - Use `useQuery` via React Query to fetch data using `workspaceGet(['/plantseed/Data/annotation_overview'])`.
   - The JSON object returned needs to be parsed (`fromjs` -> json.parse inside index 1).
   - The parsed JSON is an array of annotation items.
   - Implement an MUI DataGrid evaluating the fields: Role, Subsystems, Classes, Pathways, Reactions, Features.

## Acceptance Criteria
- [ ] `/reference-data/plants` successfully loads genome data through DataGrid and paginates/sorts cleanly.
- [ ] `/reference-data/subsystems` successfully loads the large 910-item JSON and presents it in a searchable, sortable DataGrid.

## Timestamp Log
- Created: 2026-03-04 08:30:00 -06:00
