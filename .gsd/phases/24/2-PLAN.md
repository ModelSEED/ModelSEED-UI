---
phase: 24
plan: 2
wave: 1
---

# Plan 24.2: Browser Validation with Token-Authenticated Localhost Session

## Objective
Empirically validate real page behavior in browser against localhost API-backed flows using token-auth, while skipping destructive delete actions.

## Context
- .gsd/phases/24/RESEARCH.md
- scripts/poplar-smoke.mjs
- app/(user-data)/my-models/page.tsx
- app/(user-data)/myMedia/page.tsx
- app/(build-model)/plant/page.tsx
- app/model/[...path]/page.tsx

## Tasks

<task type="auto">
  <name>Run browser-based checks for key authenticated routes</name>
  <files>app/(user-data)/my-models/page.tsx, app/(user-data)/myMedia/page.tsx, app/(build-model)/plant/page.tsx, app/model/[...path]/page.tsx</files>
  <action>
    Validate route behavior in actual browser session using token-authenticated state.
    - Confirm route load and key interactive controls on `/my-models`, `/myMedia`, `/plant`, `/model/...`.
    - Trigger non-destructive actions only (download/export/job submit where safe).
    - Do NOT execute delete-model actions.
  </action>
  <verify>Browser evidence captured via MCP browser snapshots/screenshots and summarized in verification report</verify>
  <done>All target routes are browser-validated with token-auth session and no delete operations executed.</done>
</task>

<task type="auto">
  <name>Re-run localhost endpoint smoke checks after page wiring changes</name>
  <files>scripts/poplar-smoke.mjs</files>
  <action>
    Execute smoke checks with localhost API URL and token to ensure endpoint contracts remain stable after UI updates.
    - Capture pass/fail counts.
    - Highlight any backend-origin failures separately from frontend regressions.
  </action>
  <verify>PATRIC_TOKEN=... MODELSEED_API_URL=http://localhost:8000 npm run test:poplar-smoke</verify>
  <done>Smoke results are updated and correlated with browser behavior outcomes.</done>
</task>

## Success Criteria
- [ ] Browser validation completed for all target authenticated pages.
- [ ] Localhost smoke suite rerun with updated evidence after page changes.

## Timestamp Log
- Created: 2026-03-16 09:46:46 CDT
