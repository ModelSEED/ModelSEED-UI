# Current State - Phase 23 Complete, Milestone 2 In-Progress

## Goal
The goal is to transition all backend operations (excluding biochemistry reference data) to the new ModelSEED API (`poplar.cels.anl.gov:8000`) and achieve full functional parity with the legacy UI.

## Current Position
- **Active Phase**: Phase 24 (Page-Level API Adoption)
- **Status**: 🔄 In Progress
- **Last Commit**: `37d5b79` - "docs(phase-23): mark endpoint coverage and smoke validation complete"

## Accomplishments
1. **API Coverage (Phase 23)**: Achieved full coverage for non-biochem endpoints and implemented `scripts/poplar-smoke.mjs` for validation.
2. **Workspace Migration (Phase 20)**: Fully transitioned `ls` and `get` operations to the REST proxy (no legacy fallback).
3. **PATRIC Support**: Fixed genome search fallback and parsing logic for better reliability.
4. **Auth Readiness**: Implemented sign-out redirects and `AuthGuard` auto-redirects to improve user testing UX.
5. **Feature Detail Page**: Fully implemented at `/feature/[...path]`. Shows function, subsystems, aliases, and protein sequences.
6. **Data Highlighting**: Fixed `/my-jobs` tab highlighting in the user-data layout.

## Next Steps for New Session
1. **Model Comparison**: Consider implementing the `/compare` route if multi-model analysis is required for testing.
2. **Workspace Browser**: The generic `/data/[...path]` is still a placeholder. Check if users need to browse raw workspace files.
3. **Reference Data Restore**: Check if missing microbial reference data (other than Genomes/Media) needs restoration.
4. **User Testing**: Project is currently in a "feature complete" state relative to the legacy parity goals. Next step is typically user validation or deployment.

## Technical Context for Handover
- **Legacy Path**: `external/ModelSEED-UI`
- **New Path**: Root directory (Next.js App Router)
- **Key APIs**: `lib/api/modelseed.ts`, `lib/api/workspace.ts`
- **Data Fetching**: Using `react-query` with `workspaceGet` for most detail pages.
- **Routing Strategy**: Dynamic catch-all segments `[...path]` used for workspace compatibility.
