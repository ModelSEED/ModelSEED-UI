---
phase: 20
level: 2
researched_at: 2026-03-12 19:26:13 -05:00
---

# Phase 20 Research

## Target: New API (Poplar) for Everything Except Biochem Tables

**Authority:** Backend team (José). API base: `http://poplar.cels.anl.gov:8000` (config: `MODELSEED_API_URL`). Set `USE_MODELSEED_API=true` and `USE_NEW_PROXY=true` for full migration.

**Use the new API for:**
- **Models:** GET /api/models, GET /api/models/data?ref=, GET /api/models/export?ref=&format=, DELETE /api/models?ref=, POST /api/models/copy, GET /api/models/gapfills?ref=, POST /api/models/gapfills/manage, GET /api/models/fba?ref=
- **Jobs:** GET /api/jobs?ids=, POST /api/jobs/reconstruct, POST /api/jobs/gapfill, POST /api/jobs/fba, POST /api/jobs/manage
- **Media:** GET /api/media/public, GET /api/media/mine
- **Workspace proxy:** POST /api/workspace/ls, /get, /create, /delete, /copy, /metadata, /permissions, /download-url — request/response format matches PATRIC workspace JSON-RPC but uses REST.

**Do not use the new API for:**
- **Biochemistry table serving:** Keep using Solr directly for biochem search and table data ("For biochem search you can keep using Solr directly — our local biochem endpoints are simpler"). Biochemistry used to *build* models may use new API where applicable; the reference data tables (compounds, reactions) stay on Solr unless otherwise specified.

**Auth:** All new API requests require the PATRIC token in the `Authorization` header (raw token, no Bearer prefix). Pass the token directly as currently implemented.

## Questions Investigated
1. Which new API endpoints are already integrated in frontend code?
2. What is missing for model/job/workspace parity with the new backend?
3. Where are auth token formatting and proxy toggles currently handled?

## Findings

### Current Integration Coverage
- Implemented in `lib/api/modelseed.ts`:
  - `GET /api/models`, export, delete; model data, copy, gapfills, gapfills/manage, fba; jobs (get, reconstruct, gapfill, fba, manage).
  - `GET /api/media/public`, `GET /api/media/mine`
- Implemented in `lib/api/workspace.ts`:
  - Workspace JSON-RPC legacy path (`Workspace.ls`, `Workspace.get`).
  - REST proxy path for ls/get when `USE_NEW_PROXY`; helpers for create, delete, copy, metadata, permissions, download-url.

### Gaps / Implementation Notes
- Workspace must be **transitioned** to the new API: all workspace operations should go through the workspace proxy (POST /api/workspace/ls, /get, /create, /delete, /copy, /metadata, /permissions, /download-url) when `USE_NEW_PROXY=true`. No legacy JSON-RPC for workspace in the target state.
- Build Model page still needs wiring to `/api/jobs/reconstruct` and job polling.
- Biochemistry: keep existing Solr-based flows for reference data tables; do not switch biochem table serving to new API unless product decision changes.

### Auth/Proxy Observations
- Token strategy: direct `Authorization: <raw token>` from `localStorage['auth']` — correct for Poplar.
- `USE_NEW_PROXY` and `USE_MODELSEED_API` in `lib/api/config.ts`; workspace client uses explicit `USE_NEW_PROXY` for mode selection.

## Decisions Made
| Decision | Choice | Rationale |
|---|---|---|
| Phase numbering | Continue as Phase 20 | User requested migration continuation in a new phase |
| API approach | Use new API for models, jobs, media, workspace proxy | Backend team confirmation; Poplar is dev-stable |
| Workspace | Transition to new API via workspace proxy only | POST /api/workspace/{ls,get,create,delete,copy,metadata,permissions,download-url} |
| Biochemistry tables | Keep Solr for table serving | "Keep using Solr directly" for biochem search; user: ignore biochem for tables |
| Auth | PATRIC token in Authorization header (direct) | Current behavior is correct |

## Patterns to Follow
- Keep auth header wiring in one helper used by all new API calls.
- Use typed request/response interfaces for model and job payloads.
- Keep feature flags (`USE_NEW_PROXY`, `USE_MODELSEED_API`) centralized in config.

## Anti-Patterns to Avoid
- Duplicating `fetch` + auth header code in components.
- Mixing direct JSON-RPC and REST calls in page components.
- Relying on URL substring checks to determine transport mode.

## Risks
- Token format mismatches between tunnel/proxy deployments.
- Partial migration can cause inconsistent behavior across pages.
- Build Model workflows require robust async job polling and cancellation behavior.

## Ready for Planning
- [x] Endpoint gap map complete
- [x] Auth/proxy risk areas identified
- [x] Scope split into executable plans

## Timestamp Log
- Created: 2026-03-12 19:26:13 -05:00
- Updated: 2026-03-12 19:45:00 -05:00 - Scope: new API for all except Solr biochem tables; workspace transition to POST /api/workspace/*; PATRIC token auth; Poplar base URL.
