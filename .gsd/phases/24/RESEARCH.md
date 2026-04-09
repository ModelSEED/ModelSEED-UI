---
phase: 24
level: 2
researched_at: 2026-03-16 09:46:46 CDT
---

# Phase 24 Research: Page-Level API Adoption and Browser Validation

## Questions Investigated
1. Which pages still do not consume newly added `modelseed.ts` endpoint wrappers?
2. Which legacy pages indicate missing behaviors in current Next.js user flows?
3. What can be validated in real browser testing with token-auth while excluding delete actions?

## Findings

### Current page/API gaps
- `myMedia` does not currently expose a media export command, despite `/api/media/export` support and legacy media workflows expecting row-level actions.
- Model detail does not currently surface model edit-history endpoint status (`/api/models/edits`), so endpoint parity is not visible in the UI.
- `jobs/merge` and `models/edit` wrappers exist but no dedicated user-facing pages currently drive them.

### Legacy parity signals
Reference-only legacy templates show:
- `my-models.html`: command-focused table with download/delete and model-centric drill-down.
- `my-media.html`: table with row actions and media management workflows.
- `media.html`: public media table with action affordances.

The modern app should preserve comparable visibility of actions and status while staying within current scope.

### Browser verification scope
Token-auth browser validation should cover:
- `/my-models` (table, links, command menus)
- `/myMedia` (load + export command availability)
- `/plant` (build model tab flows and table actions)
- `/model/...` (data load + FBA/gapfill actions + edits visibility)

Delete operations remain excluded from test execution.

## Decisions Made
| Decision | Choice | Rationale |
|---|---|---|
| UI adoption priority | Wire `/api/media/export` and `/api/models/edits` into pages first | These endpoints have direct page relevance and improve parity |
| Merge/edit endpoints | Keep API-ready and document UI still pending | Prevent rushed UI invention without legacy-equivalent flow decisions |
| Browser testing method | Use localhost app in real browser with token-backed auth state | Matches user request for true page-level validation |

## Patterns to Follow
- Keep endpoint calls in `lib/api/modelseed.ts`; page components consume wrappers.
- Use non-destructive actions for browser verification.
- Maintain existing visual/table patterns (DataGrid + DataControlHeader).

## Anti-Patterns to Avoid
- Do not copy legacy Angular implementation details.
- Do not run delete-model actions in automated/browser verification.
- Do not shift biochem compounds/reactions table serving off Solr.

## Remaining Build Candidates Identified
- Dedicated UI for model merge job submission (`/api/jobs/merge`) is not yet built.
- Dedicated UI for model edit submission/history management (`/api/models/edit`, richer `/api/models/edits` workflow) is not yet fully built.
- Full my-media CRUD parity (create/delete media interactions) is not yet built in Next.js.

## Ready for Planning
- [x] Target page/API mismatches identified
- [x] Legacy parity cues captured
- [x] Browser validation scope and exclusions defined

## Timestamp Log
- Created: 2026-03-16 09:46:46 CDT
