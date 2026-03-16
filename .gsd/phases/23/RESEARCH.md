---
phase: 23
level: 2
researched_at: 2026-03-16 09:36:04 CDT
---

# Phase 23 Research: Full Non-Biochem API Coverage via Localhost Demo Tunnel

## Questions Investigated
1. Which non-biochem endpoints are exposed in `modelseed-api` README and `/demo` behavior?
2. Which endpoints are already implemented in the frontend API clients?
3. Which missing endpoints can be safely validated without destructive operations?
4. How should token-driven localhost tunnel tests be handled without exposing secrets in tracked files?

## Findings

### modelseed-api README and route contract
The `ModelSEED/modelseed-api` README and FastAPI route files confirm the active non-biochem endpoint families:
- Models: `/api/models`, `/api/models/data`, `/api/models/export`, `/api/models/copy`, `/api/models/gapfills`, `/api/models/gapfills/manage`, `/api/models/fba`, `/api/models/edits`, `/api/models/edit`
- Jobs: `/api/jobs`, `/api/jobs/reconstruct`, `/api/jobs/gapfill`, `/api/jobs/fba`, `/api/jobs/merge`, `/api/jobs/manage`
- Media: `/api/media/public`, `/api/media/mine`, `/api/media/export`
- Workspace: `/api/workspace/ls`, `/get`, `/create`, `/copy`, `/delete`, `/metadata`, `/permissions`, `/download-url`

### Existing frontend coverage
Current `lib/api/modelseed.ts` and `lib/api/workspace.ts` already include most core endpoints used by production pages:
- Present: model list/data/export/delete/copy/gapfills/manage/fba, jobs list/reconstruct/gapfill/fba/manage, media public/mine, workspace ops listed above.
- Missing explicit wrappers: `POST /api/jobs/merge`, `GET /api/media/export`, `GET /api/models/edits`, `POST /api/models/edit`.

### Demo behavior from `/demo`
The demo dashboard exercises:
- Model listing/detail, export, gapfill, FBA
- Job submission and polling
- Public media listing
- Workspace listing
The full API docs and routes expose additional endpoints not currently used by all UI pages; those should still be wired in the client layer for parity and future UI integration.

### Token/auth behavior
All tested endpoints expect raw PATRIC token value in `Authorization` header. No `Bearer` prefix is required.

### Biochemistry exception
Per project rules and backend guidance, compounds/reactions reference tables remain on Solr. No migration of those table-serving flows is part of this phase.

## Decisions Made
| Decision | Choice | Rationale |
|---|---|---|
| Endpoint completion | Add missing non-biochem wrappers now | Keeps frontend API layer fully aligned with backend docs/routes |
| Smoke coverage | Expand non-destructive local smoke checks | Validates route/auth wiring without mutating user model data |
| Secret handling | Keep token-only tests in gitignored local files | Avoids committing token-bearing test artifacts |
| Page validation | Verify `/my-models`, `/myMedia`, `/plant`, `/model/...` with build/lint + smoke checks | Confirms main user flows remain stable after API-layer expansion |

## Patterns to Follow
- Keep all backend calls centralized in `lib/api/modelseed.ts` and `lib/api/workspace.ts`.
- Continue using `withRawTokenAuth` for auth header consistency.
- Use non-destructive payload probes (expecting 400/422 where appropriate) to verify endpoint availability.

## Anti-Patterns to Avoid
- Do not hardcode tokens in tracked scripts or docs.
- Do not use destructive model deletion in automated tests.
- Do not move biochem tables from Solr in this phase.

## Risks
- Some endpoints may return 5xx in specific Poplar deployments for valid auth; tests should separate auth/contract failures from backend service instability.
- Optional endpoints (`models/edit`, `models/edits`) may return `501`; test output should report this explicitly rather than treating it as syntax failure.

## Ready for Planning
- [x] Endpoint matrix collected from README and routes
- [x] Missing client coverage identified
- [x] Safe test strategy defined

## Timestamp Log
- Created: 2026-03-16 09:36:04 CDT
