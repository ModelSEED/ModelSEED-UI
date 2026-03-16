---
phase: 25
plan: 5
wave: 3
---

# Plan 25.5: Delete-Model UX and Safe Testing

## Objective
Finalize delete-model UX in the UI using the existing delete API, and define a safe testing strategy that validates behavior without deleting supervisor-critical models.

## Context
- .gsd/phases/25/RESEARCH.md
- app/(user-data)/my-models/page.tsx
- components/ui/DeleteModelModal.tsx
- lib/api/modelseed.ts
- scripts/poplar-smoke.mjs

## Tasks

<task type="auto">
  <name>Review and harden Delete Model modal behavior</name>
  <files>components/ui/DeleteModelModal.tsx, app/(user-data)/my-models/page.tsx</files>
  <action>
    Confirm that the Delete Model modal is correctly wired to `deleteModelFromApi(ref)` and provides clear UX.
    - Ensure confirmation text includes the full model ref/id.
    - Handle API errors and show user-friendly messages.
    - Prevent accidental double-submission while a delete is in-flight.
  </action>
  <verify>npx eslint "components/ui/DeleteModelModal.tsx" "app/(user-data)/my-models/page.tsx"</verify>
  <done>Delete modal behavior is robust and clearly communicates what will be deleted.</done>
</task>

<task type="auto">
  <name>Define and implement safe delete-model test strategy</name>
  <files>scripts/poplar-smoke.mjs, .gsd/phases/25/VERIFICATION.md</files>
  <action>
    Document and, where appropriate, implement a safe strategy for exercising delete-model behavior.
    - For automated tests, create a disposable model (e.g., via reconstruct job) and then delete only that model.
    - For supervisor accounts, ensure instructions explicitly avoid deleting existing important models.
    - Optionally add a commented or opt-in smoke check for delete that requires explicit model ref override.
  </action>
  <verify>grep-like verification that delete strategy is documented in VERIFICATION and that any scripted delete is opt-in and clearly labeled</verify>
  <done>Delete-model behavior is testable without risking important supervisor models.</done>
</task>

## Success Criteria
- [ ] Delete modal is UX-solid and wired to the correct API client.
- [ ] A documented, safe delete test strategy exists and is followed.

## Timestamp Log
- Created: 2026-03-16 10:17:02 CDT

