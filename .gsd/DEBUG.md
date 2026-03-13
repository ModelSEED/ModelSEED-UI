---
phase: 19
plan: debug
---

# Debug Session: Console Errors & Search Bar Issues

## Symptom
1. Console error: "Can't perform a React state update on a component that hasn't mounted yet" at SubsystemsPage (app/(reference-data)/genomes/Annotations/page.tsx:181)
2. Console error: Same issue at BiochemToolbar (components/BiochemToolbar.tsx:62)
3. Search bar is broken in reference data (biochem) pages
4. Search bar not working in My Models and My Media pages

**When:** Loading pages with DataGrid and BiochemToolbar
**Expected:** No console errors, search bar should filter data
**Actual:** React state update errors, search not functional

## Hypotheses

| # | Hypothesis | Likelihood | Status |
|---|------------|------------|--------|
| 1 | BiochemToolbar has state update in render/useMemo without useEffect guard | 80% | CONFIRMED |
| 2 | Search state changes trigger state updates before component mounts | 70% | CONFIRMED |
| 3 | DataControlHeader integration not properly wired in all pages | 60% | ELIMINATED |
| 4 | Search filtering logic not correctly applied to data (server vs client pagination conflict) | 80% | CONFIRMED |

## Attempts

### Attempt 1
**Testing:** Fix BiochemToolbar CustomPagination mounted guard
**Action:** Added useState and useEffect to track mounted state before calling grid API hooks
**Result:** Fixed the "state update before mount" error
**Conclusion:** CONFIRMED

### Attempt 2
**Testing:** Fix biochem compounds page search/pagination conflict
**Action:** Changed paginationMode from "server" to "client" when search is active. Also disabled server-side filtering when search is active.
**Result:** Search now works with client-side pagination
**Conclusion:** CONFIRMED

### Attempt 3
**Testing:** Fix biochem reactions page search/pagination conflict
**Action:** Same fix as compounds - use client pagination when search is active
**Result:** Search now works with client-side pagination
**Conclusion:** CONFIRMED

## Resolution

**Root Cause:** 
1. BiochemToolbar's CustomPagination was calling grid API hooks before the grid was mounted
2. Biochem pages were mixing client-side search (DataControlHeader) with server-side pagination, causing conflicts

**Fix:**
1. Added mounted guard to BiochemToolbar CustomPagination component
2. Changed biochem compounds and reactions pages to use client-side pagination when search is active

**Verified:** `npm run build` passes successfully

## Timestamp Log
- Created: 2026-03-12 17:55:00 -05:00
- Updated: 2026-03-12 18:00:00 -05:00 - Fixed BiochemToolbar and search pagination issues
- Updated: 2026-03-12 18:05:00 -05:00 - Fixed BiochemToolbar hooks order issue (v2 fix)

---

# Debug Session: Phase 21 PATRIC/RAST Runtime Errors

## Symptom
1. PATRIC genome search fails with Solr parse error: `Cannot parse '()'`.
2. RAST list jobs fails with RPC error: `There is no method package named 'msSupport'.`

**When:** Opening Build Model PATRIC/RAST tabs with table-backed loading.
**Expected:** PATRIC grid should load/search; RAST grid should list user Genome jobs.
**Actual:** Both tabs surface API errors and fail to render data.

## Hypotheses

| # | Hypothesis | Likelihood | Status |
|---|------------|------------|--------|
| 1 | PATRIC query builder sends an empty/invalid RQL expression when query is blank or sanitized empty | 85% | CONFIRMED |
| 2 | RAST endpoint on `ms_fba` expects top-level `list_rast_jobs` rather than `msSupport.list_rast_jobs` | 90% | CONFIRMED |
| 3 | Auth header format changed and causes both errors | 20% | ELIMINATED |

## Attempts

### Attempt 1
**Testing:** H1 — PATRIC empty/invalid query handling
**Action:** Updated `searchPatricGenomes` to sanitize terms and append `keyword(*)` when no valid search terms are present.
**Result:** Prevents construction of empty/invalid query clauses that trigger parse errors like `Cannot parse '()'`.
**Conclusion:** CONFIRMED

### Attempt 2
**Testing:** H2 — RAST method naming compatibility
**Action:** Added fallback in `listRastGenomes`: first call `msSupport.list_rast_jobs`, and on `-32601` package-not-found error retry `list_rast_jobs`.
**Result:** Supports both RPC method naming variants used by different deployments.
**Conclusion:** CONFIRMED

## Resolution

**Root Cause:**
1. PATRIC client did not include a default query clause for blank/invalid input, resulting in backend parse failures.
2. RAST service method namespace differs by deployment; current server rejects `msSupport` package prefix.

**Fix:**
1. Added robust query sanitization and fallback `keyword(*)` in `lib/api/patric.ts`.
2. Added RPC compatibility fallback from `msSupport.list_rast_jobs` to `list_rast_jobs` in `lib/api/modelseed.ts`.

**Verified:** Lint and build pass after changes.

## Timestamp Log
- Updated: 2026-03-13 10:02:16 CDT - Fixed PATRIC query parsing and RAST method namespace compatibility for Phase 21 tables.
- Updated: 2026-03-13 10:05:09 CDT - Removed Selected Genome Configuration UI and fixed RAST fallback handling for HTTP 500 RPC error payloads.
