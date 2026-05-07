---
phase: 28
plan: 2
---

# Summary 28.2: My Jobs Page and User Data Nav Update

## What Was Done

### My Jobs Page (`/my-jobs`)
- Created `app/(user-data)/my-jobs/page.tsx` with full job tracking functionality:
  - **Status count cards**: Queued (gray), In Progress (amber), Completed (green) — exactly matching legacy layout
  - **Jobs DataGrid table**: Task, Parameters, Submitted (relative time), Started (relative time), Status (color-coded chips)
  - **Failed job stderr link**: Info icon opens `https://p3c.theseed.org/services/app_service/task_info/{id}/stderr` — matching legacy URL
  - **Auto-polling**: 10-second refetch interval via react-query
  - **Data merging**: Combines API jobs from `getJobsFromApi` with locally tracked jobs from `listTrackedJobs`
  - **AuthGuard**: Protected route requiring sign-in
  - **Sort**: Default newest-first

### User Data Navigation Updated
- Added "My Jobs" tab to `app/(user-data)/layout.tsx` 
- Tab order: My Models | My Media | My Jobs — matching legacy toolbar

## Files Created
- `app/(user-data)/my-jobs/page.tsx` (236 lines)

## Files Modified
- `app/(user-data)/layout.tsx` — added My Jobs tab entry

## Verification
- `npx tsc --noEmit` — PASS
- `npx next build` — PASS (`/my-jobs` route recognized)
- `grep "My Jobs" app/(user-data)/layout.tsx` — PASS

## Timestamp Log
- Created: 2026-03-17 09:23:45 -05:00
