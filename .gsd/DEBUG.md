# Debug Session: Phase 8 About Page Scope

## Symptom
The about page contains tabs for "Team", "Publications", "API Docs", and "FAQ" which should not be there according to the user.

**When:** Viewing the About section layout sidebar (`/about`).
**Expected:** Only "About", "Version / Status", and "Data Sources" should be present, exactly matching the legacy `/about-sidebar.html`.
**Actual:** "Team", "Publications", "API Docs", and "FAQ" are included in the sidebar layout.

## Attempts

### Attempt 1
**Testing:** H1 — The sidebar in `app/about/layout.tsx` was extended with extra items that are not part of the standard About sidebar in legacy code.
**Action:** Remove `Team`, `Publications`, `API`, and `FAQ` pages and their corresponding links from `app/about/layout.tsx`. Delete `app/about/team` and `app/about/publications`. Move `api` and `faq` to `app/_archive/` to keep them hidden but preserved.
**Result:** Implemented the cleanup. The UI accurately reflects legacy now.
**Conclusion:** CONFIRMED

## Resolution

**Root Cause:** Extra tabs were built that were commented out or not active in the original UI (Team, Publications, FAQ, API Docs).
**Fix:** Removed the `Team` and `Publications` directories, moved `API` and `FAQ` to an `_archive` folder. The `NAV_ITEMS` in `app/about/layout.tsx` has been sanitized to just About, Version, and Data Sources.
**Verified:** The Next.js routing ignores `_archive`, and the layouts don't include those tabs.

## Timestamp Log
- Created: 2026-03-05 14:50:00 -06:00
- Updated: 2026-03-05 14:55:00 -06:00 - Resolved over-scoping issue
