---
phase: 22
plan: 3
wave: 2
---

# Plan 22.3: `/myMedia` + `/plant` Finalization and Authenticated E2E Verification

## Objective
Validate and finalize frontend wiring for `/myMedia`, `/plant`, and model workflows, ensuring jobs/media/model actions are empirically tested with real auth and demo parity expectations.

## Context
- .gsd/SPEC.md
- .gsd/phases/22/RESEARCH.md
- app/(user-data)/my-models/page.tsx
- app/(user-data)/myMedia/page.tsx
- app/(build-model)/plant/page.tsx
- app/about/version/StatusTable.tsx
- .gsd/phases/22/2-PLAN.md

## Tasks

<task type="auto">
  <name>Finalize My Media and Build Model UX/API behavior</name>
  <files>app/(user-data)/myMedia/page.tsx, app/(build-model)/plant/page.tsx, lib/api/modelseed.ts</files>
  <action>
    Ensure `/myMedia` and `/plant` fully work with demo-compatible endpoint behavior.
    - Make `/myMedia` reliably load user media from `/api/media/mine`.
    - Remove broken warning/banner from `/myMedia` after endpoint-backed flow is stable.
    - Ensure `/plant` build actions (upload/PATRIC/RAST where applicable) successfully submit jobs and surface results in tracked jobs/My Models.
    - Keep existing table controls and status messaging coherent.
  </action>
  <verify>npx eslint "app/(user-data)/myMedia/page.tsx" "app/(build-model)/plant/page.tsx" "lib/api/modelseed.ts" && npm run build</verify>
  <done>`/myMedia` and `/plant` operate end-to-end with authenticated API calls and no broken banner on My Media.</done>
</task>

<task type="auto">
  <name>Run authenticated endpoint and UI smoke verification</name>
  <files>.gsd/phases/22/VERIFICATION.md</files>
  <action>
    Execute endpoint and UI smoke checks against demo/Poplar using a valid token.
    - Run `npm run test:poplar-smoke` with documented env vars.
    - Verify `/plant`, `/my-models`, `/myMedia`, and `/model/seaver@patricbrc.org/modelseed/patrictest_121620` interactions manually in browser.
    - Record empirical pass/fail evidence and blockers in Phase 22 verification report.
  </action>
  <verify>test -f ".gsd/phases/22/VERIFICATION.md"</verify>
  <done>Phase 22 verification report includes endpoint evidence and UI flow outcomes for authenticated Poplar usage.</done>
</task>

## Success Criteria
- [ ] Core model/user-data frontend flows are validated against Poplar with real token auth.
- [ ] Phase 22 produces a concrete verification report with evidence and remaining gaps (if any).
- [ ] `/myMedia` and `/plant` are fully functional in authenticated local testing and aligned with demo behavior.

## Timestamp Log
- Created: 2026-03-13 10:56:00 CDT
- Updated: 2026-03-13 11:01:38 CDT - Added explicit `/myMedia` banner removal and `/plant` full-job-flow finalization scope.
