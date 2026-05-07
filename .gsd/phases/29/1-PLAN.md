---
phase: 29
plan: 1
wave: 1
---

# Plan 29.1: Feature Detail Page, Header Bug Fix, and Cleanup

## Objective
Close the remaining functional gaps and bugs identified during the Phase 28 audit to make the UI ready for user testing. Specifically:
1. Replace the placeholder Feature detail page with a functional implementation showing gene function, subsystems, aliases, and protein sequence.
2. Fix the AppHeader `isUserDataActive` detection so the "User Data" tab highlights correctly when on `/my-jobs`.
3. Clean up stale READMEs in `/fba` and `/gapfill` that still say "under construction."

## Context
- `.gsd/SPEC.md`
- `app/feature/[...path]/page.tsx` — current placeholder
- `external/ModelSEED-UI/app/views/data/feature.html` — legacy reference
- `components/layout/AppHeader.tsx` — header navigation with `isUserDataActive` bug
- `app/fba/README.md` — stale README
- `app/gapfill/README.md` — stale README
- `lib/api/workspace.ts` — workspace API utilities

## Tasks

<task type="auto">
  <name>Implement Feature Detail Page</name>
  <files>app/feature/[...path]/page.tsx</files>
  <action>
    Replace the "under construction" stub with a functional Feature detail page:
    - Parse URL path to extract genome ref and feature ID (legacy URL: `/feature/{genome}/{feature}`)
    - Fetch feature data from workspace using `workspaceGet` with the genome ref
    - Display sections matching legacy layout:
      - **Function**: Show the feature's functional assignment
      - **Subsystems**: List associated subsystems (or "No subsystems present")
      - **Aliases**: Table of alias labels/values with external links where available
      - **Protein Sequence**: Monospace pre-formatted protein sequence
    - Include breadcrumb navigation back to the genome detail page
    - Include loading/error states with `CircularProgress` and `Alert`
    - Use consistent styling (MUI Typography, Box, Paper) matching other detail pages
    - Do NOT implement editing functionality (view-only for now)
  </action>
  <verify>Check that the file compiles by running `npx tsc --noEmit` and that it no longer contains "under construction"</verify>
  <done>Feature detail page renders function, subsystems, aliases, and protein sequence from workspace data. No "under construction" text remains.</done>
</task>

<task type="auto">
  <name>Fix AppHeader isUserDataActive to include /my-jobs</name>
  <files>components/layout/AppHeader.tsx</files>
  <action>
    On line 37, add `|| pathname.startsWith('/my-jobs')` to the `isUserDataActive` condition so the "User Data" tab highlights correctly when the user is on the My Jobs page.
    
    Before: `const isUserDataActive = pathname.startsWith('/my-models') || pathname.startsWith('/myMedia') || pathname.startsWith('/data');`
    After:  `const isUserDataActive = pathname.startsWith('/my-models') || pathname.startsWith('/myMedia') || pathname.startsWith('/my-jobs') || pathname.startsWith('/data');`
  </action>
  <verify>Grep for `isUserDataActive` in AppHeader.tsx and confirm `/my-jobs` is included</verify>
  <done>The "User Data" header tab highlights when visiting /my-jobs.</done>
</task>

<task type="auto">
  <name>Clean up stale READMEs</name>
  <files>app/fba/README.md, app/gapfill/README.md</files>
  <action>
    Delete both stale README files that still reference "Catch-all Stub" and "Under Construction". The pages are now fully implemented and the READMEs are misleading.
  </action>
  <verify>Confirm files no longer exist: `test ! -f app/fba/README.md && test ! -f app/gapfill/README.md && echo "CLEAN"`</verify>
  <done>No misleading README files remain in implemented page directories.</done>
</task>

## Success Criteria
- [ ] Feature page at `/feature/{genome}/{feature}` renders real data (function, subsystems, aliases, protein)
- [ ] "User Data" header tab highlights on `/my-jobs`
- [ ] No stale "under construction" READMEs in `/fba` or `/gapfill`
- [ ] `npm run build` passes clean

## Timestamp Log
- Created: 2026-03-17 09:37:17 CDT
