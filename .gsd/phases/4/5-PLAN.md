---
phase: 4
plan: 5
wave: 4
---

# Plan 4.5: Detail Pages (Rxn / Cpd)

## Objective
Implement the individual detail pages that show a single compound or reaction when navigating from the Data Table, matching the legacy angular templates (`compound.html`, `reaction.html`).

## Context
- `external/ModelSEED-UI/app/views/biochem/compound.html`
- `external/ModelSEED-UI/app/views/biochem/reaction.html`
- Route matching: `/biochem/reactions/[id]` and `/biochem/compounds/[id]`. Or `/rxn/[id]` and `/cpd/[id]`. Let's implement at `app/rxn/[id]/page.tsx` and `app/cpd/[id]/page.tsx` to match old URLs, preserving backwards compatible permalinks, or just `/biochem/...` whichever matches the legacy sitemap.
- The `Compound` controller calls `Biochem.findReactions_solr` to load related reactions, and parses the fields identically to the main table.

## Tasks

<task type="auto">
  <name>Create Reaction Detail Page</name>
  <files>app/rxn/[id]/page.tsx</files>
  <action>
    - Ensure Page routes properly at `/rxn/[id]` (add a static redirect or implement directly).
    - Use `<md-card>`-like layout using `<Card>` from MUI. Display ID, Name, Structure/Image (if valid for Rxn?), properties (deltaG), stoichiometry equation table/visualization.
    - Fetch the specific Reaction ID using the `getReactionDetail` from `lib/api/biochem.ts` via Server Components (or `useQuery`).
    - Visually format matching `app/views/biochem/reaction.html` with two columns.
  </action>
  <verify>Load `/rxn/rxn00001` and verify UI appears.</verify>
  <done>Reaction detail renders identical to legacy layout.</done>
</task>

<task type="auto">
  <name>Create Compound Detail Page</name>
  <files>app/cpd/[id]/page.tsx</files>
  <action>
    - Create page routing at `/cpd/[id]`.
    - Like Reaction, use MUI Layout matching legacy `compound.html`. Show image (`getImagePath`), properties, formula.
    - Fetch compound using `getCompoundDetail`.
    - Below properties, implement a Reaction Table fetching related reactions where this compound is a substrate/product via `findReactions_solr` logic replicated in `lib/api/biochem.ts`. This table must look identical to main `Reactions` table but customized per legacy behavior (e.g. `cpd_rxnHeader` config).
  </action>
  <verify>Load `/cpd/cpd00001` and verify UI and related reactions table appears.</verify>
  <done>Compound detail renders identically to legacy layout with images and relational grids.</done>
</task>

## Success Criteria
- [ ] Detail pages correctly fetch single records from Solr.
- [ ] Compound imagery correctly references ModelSEED's external minedatabase URL logic.
- [ ] Layout grid, margins, headers identically mimic the legacy HTML files.

## Timestamp Log
- Created: 2026-03-03 17:28:00 -06:00
