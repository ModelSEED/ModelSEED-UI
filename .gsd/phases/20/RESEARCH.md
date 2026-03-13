---
phase: 20
level: 2
researched_at: 2026-03-12 19:26:13 -05:00
---

# Phase 20 Research

## Questions Investigated
1. Which new API endpoints are already integrated in frontend code?
2. What is missing for model/job/workspace parity with the new backend?
3. Where are auth token formatting and proxy toggles currently handled?

## Findings

### Current Integration Coverage
- Implemented in `lib/api/modelseed.ts`:
  - `GET /api/models`
  - `GET /api/models/export`
  - `DELETE /api/models`
  - `GET /api/media/public`
  - `GET /api/media/mine`
- Implemented in `lib/api/workspace.ts`:
  - Workspace JSON-RPC legacy path (`Workspace.ls`, `Workspace.get`)
  - REST proxy path for `ls/get` when using `/api/workspace`.

### Gaps Against Target Endpoints
- Missing model operations in frontend client:
  - `/api/models/data`, `/api/models/copy`, `/api/models/gapfills`, `/api/models/gapfills/manage`, `/api/models/fba`.
- Missing jobs client coverage:
  - `/api/jobs`, `/api/jobs/reconstruct`, `/api/jobs/gapfill`, `/api/jobs/fba`, `/api/jobs/manage`.
- Build Model page (`app/(build-model)/plant/page.tsx`) is still mostly UI skeleton and does not submit jobs or poll job states.

### Auth/Proxy Observations
- Current token strategy is direct `Authorization: <raw token>` from `localStorage['auth']`.
- `USE_NEW_PROXY` and `USE_MODELSEED_API` exist in `lib/api/config.ts`, but not all consumers are consolidated into one typed API client.
- Workspace proxy routing in `lib/api/workspace.ts` currently relies on URL-shape detection (`WORKSPACE_URL.includes('/api/')`), which is functional but brittle compared to explicit flag routing.

## Decisions Made
| Decision | Choice | Rationale |
|---|---|---|
| Phase numbering | Continue as Phase 20 | User requested migration continuation in a new phase |
| API approach | Expand typed `modelseed-api` client and migrate consumers | Reduces duplicated fetch/auth logic |
| Build Model migration | Implement jobs-backed flows via `/api/jobs/*` | Needed for end-to-end parity |
| Workspace proxy strategy | Use explicit proxy mode and operation map | Avoid URL-string heuristics |

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
