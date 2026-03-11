---
phase: 5
plan: 1
---

# Plan 5.1: Workspace API Service & Route Refactor SUMMARY

## Execution Log
- Created `lib/api/workspace.ts` which successfully points to the JSON-RPC Workspace API at `https://p3.theseed.org/services/Workspace` with `workspaceLs` and `workspaceGet` methods.
- Renamed the whole `app/biochem/` app folder to `app/reference-data/`.
- Updated `app/reference-data/layout.tsx` to align the URL taxonomy to `reference-data` instead of `biochem`.
- Updated `app/reference-data/page.tsx` default redirect to point to `/reference-data/reactions`.
- Modified compound and reaction route components (`app/cpd/[id]/page.tsx` and `app/rxn/[id]/page.tsx`) to implement the `back` functionality pointing to the updated `/reference-data/*` paths.
- Updated `Header.tsx` links to refer to the new `reference-data` paths instead of `biochem`.

## Outcome
The groundwork for referencing the broader set of data (Plants, Subsystems, Media) is firmly established without breaking Reactions and Compounds. The reference-data structure is ready for the new DataGrid integrations.

## Timestamp Log
- Created: 2026-03-04 08:35:00 -06:00
- Updated: 2026-03-04 08:35:00 -06:00 - Execution complete.
