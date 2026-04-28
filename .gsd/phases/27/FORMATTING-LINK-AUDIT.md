---
phase: 27
audited_at: 2026-03-16 11:45:49 CDT
---

# Phase 27 Formatting and Link Audit

## Scope
Audit formatting consistency and link behavior across model-detail, user data, and reference-data pages for validation readiness against legacy behavior.

## Matrix
| Surface | Formatting Status | Link Status | Severity | Notes |
|---|---|---|---|---|
| `app/model/[...path]/page.tsx` Overview | Partially aligned | Partially aligned | Medium | Genome ref now links to `/genome/...`; target page is still a placeholder view. |
| `app/model/[...path]/page.tsx` Reactions tab | Aligned | Aligned | Low | Equation now uses `ChemicalEquation`; reaction IDs link to `/biochem/reactions/[id]`. |
| `app/model/[...path]/page.tsx` Compounds tab | Aligned | Aligned | Low | Formula now uses `formatFormula`; compound IDs link to `/biochem/compounds/[id]`. |
| `app/model/[...path]/page.tsx` Biomass tab | Partially aligned | Aligned | Medium | Compound refs link to `/biochem/compounds/[id]`; biomass formula-level display is still simplified. |
| `app/model/[...path]/page.tsx` Visualize Data FBA | Partially aligned | Not aligned | High | Row IDs are visible but not yet linked to `/fba/...`; legacy had direct drill-through behavior. |
| `app/model/[...path]/page.tsx` Visualize Data GapFill | Partially aligned | Not aligned | High | Row IDs are visible but not yet linked to `/gapfill/...`; legacy had direct drill-through behavior. |
| `app/model/[...path]/page.tsx` Legacy surfaces status block | Aligned | N/A | Low | Deferred features are explicitly surfaced to users (Predictions, dynamic pathway tabs). |
| `app/model/[...path]/page.tsx` Organism image/links card | Partially aligned | Partially aligned | Medium | Card exists; data depends on backend payload availability. |
| `app/(user-data)/my-models/page.tsx` table and commands | Aligned | Aligned | Low | Model IDs link to detail page; commands provide download/delete; tracked-job actions are wired. |
| `app/(user-data)/myMedia/page.tsx` | Partially aligned | Partially aligned | Medium | CRUD and export exist; no dedicated media detail route parity with legacy single-item page. |
| `app/(reference-data)/list-media/page.tsx` | Partially aligned | Partially aligned | Medium | Export works, but reference-media drill-through remains limited vs legacy media page behavior. |
| `app/(reference-data)/biochem/reactions/page.tsx` | Aligned | Aligned | Low | Reaction IDs are linked and equations are chemically formatted. |
| `app/(reference-data)/biochem/compounds/page.tsx` | Aligned | Aligned | Low | Compound IDs are linked and formulas are chemically formatted. |

## High-Severity Inconsistencies
1. Visualize Data FBA rows do not provide direct links to FBA detail routes.
2. Visualize Data GapFill rows do not provide direct links to GapFill detail routes.

## Medium-Severity Notes (tracked, not blocking this task)
1. Genome detail route remains a placeholder page, so genome-ref links are navigable but not yet feature-complete.
2. Organism image/links panel availability depends on backend model payload fields.
3. My Media and List Media do not yet reproduce full legacy per-item detail-page drill-through behavior.

## Planned Fixes in This Phase
- Add direct links from Visualize Data FBA/GapFill IDs to `/fba/...` and `/gapfill/...` where refs are available.

## Timestamp Log
- Created: 2026-03-16 11:45:49 CDT
