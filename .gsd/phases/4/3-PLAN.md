---
phase: 4
plan: 3
wave: 3
---

# Plan 4.3: Reactions Data Table

## Objective
Implement the main `/biochem/reactions` (which handles list view for Reactions). It should replicate the React `MUI DataGrid` fetching, column styling, sorting, and pagination of the legacy `ng-table-solr`.

## Context
- `external/ModelSEED-UI/app/views/biochem/biochem-reaction.html`
- `external/ModelSEED-UI/app/ctrls/ms-ctrls.js` (The `$s.rxnHeader` config)
- `external/ModelSEED-UI/app/services/biochem.js`

## Tasks

<task type="auto">
  <name>Build Reactions DataGrid Page</name>
  <files>app/biochem/reactions/page.tsx</files>
  <action>
    - Ensure Page is a full page rendering (likely `"use client"`).
    - Use `@tanstack/react-query` to fetch from `lib/api/biochem.ts` `getReactions`.
    - Setup `DataGrid` columns identical to legacy: ID, Name, Equation, Transport, deltaG, Status, EC Numbers, Notes, Synonyms, Aliases, Pathways, Ontology.
    - Match formatting explicitly (e.g., ID has a link to `/rxn/[id]`, Equation renders stoich, Aliases parse `BiGG`/`KEGG` labels into `<a>` tags).
    - Implement Server-Side pagination/sorting mapped to Solr query. Allow basic text search like `ng-table` did.
  </action>
  <verify>Access `/biochem/reactions` in browser. Expect to see table populate.</verify>
  <done>Reactions table perfectly reflects legacy fields, and search works against live Solr via React Query.</done>
</task>

## Success Criteria
- [ ] DataGrid matches legacy column set exactly.
- [ ] Aliases correctly parse their formatting (`<b>` tags via dangerouslySetInnerHTML or React nodes) and link out to BiGG/KEGG/MetaCyc.
- [ ] Equation (Stoichiometry) formats properly.
- [ ] Server-side pagination, sorting, and global searching are hooked into data grid.

## Timestamp Log
- Created: 2026-03-03 17:28:00 -06:00
