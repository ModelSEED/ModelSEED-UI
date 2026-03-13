---
phase: 21
plan: 2
wave: 1
---

# Plan 21.2: UI Components & Integration

## Objective
Replace the manual text inputs in the Build Model page with interactive, searchable data grids for PATRIC and RAST genomes.

## Context
- .gsd/SPEC.md
- .gsd/phases/21/RESEARCH.md
- .gsd/phases/21/1-PLAN.md
- app/(build-model)/plant/page.tsx
- components/layout/DataControlHeader.tsx

## Tasks

<task type="auto">
  <name>Implement Genome Selection Components</name>
  <files>
    components/build-model/PatricGenomesTable.tsx
    components/build-model/RastGenomesTable.tsx
  </files>
  <action>
    Create searchable DataGrid components for PATRIC and RAST.
    - Use `DataControlHeader` for the search bar.
    - Implement server-side pagination/search for PATRIC.
    - Implement client-side search for RAST (as it's a smaller user-specific set).
    - Add a "Build Model" action column in each table.
  </action>
  <verify>Verify components render without errors.</verify>
  <done>
    `PatricGenomesTable` and `RastGenomesTable` are implemented and functional.
  </done>
</task>

<task type="auto">
  <name>Integrate Tables into Build Model Page</name>
  <files>app/(build-model)/plant/page.tsx</files>
  <action>
    Update the "PATRIC Microbes" and "RAST Microbes" tabs.
    - Remove the existing `TextField` inputs for ID entry.
    - Embed the new table components.
    - When a user clicks "Build Model" in the table, populate the model configuration form (Template, Media, Name) for that specific selection.
  </action>
  <verify>Manually verify tab switching and table loading.</verify>
  <done>
    The Build Model page uses interactive tables for genome selection, and clicking "Build" initiates the configuration flow.
  </done>
</task>

## Success Criteria
- [ ] PATRIC tab features a searchable genome grid.
- [ ] RAST tab features a grid of user-owned genome jobs.
- [ ] Selecting a genome from either grid enables the build configuration.

## Timestamp Log
- Created: 2026-03-13 10:05:00 -05:00
