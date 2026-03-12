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

### Phase 17: Authenticated User Data & Workspace/API Integration
**Status**: ⚪ Not Started
- Fix authentication and permissions so signed-in users can reliably access **My Models** and **My Media**.
- Resolve Workspace permission errors by integrating with the appropriate backend (P3 Workspace or the new `modelseed-api` workspace proxy).
- Ensure Build Model UX defaults to the active "UPLOAD Microbes FASTA" tab while keeping the Plant tab disabled with tooltip.
- Exercise and validate user flows against the new `modelseed-api` backend using test RAST/PATRIC accounts.

- Regression checks and readiness assessment for promoting the new stack as the primary ModelSEED UI.

### Phase 19: UI Reliability and Functional Parity
**Status**: ✅ Complete
- Fixed console errors in the Build Model flow and add maintenance banners where features are in-progress.
- Implemented the "Commands" column in My Models for downloading (SBML, JSON, TSV) and deleting models with confirmation.
- Reconstructed the Model Detail page with full tabbed data tables (Reactions, Compounds, etc.) matching legacy visuals.
- Integrated the standard `DataControlHeader` into all user data tables for consistent filtering and column management.

### Phase 19.4: DataControlHeader Integration & Search Fix
**Status**: ✅ Complete
- Fixed DataControlHeader search functionality to be clickable and searchable.
- Integrated DataControlHeader into My Models and My Media pages.
- Added DataControlHeader to biochem reference data tabs (compounds, reactions).

## Timestamp Log
- Updated: 2026-03-11 10:50:00 -05:00 - Reset roadmap for Milestone 2.
- Updated: 2026-03-11 11:12:00 -05:00 - Phase 13 complete (URL parity and equation formatting).
- Updated: 2026-03-11 11:18:00 -05:00 - Fixed parameter naming in catch-all stubs and refined equation formatting logic.
- Updated: 2026-03-11 11:30:00 -05:00 - Phase 14 complete (service status auth fix).
- Updated: 2026-03-11 19:36:00 -06:00 - Phase 16 complete (UI/UX refinement and data consistency).
- Updated: 2026-03-11 20:05:00 -06:00 - Re-scoped Phase 17 for authenticated user data and Workspace/modelseed-api integration.
- Updated: 2026-03-12 15:30:00 -05:00 - Re-scoped Phase 18 for modelseed-api verification and end-to-end testing.
- Updated: 2026-03-12 17:15:00 -05:00 - Added Phase 19 for UI Reliability and functional parity.
- Updated: 2026-03-12 17:30:33 -05:00 - Executed Phase 19 plans and produced summaries/verification; pending manual browser checks.
- Updated: 2026-03-12 17:40:00 -05:00 - Added Phase 19.4 plan for DataControlHeader integration.
- Updated: 2026-03-12 17:45:00 -05:00 - Phase 19.4 complete: DataControlHeader integrated into all user data and biochem pages.
