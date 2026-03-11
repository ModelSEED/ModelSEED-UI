# ROADMAP

## Milestone 1: v1-alpha — Base Application Migration [COMPLETE]

## Milestone 2: v1-beta — Data Analysis & Interactive Tools [IN PROGRESS]

### Phase 13: Deployment Readiness (URL Parity & Equation Formatting)
**Status**: ✅ Complete
- Audit and align all local routes and `<Link>` tags to exactly match the legacy UI's URL structures.
- Ensure placeholder dynamic routes exist for legacy links (e.g., `/data/...`, `/fba/...`).
- Implement custom React formatting utility (Option A) to parse Reaction equations for proper chemical formula subscripting.

### Phase 14: FBA & Simulation Results / Service Status Auth Fix
**Status**: ✅ Complete
- Fix service status authentication (useAuth integration, mock token support)
- Display FBA results in interactive tables and charts.
- Implement simulation status tracking for queued jobs.

### Phase 16: UI/UX Refinement & Data Consistency
**Status**: ✅ Complete
- Standardize data table headers with search, filters, manage columns, and pagination.
- Apply consistent headers across all dynamic reference data subtabs.
- Fix UI/UX issues: tooltips on disabled elements, passive model indicators, and home page login logic.

### Phase 17: Media Optimization Tools
**Status**: ⚪ Not Started
- Wired media creation API for persisting workspaces.
- Media adjustment and comparison views.

### Phase 18: Final Polishing & Performance
**Status**: ⚪ Not Started
- Global state optimization and bundle reduction.
- End-to-end testing and production build verification.

## Timestamp Log
- Updated: 2026-03-11 10:50:00 -05:00 - Reset roadmap for Milestone 2.
- Updated: 2026-03-11 11:12:00 -05:00 - Phase 13 complete (URL parity and equation formatting).
- Updated: 2026-03-11 11:18:00 -05:00 - Fixed parameter naming in catch-all stubs and refined equation formatting logic.
- Updated: 2026-03-11 11:30:00 -05:00 - Phase 14 complete (service status auth fix).
- Updated: 2026-03-11 19:36:00 -06:00 - Phase 16 complete (UI/UX refinement and data consistency).
