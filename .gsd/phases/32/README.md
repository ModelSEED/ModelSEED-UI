# Phase 32: Poplar Backend Integration & UI Polish

## Overview
This phase integrates the updated Poplar backend fixes and addresses remaining Known Issues from AGENTS.md.

## Backend Updates from José P. Faria
- Workspace errors now return proper HTTP status codes (404/403/502) with actual error messages from p3.theseed.org
- Model listing no longer crashes on non-numeric metadata (backend fixed)
- Job status updates have safety net to prevent stuck "queued" status

## Plans Summary

### Wave 1: Core Backend Integration (32.1)
**Status:** Requires SSH tunnel to Poplar

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Update workspace error handling for proper HTTP status codes | lib/api/workspace.ts |
| 1.2 | Add defensive handling for non-numeric metadata | lib/api/modelseed.ts |
| 1.3 | Add safety net for job status polling | my-jobs/page.tsx |
| 1.4 | Test workspace write operations | lib/api/workspace.ts |
| 1.5 | Update AGENTS.md | AGENTS.md |

### Wave 2: UI Compatibility & Features (32.2, 32.3)
**Depends on:** 32.1

| Plan | Focus | Files |
|------|-------|-------|
| 32.2 | MUI DataGrid v7 compatibility | AddCompoundsDialog, AddReactionsDialog |
| 32.3 | Dialog integration & bulk export | SelectMediaDialog, SaveAsDialog, biochem pages |

### Wave 3: UI Polish & Features (32.4, 32.5)
**Depends on:** None

| Plan | Focus | Files |
|------|-------|-------|
| 32.4 | Chemical equations, tab state, empty states | formatEquation.ts, model page |
| 32.5 | Model history timeline, assessments | Edit tab, plant workflow |

## Execution Order

1. **Start with 32.1** - Requires Poplar SSH tunnel active
2. **Then 32.2** - Can run in parallel with 32.1
3. **Then 32.3** - Depends on 32.1 (API basics)
4. **Then 32.4** - Independent UI polish
5. **Then 32.5** - Final features and documentation

## Success Criteria

All plans complete when:
- [ ] Workspace API errors show proper status codes (404/403/502) with meaningful messages
- [ ] Model listing handles edge case metadata without crashing
- [ ] Job status has safety net for stuck jobs
- [ ] Workspace write operations tested
- [ ] DataGrid v7 compatibility verified
- [ ] Dialogs integrated (Media, Save As)
- [ ] Bulk export has JSON/TSV options
- [ ] Chemical equations render correctly
- [ ] Tab state persists via URL
- [ ] Empty states are helpful
- [ ] Model edit history timeline implemented
- [ ] AGENTS.md fully updated

## Environment Notes

- SSH tunnel to Poplar: `ssh -L 8000:localhost:8443 user@poplar-host`
- Config: NEXT_PUBLIC_USE_MODELSEED_API=true, NEXT_PUBLIC_USE_NEW_PROXY=true
