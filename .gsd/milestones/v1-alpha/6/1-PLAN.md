---
phase: 6
plan: 1
wave: 1
---

# Plan 6.1: Route Restructuring & Exact Match Links

## Objective
Revert/update the Next.js App Router folder structure to perfectly match the legacy ModelSEED URLs for Reference Data. This involves extracting items from `app/reference-data` into top-level paths (`/genomes`, `/biochem`, `/list-media`) inside a `(reference-data)` Route Group to share the sub-navigation layout.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- User requested identical route paths to legacy: `/genomes/`, `/genomes/Annotations`, `/biochem/reactions`, `/biochem/compounds`, `/list-media/`.

## Tasks

<task type="auto">
  <name>Create Route Group & Move Layout</name>
  <files>
    - app/(reference-data)/layout.tsx
    - app/reference-data/layout.tsx
  </files>
  <action>
    - Create `app/(reference-data)` directory.
    - Move `app/reference-data/layout.tsx` to `app/(reference-data)/layout.tsx`.
    - Update `layout.tsx` to handle the new tab paths for its "value" and "href" (e.g. `value="/genomes"` instead of `/reference-data/public-plant-models`).
    - The tabs are: Public Plant Models (`/genomes/`), Subsystems (`/genomes/Annotations`), Reactions (`/biochem/reactions`), Compounds (`/biochem/compounds`), Media (`/list-media/`).
  </action>
  <verify>ls app/(reference-data)/layout.tsx</verify>
  <done>The sub-navigation layout is now configured for the legacy routes.</done>
</task>

<task type="auto">
  <name>Migrate Reference Data Pages to Exact Legacy Paths</name>
  <files>
    - app/(reference-data)/genomes/page.tsx
    - app/(reference-data)/genomes/Annotations/page.tsx
    - app/(reference-data)/biochem/reactions/page.tsx
    - app/(reference-data)/biochem/reactions/[id]/page.tsx
    - app/(reference-data)/biochem/compounds/page.tsx
    - app/(reference-data)/biochem/compounds/[id]/page.tsx
    - app/(reference-data)/list-media/page.tsx
    - app/reference-data/
    - app/rxn/
    - app/cpd/
  </files>
  <action>
    - Recursively move the `page.tsx` files from `app/reference-data/*` and `app/rxn/`, `app/cpd/` to their new matching locations in `app/(reference-data)/...`.
    - Update import statements inside these files (like `@/components/data-tables/...`) to account for any path changes if relative imports are used (though aliased imports `@/` should be fine).
    - Ensure page components use the correct DataGrid components.
    - Clean up the old empty directories (`app/reference-data`, `app/rxn`, `app/cpd`).
  </action>
  <verify>ls app/(reference-data)/genomes/page.tsx && ls app/(reference-data)/biochem/reactions/page.tsx</verify>
  <done>All legacy routes are restored with their Next.js components.</done>
</task>

<task type="auto">
  <name>Update Navigation Links in AppHeader and Grids</name>
  <files>
    - components/layout/AppHeader.tsx
    - components/data-tables/BiochemReactionsDataGrid.tsx
    - components/data-tables/BiochemCompoundsDataGrid.tsx
    - components/data-tables/PublicPlantModelsDataGrid.tsx
    - components/data-tables/SubsystemsDataGrid.tsx
  </files>
  <action>
    - In `AppHeader.tsx`, update the nested `href`s for the "Reference Data" section's dropdown or main links if they exist, pointing `Reference Data` to `/genomes/`.
    - In the DataGrids, update all custom column definitions (like ID columns) to use `href={"/biochem/compounds/" + params.value}` instead of `/cpd/...`.
    - Apply `Link` to the `Model ID` and `Species Name` columns in `PublicPlantModelsDataGrid.tsx` pointing to exactly `https://modelseed.org/model/plantseed/plantseed/[id]` format or the correct legacy route.
    - For Subsystems DataGrid, ensure the Subsystems, Pathways, and Features columns are configured to render array elements as structural React elements containing `<Link href="...">` tags to match the legacy links.
  </action>
  <verify>grep -r "/biochem/compounds" components/data-tables/</verify>
  <done>All hardcoded routes and Link elements perfectly match legacy URL structure.</done>
</task>

## Success Criteria
- [ ] Next.js routes accurately replicate legacy `modelseed.org` routes.
- [ ] Sub-navigation tabs remain fully functional across these different root paths.
- [ ] Legacy links are restored to columns.

## Timestamp Log
- Created: 2026-03-05 09:10:00 -06:00
