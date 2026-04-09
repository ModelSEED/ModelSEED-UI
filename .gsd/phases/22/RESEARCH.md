---
phase: 22
level: 2
researched_at: 2026-03-13 10:56:00 CDT
---

# Phase 22 Research: Demo-Parity Integration for My Media, Build Model, and Model Detail

## Questions Investigated
1. Which endpoints from the working demo at `http://localhost:8000/demo/` must be reflected in the Next.js UI flows?
2. Why does workspace proxy `POST /api/workspace/get` fail while model endpoints succeed?
3. What page-specific changes are required for `/myMedia`, `/plant`, and `/model/...` to fully work end-to-end?

## Findings

### Endpoint Baseline from Demo and Poplar
Working demo behavior (`http://localhost:8000/demo/`) and Poplar docs (`http://poplar.cels.anl.gov:8000/docs`) align on endpoint families:
- Models: `/api/models`, `/api/models/data`, `/api/models/export`, `/api/models/copy`, `/api/models/gapfills`, `/api/models/gapfills/manage`, `/api/models/fba`
- Jobs: `/api/jobs`, `/api/jobs/reconstruct`, `/api/jobs/gapfill`, `/api/jobs/fba`, `/api/jobs/manage`
- Media: `/api/media/public`, `/api/media/mine`
- Workspace proxy: `/api/workspace/ls`, `/get`, `/create`, `/delete`, `/copy`, `/metadata`, `/permissions`, `/download-url`

User-supplied traces confirm model/media endpoints return `200` with raw PATRIC token auth, while workspace `/get` currently returns `500` in at least one flow.

### Workspace Proxy Risk
Current UI relies on `workspaceGet` in model detail loading (`app/model/[...path]/page.tsx`). This creates a hard dependency on workspace `/get` response shape and availability.

Given observed `500` for `/api/workspace/get`, model detail should use model endpoints first:
- `/api/models/data?ref=`
- `/api/models/gapfills?ref=`
- `/api/models/fba?ref=`

Workspace proxy can remain for path listing and file operations, but not as single point of failure for model detail rendering.

### Auth and Header Contract
Current project behavior (raw token in `Authorization`) aligns with backend guidance and successful demo requests.

### Page-Level Integration Targets
- `/myMedia`: load authenticated user media data from `/api/media/mine`; remove broken warning/banner once endpoint path is stable.
- `/plant`: ensure Build Model submit paths and job tracking are fully functional using Poplar jobs + model endpoints.
- `/model/seaver@patricbrc.org/modelseed/patrictest_121620`: load model detail from `/api/models/data|gapfills|fba` even if workspace `/get` fails.

### Scope Clarification
- Keep reference-data biochem table serving on existing approach (do not migrate in this phase).
- Focus on model workflows and demo-parity endpoint integration for frontend reliability.

## Decisions Made
| Decision | Choice | Rationale |
|---|---|---|
| Model detail data source | Prefer model endpoints over workspace get | Removes known 500 blocker and matches working `/demo` behavior |
| Endpoint verification strategy | Add scripted smoke checks for models/jobs/media/workspace subsets | Ensures empirical validation for endpoint wiring before UI sign-off |
| Workspace migration handling | Keep proxy support but add robust error parsing and fallback routing | Maintains compatibility while reducing failures |
| My Media UX | Remove broken banner after endpoint reliability fix | Banner should not persist once real API-backed flow is stable |

## Patterns to Follow
- Use typed API clients in `lib/api/*` with strict error parsing.
- Normalize non-2xx JSON-RPC payloads before throwing.
- Keep model detail pages resilient with source fallback order and actionable errors.
- Validate page behavior against demo flows before marking phase complete.

## Anti-Patterns to Avoid
- Do not block model detail rendering on `workspace/get` only.
- Do not mix biochem table migration into this phase.
- Do not assume all endpoints return uniform JSON success envelopes.

## Dependencies Identified
| Package | Version | Purpose |
|---|---|---|
| next | existing | App routing and pages |
| @tanstack/react-query | existing | Data orchestration/caching for endpoint calls |
| @mui/x-data-grid | existing | Table rendering and interaction |

## Risks
- Some workspace proxy operations may still vary by deployment: mitigate with endpoint-specific error handling and smoke tests.
- Auth token expiry during manual verification: mitigate by documenting re-auth steps in verification tasks.
- Demo and app can use different hosts (`localhost` vs `poplar`): mitigate with explicit env-driven base URL and smoke script flags.

## Ready for Planning
- [x] Questions answered
- [x] Approach selected
- [x] Dependencies identified

## Timestamp Log
- Created: 2026-03-13 10:56:00 CDT
- Updated: 2026-03-13 11:01:38 CDT - Re-scoped research to explicit `/myMedia`, `/plant`, and `/model/...` demo-parity outcomes.
