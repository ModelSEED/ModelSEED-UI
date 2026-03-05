---
phase: 6
plan: 1
wave: 1
status: complete
---

# Plan 6.1 Summary: Route Restructuring

## Activities
- **Route Group Implementation**: Confirmed pages are correctly located under `app/(reference-data)` to preserve layout.
- **Link Restoration**:
    - Updated `AppHeader.tsx` to use legacy paths: `/genomes`, `/biochem/reactions`, `/list-media`.
    - Restored direct `modelseed.org` external links for Model ID and Species Name in the **Public Plant Models** (`/genomes`) table.
    - Updated internal resource links in Reactions and Compounds tables from `/rxn` and `/cpd` to the exhaustive legacy paths `/biochem/reactions` and `/biochem/compounds`.
- **Layout Logic**: Updated `HeaderLayoutRouter.tsx` to detect the new legacy-matching paths as "App Routes" and show the appropriate header.

## Verification
- Verified `AppHeader.tsx` reflects `/genomes` as the primary link for Reference Data.
- Verified detail page routes (`/biochem/reactions/[id]`, `/biochem/compounds/[id]`) correctly handle navigation back to legacy list paths.

## Status: COMPLETE

## Timestamp Log
- Created: 2026-03-05 09:28:00 -06:00
- Updated: 2026-03-05 09:28:00 -06:00 - Summary generated after execution.
