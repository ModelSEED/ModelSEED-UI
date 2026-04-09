---
phase: 26
updated_at: 2026-03-16 11:18:00 CDT
---

# Phase 26 Model Detail Parity Inventory

## Scope
This inventory covers legacy model-detail surfaces from `external/ModelSEED-UI/app/views/data/model.html` and related included templates, mapped against the modern `app/model/[...path]/page.tsx` implementation.

## Status Legend
- `Translated` - implemented in the modern model page for Phase 26 validation scope.
- `Partially translated` - visible modern equivalent exists, but legacy behavior depth is not fully reproduced.
- `Deferred` - intentionally not translated in this phase.
- `Unsupported` - legacy behavior depends on backend/supporting capabilities not available in the modern app today.

## Feature Matrix
| Legacy feature group | Current status | Notes |
|---|---|---|
| Model title/header | Translated | Modern header shows model title and keeps primary action cluster on page. |
| Run FBA button | Deferred | Left intentionally unchanged per user instruction. |
| Run GapFilling button | Deferred | Left intentionally unchanged per user instruction. |
| Rebuild Model button | Deferred | Placeholder styling remains; no workflow integration added in Phase 26. |
| Blast Genome button | Deferred | Placeholder styling remains; no workflow integration added in Phase 26. |
| Add Expression button | Deferred | Placeholder styling remains; no upload workflow added in Phase 26. |
| Visualize Data selector | Translated | Dropdown now drives conditional panel rendering for FBA, Expression, and GapFill. |
| FBA visualize panel | Partially translated | Modern page renders data, empty, and error states; legacy-style row actions and selection context are not yet reproduced. |
| GapFill visualize panel | Partially translated | Modern page renders data, empty, and error states; legacy-style row actions and selection context are not yet reproduced. |
| Expression visualize panel | Translated | Modern page renders expression rows from `expression_data` with legacy-style empty state. |
| Overview metadata section | Translated | Key model metadata remains visible and now includes edit-count status. |
| Reactions tab | Translated | Modern data grid remains in place. |
| Compounds tab | Translated | Modern data grid remains in place. |
| Genes tab | Translated | Modern data grid remains in place. |
| Compartments tab | Translated | Modern data grid remains in place. |
| Biomass tab | Translated | Modern data grid remains in place. |
| Pathways tab | Translated | Static pathway summary tab remains in place. |
| Reaction detail side panel | Translated | Added right-side drill-in drawer with row metadata and explicit close control. |
| Compound detail side panel | Translated | Added right-side drill-in drawer with row metadata and explicit close control. |
| Model download/options surface | Translated | Added model-detail-local download menu with SBML/JSON/TSV export feedback. |
| Edit Model tab | Translated | Implemented in Phase 25 and retained in model detail flow. |
| Edit history table | Translated | Implemented in Phase 25 and retained in model detail flow. |
| Plant-only Predictions tab | Deferred | Legacy plant-specific surface is not carried into the simplified modern tab set. |
| Dynamic pathway tabs | Deferred | Legacy dynamic pathway tabs are not reproduced in the modern page architecture. |
| Organism image / external links block | Deferred | Legacy right-rail image/links block is not implemented in the modern page. |

## Validation-Relevant Gaps Remaining
- Live backend validation is currently blocked by upstream `Workspace` 500 errors on `/api/models` and `/api/models/data`.
- Visualize Data FBA/GapFill panels do not yet include legacy row-level actions or detail-route links.
- Plant-only predictions, dynamic pathway tabs, and the legacy right-rail image/links block remain deferred.
- Rebuild/Blast/Add Expression workflows remain intentionally out of scope for this phase.

## Outcome
The highest-priority visible model-detail parity gaps requested for Phase 26 are implemented in code:
- Functional Visualize Data rendering.
- Model-local drill-in surfaces for reactions and compounds.
- Model-local download/options interaction.

Remaining work is either intentionally deferred or blocked by current backend behavior.

## Timestamp Log
- Created: 2026-03-16 11:18:00 CDT
