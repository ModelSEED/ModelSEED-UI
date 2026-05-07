# DataControlHeader integration map

This document lists every place the shared toolbar (`components/layout/DataControlHeader.tsx`) is mounted and how each grid applies search, column filters, sorting, and pagination.

## Toolbar capabilities

- **Quick search** — writes `filterModel.quickFilterValues` (debounced). Highlighting uses the CSS Custom Highlight API where supported; `GridHighlightText` also reads quick-filter terms.
- **Filter and columns** — single column filter row (Community DataGrid limit) plus visibility toggles. Operators depend on column `type` (string, number, boolean, date).
- **Pagination** — toolbar `TablePagination` is the primary control; grids that use this toolbar should set **`hideFooter`** so the default DataGrid footer does not duplicate pagination.

## Page-by-page behavior

| Location | Data source | Grid modes | Notes |
|----------|-------------|------------|--------|
| `app/(reference-data)/biochem/reactions/page.tsx` | Solr | `paginationMode`, `sortingMode`, `filterMode`: **server** | Quick search and column filters are translated in `lib/api/biochem.ts` (`buildSolrUrl`). |
| `app/(reference-data)/biochem/compounds/page.tsx` | Solr | server | Same as reactions. Compound Solr schema has no `ontology` query field; ontology column is not server-filterable. |
| `app/(reference-data)/list-media/page.tsx` | modelseed-api or workspace | **client** (all rows loaded) | Quick search and filters run on loaded rows. |
| `app/(reference-data)/genomes/page.tsx` | API / static list | **client** | Same pattern. |
| `app/(reference-data)/genomes/Annotations/page.tsx` | Client data | **client** | Same pattern. |
| `app/(user-data)/my-models/page.tsx` | modelseed-api / workspace | **client** | `hideFooter` set. |
| `app/(user-data)/myMedia/page.tsx` | workspace | **client** | `hideFooter` set. |
| `app/(user-data)/my-jobs/page.tsx` | Client job list | **client** | `hideFooter` set. |
| `app/model/[...path]/page.tsx` | Model sub-tabs | **client** or **server** (lazy tabs) | Per-tab configuration; uses `hideFooter` where the toolbar controls paging. |
| `app/genome/[...path]/page.tsx` | Loaded genome object | **client** | `hideFooter` on both grids. |
| `app/gapfill/[...path]/page.tsx` | Loaded gapfill solution | **client** | `hideFooter`. |
| `app/fba/[...path]/page.tsx` | FBA results | **client** | `hideFooter` on reaction, exchange, and pathway map grids. |
| `components/build-model/PatricGenomesTable.tsx` | PATRIC / BV-BRC API | **server** when only quick search; **client batch** when column filters active | Quick search maps to RQL. Column filters are not expressible in RQL; when a column filter is active, the table fetches up to 5000 rows, then applies `filterDocsByGridModel` / `sortGridDocsLocally` from `lib/api/biochem.ts` and paginates in memory. |
| `components/build-model/RastGenomesTable.tsx` | modelseed-api list | **client** | All rows loaded; full toolbar semantics on in-memory data. |
| `components/ui/ReactionKnockoutsDialog.tsx` | In-memory reactions | **client** | `hideFooter`. |

## REST biochem helpers (not used by public biochem routes)

`getReactionsFromModelseedApi` / `getCompoundsFromModelseedApi` apply quick search, optional local refinement, column filters, sort, and slice in `fetchModelseedApiBiochem`. See code comments for fetch caps and `numFound` semantics.

## Verification

- Biochem Solr: `tests/e2e/datacontrol-header.spec.ts`, `tests/e2e/biochem/*.spec.ts`, `tests/unit/api/biochem.test.ts`.
- REST biochem batch path: `tests/unit/api/biochem-rest-filtering.test.ts`.
- Local filter helper: `filterDocsByGridModel` test in `tests/unit/api/biochem.test.ts`.

## Timestamp Log

- Created: 2026-05-04 12:15:00 UTC — Initial inventory and behavior notes.
- Updated: 2026-05-04 12:20:00 UTC — Documented PATRIC local filter batch, toolbar search sync pattern, and E2E additions.
