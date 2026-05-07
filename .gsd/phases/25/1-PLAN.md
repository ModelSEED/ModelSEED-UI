---
phase: 25
plan: 1
wave: 1
---

# Plan 25.1: Merge-Model Workflow UI (`/api/jobs/merge`)

## Objective
Design and implement a dedicated merge-model workflow UI, surfaced from My Models, that submits `POST /api/jobs/merge` via the existing client wrapper and integrates with the tracked job system.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- .gsd/phases/25/RESEARCH.md
- app/(user-data)/my-models/page.tsx
- lib/api/modelseed.ts
- lib/api/jobTracker.ts
- external/ModelSEED-UI/app/views/my-models.html

## Tasks

<task type="auto">
  <name>Add merge selection and action affordance to My Models</name>
  <files>app/(user-data)/my-models/page.tsx</files>
  <action>
    Extend the My Models table to support selecting multiple models and invoking a merge action.
    - Add a selection model (checkboxes) on the DataGrid for model rows.
    - Add a "Merge Models" button in the Commands/toolbar when 2+ models are selected.
    - Prevent merge UI from appearing when fewer than 2 rows are selected.
  </action>
  <verify>npx eslint "app/(user-data)/my-models/page.tsx"</verify>
  <done>Users can select multiple models and see an enabled Merge Models action when appropriate.</done>
</task>

<task type="auto">
  <name>Wire merge action to `/api/jobs/merge` and job tracking</name>
  <files>app/(user-data)/my-models/page.tsx, lib/api/modelseed.ts, lib/api/jobTracker.ts</files>
  <action>
    Implement a merge dialog that uses `submitMergeJobFromApi()` and integrates with tracked jobs.
    - Collect selected model refs and an output path/name from the user.
    - Submit `submitMergeJobFromApi({ models: [...], output_path: ... })`.
    - Use `extractTrackedJobId` + `trackJob` to record the new merge job so it appears in the tracked jobs list.
    - Show non-destructive error/success messaging in the UI.
  </action>
  <verify>npx eslint "app/(user-data)/my-models/page.tsx" "lib/api/modelseed.ts" "lib/api/jobTracker.ts"</verify>
  <done>Merge submissions create a tracked job and do not break existing My Models behavior.</done>
</task>

## Success Criteria
- [ ] Multi-select + Merge action exists on My Models.
- [ ] Merge jobs are submitted and tracked using the existing job tracker.

## Timestamp Log
- Created: 2026-03-16 10:17:02 CDT

