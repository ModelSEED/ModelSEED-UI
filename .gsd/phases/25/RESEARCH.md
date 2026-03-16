---
phase: 25
level: 2
researched_at: 2026-03-16 10:17:02 CDT
---

# Phase 25 Research: Remaining Workflow UIs (Merge, Edit, History, Media CRUD, Delete)

## Questions Investigated
1. Which backend endpoints already exist for merge, edit, edit-history, media CRUD, and delete?
2. Which UI entry points are natural, given the current Next.js layouts and the legacy Angular views?
3. How can delete testing be made safe so we validate behavior without deleting supervisor-critical models?

## Findings

### Existing endpoints and client wrappers
- Merge models:
  - Backend: `POST /api/jobs/merge`
  - Client: `submitMergeJobFromApi(payload)` in `lib/api/modelseed.ts`.
- Model editing:
  - Backend: `POST /api/models/edit` (currently 501 on some backends, but contract is defined).
  - Client: `editModelFromApi(payload)` in `lib/api/modelseed.ts`.
- Model edit history:
  - Backend: `GET /api/models/edits?ref=...` (501 or result list depending on deployment phase).
  - Client: `listModelEditsFromApi(ref)` in `lib/api/modelseed.ts` and basic status surfaced in model detail.
- Media:
  - Backend: `GET /api/media/public`, `GET /api/media/mine`, `GET /api/media/export?ref=...`.
  - No dedicated media create/delete endpoints yet; media objects are still workspace-backed.
- Delete model:
  - Backend: `DELETE /api/models?ref=...`.
  - Client: `deleteModelFromApi(ref)` is already implemented.

### Natural UI entry points
- Merge models:
  - UI belongs under user data → My Models (table-level multi-select + “Merge Models” action).
- Model edit + history:
  - UI belongs on the model detail page:
    - Tab or panel for “Edits”.
    - Edit form for adding/removing reactions or changing biomass (Phase 2 of API).
- Media CRUD:
  - UI belongs under `/myMedia` with:
    - “Create New Media” form.
    - Row-level delete with confirmation.
- Delete model:
  - Existing delete modal in My Models should use the new delete API but test only against throwaway/test models.

### Safe delete testing strategy
- Use a dedicated test model for end-to-end delete verification (e.g., a model created in the same test flow).
- For supervisor accounts, keep delete UI wired and visible but:
  - Do not fire delete operations against important references.
  - Encode tests so that they first create and then delete a disposable model if needed.

## Decisions Made
| Decision | Choice | Rationale |
|---|---|---|
| Merge UI location | My Models table with multi-select + merge dialog | Matches user mental model and legacy workflows |
| Edit UI location | Model Detail page, new Edit tab | Keeps editing close to model inspection |
| History UI | Model Detail → Edits tab listing events | Natural place to review changes |
| Media CRUD | `/myMedia` page with create + delete | Aligns with legacy My Media workflows |
| Delete testing | Only delete disposable test models | Respects supervisor account safety requirement |

## Patterns to Follow
- Use `@tanstack/react-query` and existing API client wrappers for all new flows.
- Keep destructive actions guarded by clear confirmation dialogs and descriptive messaging.
- Mirror legacy table/toolbar patterns for usability where helpful, without copying code.

## Anti-Patterns to Avoid
- Do not run delete against real supervisor models in automated tests.
- Do not introduce new ad-hoc fetch logic in components; rely on `lib/api/*`.
- Do not depend on biochem endpoints for these flows.

## Ready for Planning
- [x] Endpoint + client inventory complete.
- [x] Target UI entry points chosen.
- [x] Safe testing strategy for delete clarified.

## Timestamp Log
- Created: 2026-03-16 10:17:02 CDT

