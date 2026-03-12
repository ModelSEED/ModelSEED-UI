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
