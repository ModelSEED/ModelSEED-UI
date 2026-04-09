---
phase: 22
plan: 2
wave: 1
---

# Plan 22.2: Model Detail Reliability and My Models Route Fidelity

## Objective
Refactor model detail and route mapping so `/model/seaver@patricbrc.org/modelseed/patrictest_121620` loads from stable model endpoints (`/api/models/*`) even when workspace `/get` is unstable.

## Context
- .gsd/SPEC.md
- .gsd/phases/22/RESEARCH.md
- app/model/[...path]/page.tsx
- lib/api/modelseed.ts
- lib/api/workspace.ts

## Tasks

<task type="auto">
  <name>Add typed model detail aggregators in API client</name>
  <files>lib/api/modelseed.ts</files>
  <action>
    Add helper(s) for model detail loading based on `ref`:
    - Fetch `/api/models/data?ref=`, `/api/models/gapfills?ref=`, and `/api/models/fba?ref=`.
    - Return a normalized shape consumed by model detail UI.
    - Keep behavior read-only and non-destructive.
  </action>
  <verify>npx eslint "lib/api/modelseed.ts"</verify>
  <done>Model detail helper APIs exist and return normalized data from model endpoints.</done>
</task>

<task type="auto">
  <name>Update model detail page to endpoint-first strategy</name>
  <files>app/model/[...path]/page.tsx, app/(user-data)/my-models/page.tsx</files>
  <action>
    Replace workspace-get-first loading with model-endpoint-first loading and ensure My Models click-through path fidelity.
    - Primary source: new model detail helper based on model `ref`.
    - Fallback: workspace get only when needed for legacy compatibility.
    - Ensure model row links preserve the exact user ref path required by demo-compatible endpoints.
    - Keep existing tabs/visual structure unchanged while improving reliability.
  </action>
  <verify>npx eslint "app/model/[...path]/page.tsx" "app/(user-data)/my-models/page.tsx" && npm run build</verify>
  <done>Model detail page renders from `/api/models/*` payloads and no longer depends solely on workspace `/get` success.</done>
</task>

## Success Criteria
- [ ] Opening a model from My Models uses Poplar model endpoints as primary source.
- [ ] Workspace get failures do not hard-fail model detail when model endpoints succeed.
- [ ] `/model/seaver@patricbrc.org/modelseed/patrictest_121620` loads model content without relying on workspace `/get` success.

## Timestamp Log
- Created: 2026-03-13 10:56:00 CDT
- Updated: 2026-03-13 11:01:38 CDT - Added explicit My Models route fidelity and target model page outcome.
