---
phase: 25
plan: 3
wave: 2
---

# Plan 25.3: Rich Edit-History UI (`/api/models/edits`)

## Objective
Upgrade the simple edit-count display into a usable edit-history UI on the model detail page, driven by `GET /api/models/edits`.

## Context
- .gsd/phases/25/RESEARCH.md
- app/model/[...path]/page.tsx
- lib/api/modelseed.ts

## Tasks

<task type="auto">
  <name>Add edit-history table under model detail</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Extend the Edit tab (or add a new “Edits” sub-panel) to show a table of edits when available.
    - Use `listModelEditsFromApi(ref)` as the data source.
    - Display key columns such as timestamp, user, operation type, and a brief summary.
    - Gracefully degrade to “No edits recorded” or “Not supported yet” based on backend behavior.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx"</verify>
  <done>Model detail shows a structured history of edits when the backend provides data.</done>
</task>

<task type="auto">
  <name>Integrate edit-history with future edit submissions</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Ensure that successful edit submissions trigger a history refresh.
    - After `editModelFromApi()` succeeds, refetch the edit-history query.
    - Avoid unnecessary refetches when edit submissions fail.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx"</verify>
  <done>New edits appear in the history table without a full page reload.</done>
</task>

## Success Criteria
- [ ] Edit-history table exists and is populated when backend supports it.
- [ ] Edit submissions cause the history to refresh.

## Timestamp Log
- Created: 2026-03-16 10:17:02 CDT

