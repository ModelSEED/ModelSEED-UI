---
phase: 25
plan: 4
wave: 2
---

# Plan 25.4: My Media CRUD Parity (Create/Delete)

## Objective
Implement create/delete workflows on `/myMedia` to approach legacy My Media parity, using workspace-backed media objects and the existing modelseed-api/media contract.

## Context
- .gsd/phases/25/RESEARCH.md
- app/(user-data)/myMedia/page.tsx
- lib/api/modelseed.ts
- lib/api/workspace.ts
- docs/WORKSPACE.md

## Tasks

<task type="auto">
  <name>Add Create New Media form and wiring</name>
  <files>app/(user-data)/myMedia/page.tsx, lib/api/workspace.ts</files>
  <action>
    Implement a basic “Create New Media” flow on `/myMedia`.
    - Replace the disabled Create button with a dialog/form.
    - Use workspace proxy endpoints (e.g., `/api/workspace/create`) and/or future media helpers to persist new media definitions under the user’s workspace.
    - After successful creation, refetch `listMyMediaFromApi()` so the new media appears in the table.
  </action>
  <verify>npx eslint "app/(user-data)/myMedia/page.tsx" "lib/api/workspace.ts"</verify>
  <done>Users can create a simple new media entry and see it listed without manual refresh.</done>
</task>

<task type="auto">
  <name>Add safe delete-media workflow with confirmation</name>
  <files>app/(user-data)/myMedia/page.tsx, lib/api/workspace.ts</files>
  <action>
    Implement row-level delete for media with strong safeguards.
    - Add a Delete command with confirmation dialog that clearly states the path being deleted.
    - Use workspace proxy delete (`/api/workspace/delete`) for media paths.
    - For automated/local tests, operate only on media created during the test (not on existing supervisor media).
  </action>
  <verify>npx eslint "app/(user-data)/myMedia/page.tsx" "lib/api/workspace.ts"</verify>
  <done>Media rows can be safely deleted with user confirmation, and tests avoid destructive operations on supervisor-owned media.</done>
</task>

## Success Criteria
- [ ] My Media supports creation of new media entries.
- [ ] My Media supports safe, confirmed deletion of selected media.

## Timestamp Log
- Created: 2026-03-16 10:17:02 CDT

