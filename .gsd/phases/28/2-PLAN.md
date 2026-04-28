---
phase: 28
plan: 2
wave: 1
---

# Plan 28.2: My Jobs Page and User Data Nav Update

## Objective
Add a dedicated My Jobs page at `/my-jobs` matching the legacy URL exactly, with status counts (queued/running/completed), a full jobs table with auto-polling, and stderr/stdout links. Add "My Jobs" as a tab in the user-data layout navigation.

## Context
- .gsd/SPEC.md
- external/ModelSEED-UI/app/views/my-jobs.html — legacy jobs page (status counts + table)
- external/ModelSEED-UI/app/services/jobs.js — legacy polling/status service
- lib/api/modelseed.ts — getJobsFromApi, manageJobFromApi already exist
- lib/api/jobTracker.ts — TrackedJob, listTrackedJobs, isTerminalJobStatus
- app/(user-data)/layout.tsx — user data tabs (currently: My Models, My Media)
- components/layout/DataControlHeader.tsx — standard toolbar

## Tasks

<task type="auto">
  <name>Create My Jobs page</name>
  <files>app/(user-data)/my-jobs/page.tsx</files>
  <action>
    Create a new My Jobs page at `app/(user-data)/my-jobs/page.tsx`:
    1. Wrap in AuthGuard (same pattern as my-models)
    2. Fetch ALL user jobs from `getJobsFromApi([])` (empty array = all jobs)
    3. Also merge in locally tracked jobs from `listTrackedJobs()`
    4. Display 3 status count cards at top (legacy pattern):
       - Queued count (blue/gray icon)
       - In Progress count (amber icon)
       - Completed count (green icon)
    5. DataGrid table with columns:
       - Task (job command/app name)
       - Parameters (job arguments, show key:value pairs)
       - Submitted (relative time from submitTimestamp/created_at)
       - Started (relative time from startTimestamp)
       - Status (color coded: red=failed, green=completed, default=other)
    6. For failed jobs, add an info icon linking to stderr:
       `https://p3c.theseed.org/services/app_service/task_info/{jobId}/stderr`
    7. Auto-poll: use react-query refetchInterval (10s) like the legacy polling
    8. Sort by submitted time descending (newest first)
    9. Use DataControlHeader in the DataGrid
    - IMPORTANT: The page route must be `/my-jobs` exactly matching legacy URL
  </action>
  <verify>test -f "app/(user-data)/my-jobs/page.tsx" && grep -c "DataGrid" "app/(user-data)/my-jobs/page.tsx"</verify>
  <done>My Jobs page exists at /my-jobs with status counts, jobs table, and auto-polling</done>
</task>

<task type="auto">
  <name>Add My Jobs tab to user-data layout</name>
  <files>app/(user-data)/layout.tsx</files>
  <action>
    Update the USER_DATA_TABS array to include My Jobs:
    ```typescript
    {
        label: 'My Jobs',
        href: '/my-jobs',
        matchPaths: ['/my-jobs'],
    },
    ```
    Add it after "My Media" to match the legacy toolbar order (My Models, My Media, My Jobs).
  </action>
  <verify>grep "My Jobs" "app/(user-data)/layout.tsx"</verify>
  <done>User data navigation shows My Models | My Media | My Jobs tabs</done>
</task>

## Success Criteria
- [ ] `/my-jobs` page renders with status counts and jobs table
- [ ] Jobs auto-refresh every 10 seconds
- [ ] Failed jobs have stderr link
- [ ] "My Jobs" tab appears in user-data navigation
- [ ] Build passes with no new TypeScript errors

## Timestamp Log
- Created: 2026-03-17 09:23:45 -05:00
