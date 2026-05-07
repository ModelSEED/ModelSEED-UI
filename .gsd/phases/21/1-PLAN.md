---
phase: 21
plan: 1
wave: 1
---

# Plan 21.1: API Layer for PATRIC and RAST

## Objective
Implement the backend communication layers to fetch genome data from PATRIC and RAST services, enabling searchable tables in the UI.

## Context
- .gsd/SPEC.md
- .gsd/phases/21/RESEARCH.md
- lib/api/config.ts
- lib/api/requestAuth.ts

## Tasks

<task type="auto">
  <name>Create PATRIC API Client</name>
  <files>lib/api/patric.ts</files>
  <action>
    Implement `searchPatricGenomes` function using the RQL syntax researched in RESEARCH.md.
    - Support query, limit, offset, and sort.
    - Use `withRawTokenAuth` for authentication.
    - Ensure robust error handling for fetch calls.
  </action>
  <verify>Check for file existence and exporting of `searchPatricGenomes`.</verify>
  <done>
    `lib/api/patric.ts` exists and contains a functional `searchPatricGenomes` function.
  </done>
</task>

<task type="auto">
  <name>Update ModelSEED API with RAST Job Listing</name>
  <files>lib/api/modelseed.ts</files>
  <action>
    Implement `listRastGenomes` function in `lib/api/modelseed.ts`.
    - Use JSON-RPC 1.1 to call `msSupport.list_rast_jobs`.
    - Filter results to only include jobs where `type === 'Genome'`.
    - Map the legacy fields to a clean TypeScript interface.
  </action>
  <verify>Check for `listRastGenomes` in `lib/api/modelseed.ts`.</verify>
  <done>
    `listRastGenomes` is exported from `lib/api/modelseed.ts` and correctly filters/maps job data.
  </done>
</task>

## Success Criteria
- [ ] PATRIC search results can be fetched with RQL filtering.
- [ ] RAST genome jobs are listed for the authenticated user.

## Timestamp Log
- Created: 2026-03-13 10:00:00 -05:00
