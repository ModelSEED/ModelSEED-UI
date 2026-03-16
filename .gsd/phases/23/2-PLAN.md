---
phase: 23
plan: 2
wave: 1
---

# Plan 23.2: Localhost Tunnel Smoke Validation and Secret-Safe Test Setup

## Objective
Expand endpoint smoke coverage for localhost:8000 token-auth testing while keeping token-bearing test artifacts untracked by git.

## Context
- .gsd/phases/23/RESEARCH.md
- scripts/poplar-smoke.mjs
- package.json
- .gitignore

## Tasks

<task type="auto">
  <name>Expand smoke test matrix for non-destructive non-biochem endpoints</name>
  <files>scripts/poplar-smoke.mjs, package.json</files>
  <action>
    Extend the current smoke script so it verifies additional documented endpoints without mutating or deleting user model data.
    - Add checks for jobs merge endpoint contract (`/api/jobs/merge`) with a validation-style payload.
    - Add checks for media export and model edits routes with endpoint-level assertions.
    - Keep existing model list/data/gapfills/fba/media/workspace checks.
    - Preserve clear pass/fail reporting including accepted "expected validation failure" cases.
  </action>
  <verify>node scripts/poplar-smoke.mjs --help</verify>
  <done>Smoke suite validates broader endpoint coverage and still runs as a single command.</done>
</task>

<task type="auto">
  <name>Add gitignored local token test harness</name>
  <files>.gitignore, scripts/local/token-smoke.local.mjs</files>
  <action>
    Provide a local-only runner that consumes token/base URL from environment and calls the main smoke script.
    - Place this helper under an ignored path so token-driven testing files do not get committed.
    - Keep tracked scripts token-agnostic (no embedded secrets).
  </action>
  <verify>node scripts/local/token-smoke.local.mjs --help</verify>
  <done>Token test harness exists for local execution and is excluded from version control.</done>
</task>

## Success Criteria
- [ ] `http://localhost:8000` token smoke checks cover all non-biochem endpoint families in scope.
- [ ] Local token test helper exists and is protected by `.gitignore`.

## Timestamp Log
- Created: 2026-03-16 09:36:04 CDT
