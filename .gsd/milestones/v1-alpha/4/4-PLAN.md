---
phase: 4
plan: 4
wave: 3
---

# Plan 4.4: Compounds Data Table

## Objective
Implement the main `/biochem/compounds` table using `@mui/x-data-grid` just like the Reactions tab, directly mapping Solr results to columns mimicking legacy `ng-table-solr`.

## Context
- `external/ModelSEED-UI/app/views/biochem/biochem-compound.html`
- `external/ModelSEED-UI/app/ctrls/ms-ctrls.js` (The `$s.cpdHeader` config)
- `external/ModelSEED-UI/app/services/biochem.js`

## Tasks

<task type="auto">
  <name>Build Compounds DataGrid Page</name>
  <files>app/biochem/compounds/page.tsx</files>
  <action>
    - Create `"use client"` page rendering the `DataGrid` connected to `getCompounds` via `useQuery`.
    - Columns: ID, Name, Formula, Mass, Charge, Synonyms, Aliases, Ontology.
    - Format ID column with links to `/cpd/[id]`.
    - Format Formula (`pretty-formula` logic, handling HTML if needed, e.g. replacing numbers with sub-script logic optionally, but checking legacy implementation first).
    - Parse Aliases exactly as the Reactions table does to inject BiGG/KEGG/MetaCyc external `<a>` tags.
    - Setup Server-Side Sorting/Pagination tied to query state.
  </action>
  <verify>Navigate to `/biochem/compounds` and ensure data renders and paginates perfectly.</verify>
  <done>Compounds table perfectly reflects legacy fields, and search works against live Solr.</done>
</task>

## Success Criteria
- [ ] Table visually renders in `DataGrid` mimicking `ng-table-solr`.
- [ ] Links and alias processing behave identically.
- [ ] Data correctly paginated via Solr.

## Timestamp Log
- Created: 2026-03-03 17:28:00 -06:00
