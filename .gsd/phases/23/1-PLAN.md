---
phase: 23
plan: 1
wave: 1
---

# Plan 23.1: Complete Non-Biochem API Client Endpoint Coverage

## Objective
Bring frontend API wrappers to parity with currently documented and routed non-biochem modelseed-api endpoints so all model/job/media/workspace calls are available from a single typed client layer.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- .gsd/phases/23/RESEARCH.md
- lib/api/modelseed.ts
- lib/api/workspace.ts

## Tasks

<task type="auto">
  <name>Add missing model/job/media endpoint wrappers in modelseed client</name>
  <files>lib/api/modelseed.ts</files>
  <action>
    Add typed wrappers for endpoints that exist in backend docs/routes but are not yet surfaced in the frontend API module.
    - Add `POST /api/jobs/merge`.
    - Add `GET /api/media/export`.
    - Add `GET /api/models/edits`.
    - Add `POST /api/models/edit`.
    Keep auth and error handling on existing shared helpers; avoid component-level fetch logic.
  </action>
  <verify>npx eslint "lib/api/modelseed.ts"</verify>
  <done>All non-biochem model/job/media endpoint families documented in backend routes are callable through `lib/api/modelseed.ts`.</done>
</task>

<task type="auto">
  <name>Preserve non-biochem-only scope and avoid destructive flows</name>
  <files>lib/api/modelseed.ts</files>
  <action>
    Ensure no new wrappers or usage paths are added for biochem route migration or destructive model deletion tests.
    - Keep current delete wrapper for UI actions, but do not add automated delete test helpers.
    - Add concise inline comments only where endpoint behavior is non-obvious (for example, 501 placeholder routes).
  </action>
  <verify>npx eslint "lib/api/modelseed.ts"</verify>
  <done>API layer is expanded without violating biochem scope or destructive-testing constraints.</done>
</task>

## Success Criteria
- [ ] Missing non-biochem endpoints are available through typed frontend API exports.
- [ ] Existing auth/error strategy remains consistent for all endpoint wrappers.

## Timestamp Log
- Created: 2026-03-16 09:36:04 CDT
