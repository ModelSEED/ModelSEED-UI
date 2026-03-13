---
phase: 22
plan: 1
wave: 1
---

# Plan 22.1: Demo Endpoint Contract Hardening and Smoke Validation

## Objective
Harden API client behavior against known demo/Poplar error shapes (especially workspace/json-rpc failures) and add a repeatable smoke test harness for models, jobs, media, and workspace endpoints.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- .gsd/phases/22/RESEARCH.md
- lib/api/modelseed.ts
- lib/api/workspace.ts
- lib/api/config.ts

## Tasks

<task type="auto">
  <name>Normalize API error parsing for non-2xx JSON payloads</name>
  <files>lib/api/workspace.ts, lib/api/modelseed.ts</files>
  <action>
    Update workspace/modelseed client helpers so they parse JSON error bodies on non-2xx responses and surface actionable messages.
    - Handle JSON-RPC style `error` payloads with code/message fields.
    - Preserve endpoint/method context in thrown errors.
    - Avoid generic HTTP-only errors that hide backend detail.
  </action>
  <verify>npx eslint "lib/api/workspace.ts" "lib/api/modelseed.ts"</verify>
  <done>Workspace/modelseed API clients expose structured error details for non-2xx and RPC errors.</done>
</task>

<task type="auto">
  <name>Add Poplar endpoint smoke test command</name>
  <files>scripts/poplar-smoke.mjs, package.json</files>
  <action>
    Create a non-destructive smoke test script to validate demo-compatible endpoints with a provided raw PATRIC token.
    - Support both `MODELSEED_API_URL=http://localhost:8000` (demo) and `http://poplar.cels.anl.gov:8000`.
    - Test GET endpoints for models/data/gapfills/fba/media and workspace calls (`ls`, `get`) using sample refs/paths from env vars.
    - Print pass/fail summary per endpoint and include HTTP status + message on failure.
    - Add npm script entry (e.g. `npm run test:poplar-smoke`).
  </action>
  <verify>node scripts/poplar-smoke.mjs --help</verify>
  <done>A repeatable CLI smoke command exists and runs without syntax errors, ready for token-based endpoint verification.</done>
</task>

## Success Criteria
- [ ] API clients show endpoint-specific actionable errors instead of opaque 500 failures.
- [ ] A single smoke command validates key demo/Poplar endpoints used by model workflows.

## Timestamp Log
- Created: 2026-03-13 10:56:00 CDT
- Updated: 2026-03-13 11:01:38 CDT - Added localhost demo parity requirements and expanded smoke coverage.
