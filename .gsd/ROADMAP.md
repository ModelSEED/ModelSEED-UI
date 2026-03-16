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

### Phase 20: New API Consolidation (Models, Jobs, Workspace Proxy)
**Status**: 🔄 In Progress
- **Target:** Use the new API (Poplar: `MODELSEED_API_URL` = http://poplar.cels.anl.gov:8000) for all backend operations **except** biochemistry reference table serving (keep Solr for biochem search/tables per backend team).
- **Auth:** PATRIC token in `Authorization` header (direct, no Bearer). Set `USE_MODELSEED_API=true` and `USE_NEW_PROXY=true`.
- **Models:** GET/POST/DELETE `/api/models`, `/api/models/data`, `/api/models/export`, `/api/models/copy`, `/api/models/gapfills`, `/api/models/gapfills/manage`, `/api/models/fba`.
- **Jobs:** GET `/api/jobs`, POST `/api/jobs/reconstruct`, `/api/jobs/gapfill`, `/api/jobs/fba`, `/api/jobs/manage`.
- **Media:** GET `/api/media/public`, `/api/media/mine`.
- **Workspace:** Transition to new API only — POST `/api/workspace/ls`, `/get`, `/create`, `/delete`, `/copy`, `/metadata`, `/permissions`, `/download-url` (request/response format matches PATRIC workspace JSON-RPC, REST transport).
- **Biochemistry:** Do not switch reference data tables to new API; keep using Solr for biochem search and table serving.
- Implement Build Model end-to-end flows (submit, poll jobs, manage outputs) against the new API.

### Phase 21: PATRIC & RAST Genome Selection Fix
**Status**: 🔄 In Progress
- Replace basic text inputs for PATRIC/RAST genomes in the "Build Model" page with functional, searchable data grids.
- Implement PATRIC Data API (RQL) for genome searching.
- Implement RAST job listing API via modelseed_support service.
- Use `DataControlHeader` for consistent search and pagination in PATRIC/RAST tabs.
- Ensure the "Build Model" action from the table correctly initiates reconstruction.

### Phase 22: Poplar API Endpoint Parity and Model Flow Reliability
**Status**: ✅ Complete
- Align frontend API usage with Poplar `/demo`-validated endpoint behavior for models/jobs/media/workspace (excluding biochem table serving).
- Remove model detail's hard dependency on workspace `/get` by preferring `/api/models/data`, `/api/models/gapfills`, and `/api/models/fba`.
- Add repeatable smoke verification for authenticated endpoint coverage against Poplar.
- Ensure My Models click-through and downstream model detail rendering are stable with real user refs and raw PATRIC token auth.
- Finalize `/myMedia` endpoint-backed behavior and remove broken banner once stable.
- Finalize `/plant` build model and jobs workflows end-to-end using authenticated API calls.

### Phase 23: Full Non-Biochem Endpoint Coverage and Localhost Demo Validation
**Status**: 🔄 In Progress
- Add frontend API client coverage for all modelseed-api non-biochem endpoints used by `/demo` and documented in `modelseed-api` README.
- Keep Solr as the source for biochemistry reactions and compounds tables.
- Extend token-auth smoke validation against `http://localhost:8000` tunnel to cover non-destructive checks for models/jobs/media/workspace endpoints.
- Verify primary user pages (`/my-models`, `/myMedia`, `/plant`, `/model/...`) remain functional and visually aligned with legacy layout expectations.
- Exclude destructive delete-model testing from automated verification.

### Phase 24: Page-Level API Adoption and Browser Final Verification
**Status**: 🔄 In Progress
- Apply newly added non-biochem API endpoints in the relevant UI pages, using legacy pages only for parity reference.
- Complete page-level API wiring for authenticated user flows (`/my-models`, `/myMedia`, `/plant`, `/model/...`) while preserving current delete restrictions in tests.
- Execute real browser validation on localhost with token-authenticated session and verify route behavior end-to-end.
- Document remaining unbuilt or intentionally deferred legacy-equivalent pages/features.

### Phase 25: Missing Workflow UIs (Merge, Edit, History, Media CRUD, Delete)
**Status**: 🔄 In Progress
- Design and implement dedicated merge-model workflow UI for `POST /api/jobs/merge`.
- Design and implement dedicated model editing workflow UI for `POST /api/models/edit`.
- Build a richer model edit-history interface (beyond counts) using `/api/models/edits`.
- Implement full my-media CRUD parity (create/delete media) with safe delete UX.
- Implement delete-model UI behavior wired to existing delete API, with tests constrained to non-supervisor/test models.

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
- Updated: 2026-03-12 19:26:13 -05:00 - Added Phase 20 scope for models/jobs/workspace proxy and Build Model end-to-end integration.
- Updated: 2026-03-12 19:50:00 -05:00 - Phase 20: workspace transition to POST /api/workspace/*; new API for all except Solr biochem tables; Poplar URL and PATRIC auth.
- Updated: 2026-03-12 19:55:16 CDT - Phase 20 implementation committed; final authenticated Poplar verification still pending.
- Updated: 2026-03-13 09:30:00 -05:00 - Added Phase 21 for PATRIC/RAST Genome Selection Fix in Build Model page.
- Updated: 2026-03-13 09:57:09 CDT - Executed Phase 21 plans; implementation complete with build verification, awaiting authenticated browser validation.
- Updated: 2026-03-13 10:56:00 CDT - Added Phase 22 for Poplar endpoint parity and model flow reliability hardening.
- Updated: 2026-03-13 11:01:38 CDT - Re-scoped Phase 22 with explicit `/myMedia`, `/plant`, and target `/model/...` outcomes aligned to demo behavior.
- Updated: 2026-03-13 11:12:24 CDT - Phase 22 executed and verified (PASS) with authenticated localhost demo smoke checks.
- Updated: 2026-03-16 09:36:04 CDT - Added Phase 23 for full non-biochem endpoint coverage and localhost tunnel validation.
- Updated: 2026-03-16 09:46:46 CDT - Added Phase 24 for page-level API adoption and browser final verification.
- Updated: 2026-03-16 10:17:02 CDT - Added Phase 25 scope for remaining workflow UIs (merge, edit, history, media CRUD, delete model).
- Updated: 2026-03-16 10:36:09 CDT - Executed Phase 25 implementation work; code/build verification passed and live authenticated destructive-flow checks remain pending.
