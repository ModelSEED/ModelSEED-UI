---
phase: 25
plan: 2
wave: 1
---

# Plan 25.2: Model Editing Workflow UI (`/api/models/edit`)

## Objective
Create a model editing workflow UI on the model detail page that calls `POST /api/models/edit` via `editModelFromApi()`, with safeguards for deployments where edit is still `501`.

## Context
- .gsd/phases/25/RESEARCH.md
- app/model/[...path]/page.tsx
- components/ui/ModelDetailHeader.tsx
- lib/api/modelseed.ts

## Tasks

<task type="auto">
  <name>Add Edit tab and container on model detail</name>
  <files>app/model/[...path]/page.tsx, components/ui/ModelDetailHeader.tsx</files>
  <action>
    Introduce a new "Edits" or "Edit Model" tab/panel on the model detail page.
    - Extend the tab list to include an Edit tab.
    - Add a basic form area for specifying a simple edit payload (e.g., add/remove reaction by ID as a first milestone).
    - Ensure the tab does not break existing overview/reactions/compounds/etc.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" "components/ui/ModelDetailHeader.tsx"</verify>
  <done>Model detail shows an Edit tab with a non-functional (yet wired) form shell.</done>
</task>

<task type="auto">
  <name>Wire Edit form submission to `editModelFromApi()` with fallback handling</name>
  <files>app/model/[...path]/page.tsx, lib/api/modelseed.ts</files>
  <action>
    Connect the Edit tab form to the backend using `editModelFromApi()`.
    - Build a minimal, structured payload for a simple edit scenario (e.g., add or remove a reaction).
    - Handle 200/4xx/5xx/501 responses with clear success/error messages.
    - Do not assume edit is available; show a friendly “Not supported yet on this deployment” message when backend returns 501.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" "lib/api/modelseed.ts"</verify>
  <done>Submitting the Edit form calls `editModelFromApi()` and surfaces backend responses appropriately.</done>
</task>

## Success Criteria
- [ ] Model detail exposes an Edit tab.
- [ ] Edit form submits to `/api/models/edit` and gracefully handles unsupported deployments.

## Timestamp Log
- Created: 2026-03-16 10:17:02 CDT

