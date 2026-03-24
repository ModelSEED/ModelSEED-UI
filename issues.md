# Known Issues & Developer Action Items

> **AI Agent & Developer Reference**
> This document catalogs known UI bugs, API limitations, backend blockers, and developer action items. Before modifying functionality, referencing legacy code, or attempting bug reports, review this log to verify whether an issue is an unintentional regression or a pending backend limitation.

---

## Table of Contents

1. [Backend API Limitations (Blocked)](#backend-api-limitations-blocked)
2. [Workspace API Issues](#workspace-api-issues)
3. [UI Bugs & Visual Issues](#ui-bugs--visual-issues)
4. [Missing Features / Parity Gaps](#missing-features--parity-gaps)
5. [Performance Considerations](#performance-considerations)
6. [Documentation TODO Items](#documentation-todo-items)

---

## Current Testing & Release Status (March 2026)

The application has undergone technical validation and is **Ready for Production User Testing**, with specific restrictions. 

**Ready for Testing:**
- JWT Authentication via PATRIC/RAST.
- Viewing and interrogating legacy reference models via the Workspace layer.
- Submitting Reconstruct, FBA, and Gapfill jobs.
- Viewing My Models, My Media, and My Jobs data tables natively in React.
- Interactive model details (Reactions, Compounds, Genes, Biomass, FBA pathways).

**Not Ready / Pending API Intervention:**
- Generating models from RAST genomes. The UI connects directly to a defunct legacy endpoint for genome listings.
- Executing model edits through the UI (`/api/models/edits` throws 501 Not Implemented).
- Model organism and taxonomy metadata details (Pending backend schema delivery in `api/models` responses). 

---

## Backend API Limitations (Blocked)

These issues require backend team fixes and cannot be resolved in the frontend alone.

### W001: Workspace Write Operations Unavailable
**Severity:** High
**Affected Operations:**
- `workspaceCreate` - Cannot create new workspace objects
- `workspaceDelete` - Cannot delete workspace objects
- `workspaceCopy` - Cannot copy workspace objects
- `workspaceMetadata` - Cannot get object metadata
- `workspacePermissions` - Cannot manage permissions
- `workspaceDownloadUrl` - Cannot generate download URLs

**Impact:**
- Users cannot save edited models or media to workspace
- Delete model/media workflows fail silently
- Cannot create copies of models for comparison workflows
- Media editor shows "API unavailable" warning

**Location:** `lib/api/workspace.ts`
**Backend Ticket Required:** Fix POST `/api/workspace/create`, `/delete`, `/copy`, `/metadata`, `/permissions`, `/download-url` endpoints in modelseed-api

**Workaround:** UI shows graceful "API unavailable" messages. No console errors.

---

### W002: Model Edit API May Return 501
**Severity:** High
**Affected Function:** `editModelFromApi`
**Endpoint:** `POST /api/models/edit`

**Impact:**
- Edit Model workflow cannot save reaction/gene changes
- Model Editor tab shows "API unavailable" warning
- Users can add/remove reactions in UI but cannot persist changes

**Location:** `lib/api/modelseed.ts:485-494`
**Backend Ticket Required:** Ensure `/api/models/edit` returns 200 with proper response

**Workaround:** Edit Model UI displays changes locally but shows disabled save button with explanation.

---

### W003: Expression Data Upload (Shock Integration)
**Severity:** Medium
**Affected Feature:** Expression data upload for models
**Backend Requirement:** Shock service integration

**Impact:**
- Cannot upload expression data (e.g., RNA-seq) to models
- Expression data tab may show placeholder state

**Location:** Model detail pages, FBA workflow
**Backend Ticket Required:** Shock service integration for expression data storage

**Workaround:** None - feature deferred until backend support available.

---

## Workspace API Issues

### WS001: Workspace `/get` Returns 500 for Some Objects
**Severity:** High
**Affected Objects:** Certain workspace genome/model objects may return 500 errors

**Impact:**
- Model detail pages may fail to load for some refs
- Genome detail pages may show error state
- Workspace browser shows "Failed to load" for some files

**Location:** `lib/api/workspace.ts`, `app/model/[...path]/page.tsx`
**Error Pattern:** `_ERROR_Workspace::get_objectlist: 500` in response

**Workaround:** Use `/api/models/data` and `/api/models/fba` as primary data sources instead of workspace `/get`. These endpoints are more reliable.

**Action Item:** Investigate which specific object types/paths trigger 500 errors and document workaround patterns.

---

### WS002: Workspace Directory Listing Slow for Large Directories
**Severity:** Medium
**Affected Function:** `workspaceLs`
**Impact:** `/data/[...path]` page may be slow to load for directories with many files

**Location:** `app/data/[...path]/page.tsx`
**Performance Note:** Directory listing is synchronous on initial load

**Workaround:** Implemented pagination for biochem tables. Workspace browser uses client-side pagination.

---

## UI Bugs & Visual Issues

### UI001: Chemical Equation Subscript Formatting Inconsistent
**Severity:** Low
**Affected Pages:** Reaction detail, Model reactions tab
**Component:** `components/ui/ChemicalEquation.tsx`

**Impact:**
- Some compound formulas may not render correctly (e.g., "CHOCO2" should be "CHO₂")
- Stoichiometry coefficients may appear adjacent to formulas without spacing

**Location:** `lib/utils/formatEquation.ts`
**Root Cause:** Regex patterns may not cover all chemical formula edge cases

**Action Item:** Audit reaction equations against legacy UI rendering. Fix regex patterns for edge cases.

---

### UI002: Grid Row Selection Model Type Changes
**Severity:** Medium
**Affected Components:** DataGrids with row selection
**MUI Version:** `@mui/x-data-grid` v7+

**Impact:**
- `GridRowSelectionModel` is now an object (`{ type: 'include', ids: Set }`) not array
- Existing code using `.length` or `.map` on selection model may fail
- Multiple dialogs (`AddCompoundsDialog`, `AddReactionsDialog`) required fixes

**Location:** 
- `components/ui/AddCompoundsDialog.tsx`
- `components/ui/AddReactionsDialog.tsx`
- `app/model/[...path]/page.tsx`

**Action Item:** Audit all DataGrid row selection code for v7 compatibility. Run full build to verify.

---

### UI003: Tab Selection State Lost on Navigation
**Severity:** Low
**Affected Pages:** Model detail (tabs), Biochemistry detail pages

**Impact:**
- If user navigates away from model detail and returns, tab resets to default (Overview)
- Not a regression - behavior matches legacy for most cases

**Location:** `app/model/[...path]/page.tsx`
**Root Cause:** Next.js page re-render resets React state

**Action Item:** Consider URL-based tab state (`?tab=reactions`) for deep-linking support.

---

### UI004: Empty States Could Be More Informative
**Severity:** Low
**Affected Pages:** My Models (no models), My Media (no media), Search results (no results)

**Current State:** Generic "No data" messages

**Action Item:** Add contextual empty states with:
- Explanatory text about why data might be empty
- Call-to-action buttons (e.g., "Create your first model")
- Links to relevant documentation

---

## Missing Features / Parity Gaps

### MF001: Model Merge Workflow UI Not Implemented
**Severity:** Medium
**Legacy Feature:** "Merge Models" functionality
**API Endpoint:** `POST /api/jobs/merge` exists in backend

**Impact:**
- Users cannot merge two models into one
- Compare workflow cannot auto-suggest merging

**Location:** `app/(user-data)/my-models/page.tsx`
**Action Item:** Design and implement merge workflow UI with:
- Model selection (2 models)
- Conflict resolution UI
- Progress indicator for job submission

---

### MF002: Model History/Edits UI Limited
**Severity:** Medium
**Legacy Feature:** Full edit history timeline
**API Endpoint:** `/api/models/edits` returns list of model edits

**Current State:** Edit tab shows counts and summaries only

**Impact:**
- Users cannot see detailed edit history
- Cannot revert to previous model state

**Location:** `app/model/[...path]/page.tsx` (Edit tab)
**Action Item:** Implement timeline view for model edit history using `listModelEditsFromApi`.

---

### MF003: FBA/Media Selection Dialogs Need Integration
**Severity:** Low
**Components Created:** `SelectMediaDialog.tsx`, `SaveAsDialog.tsx`

**Current State:** Dialog components exist in `components/ui/` but not integrated into:
- FBA configuration page
- Gapfill configuration page
- Save As workflow

**Action Item:** Integrate dialogs into relevant workflow pages:
- FBA form: Add "Select Media" button that opens `SelectMediaDialog`
- Model detail: Add "Save As" button that opens `SaveAsDialog`

---

### MF004: Bulk Download Limited to CSV
**Severity:** Low
**Affected Pages:** `/biochem/compounds`, `/biochem/reactions`

**Current State:** CSV export only

**Legacy Feature:** Bulk download included JSON and TSV formats

**Action Item:** Add JSON and TSV export options alongside CSV.

---

### MF005: Build Model Plant Workflow Awaiting Backend
**Severity:** Medium
**Affected Page:** `/plant`
**Feature:** Build metabolic model from plant genome

**Current State:** Page renders but workflow may not complete

**Impact:** Users cannot build plant models through the UI

**Action Item:** 
1. Test `/plant` workflow end-to-end with real plant genome
2. Identify any API failures in job submission or result retrieval
3. Document backend requirements if workflow is blocked

---

### MF006: Workspace Browser File Preview Not Implemented
**Severity:** Low
**Affected Page:** `/data/[...path]`

**Current State:** Lists files with metadata, download links

**Missing:** 
- Preview for text files (model files, JSON)
- Preview for images
- Syntax highlighting for code/formats

**Action Item:** Implement file preview panel for common file types.

---

## Performance Considerations

### PERF001: React Query Stale Time May Cause Stale Data
**Severity:** Low
**Affected Queries:** User data queries (models, media, jobs)

**Current State:** `staleTime: 5 * 60 * 1000` (5 minutes) for most queries

**Impact:** 
- User may see stale model list after creating/deleting
- Job status may not update immediately after submission

**Action Item:** Consider reducing `staleTime` for frequently changing data or implement proper cache invalidation on mutations.

---

### PERF002: Large Model Data Causes Slow Renders
**Severity:** Medium
**Affected Pages:** Model detail (Reactions tab, Compounds tab)
**Models:** Models with 5000+ reactions

**Current State:** DataGrid renders all rows at once

**Impact:** UI may lag when scrolling through large models

**Action Item:** Implement virtualization or pagination for large datasets. Consider lazy-loading tabs.

---

## Documentation TODO Items

### DOC001: Update ARCHITECTURE.md for Phase 31 Changes
**Status:** Pending
**Changes to Document:**
- New dialog components in `components/ui/`
- MediaEditor component purpose and usage
- Model Comparison page at `/compare`
- Data Browser at `/data/[...path]`

**Action Item:** Update `docs/ARCHITECTURE.md` with new component descriptions.

---

### DOC002: API Endpoint Coverage Documentation Outdated
**Status:** Needs Review
**File:** `docs/WORKSPACE.md`

**Changes to Document:**
- Document new API endpoints from Phase 23 (`/api/models/edit`, `/api/jobs/merge`, etc.)
- Update endpoint matrix with availability status
- Add examples for new API usage patterns

**Action Item:** Audit all API endpoints used in codebase and ensure `docs/WORKSPACE.md` reflects current state.

---

### DOC003: Missing Component API Documentation
**Status:** Ongoing
**Affected Components:**
- `components/ui/MediaEditor.tsx`
- `components/ui/AddCompoundsDialog.tsx`
- `components/ui/AddReactionsDialog.tsx`
- `components/ui/SelectMediaDialog.tsx`
- `components/ui/SaveAsDialog.tsx`
- `components/ui/ShowMetadataDialog.tsx`
- `lib/utils/exportCsv.ts`

**Action Item:** Add JSDoc comments to exported components and create component API documentation.

---

## Quick Reference: Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_USE_MODELSEED_API` | Enable modelseed-api integration | `false` |
| `NEXT_PUBLIC_MODELSEED_API_URL` | modelseed-api base URL | - |
| `NEXT_PUBLIC_USE_NEW_PROXY` | Use workspace REST proxy | `false` |
| `NEXT_PUBLIC_POPLAR_URL` | Poplar deployment URL | - |

**Note:** When `USE_MODELSEED_API=false`, user data features show "API unavailable" states gracefully.

---

## Reporting New Issues

When adding new issues to this document, follow this template:

```markdown
### [ISSUE-ID]: Brief Title
**Severity:** High/Medium/Low
**Affected:** [Component/Page/Feature]
**Description:** [What is broken or missing]
**Impact:** [User-facing consequences]
**Location:** [File paths]
**Action Item:** [How to fix or investigate]
**Backend Required:** [Yes/No - if API endpoint needs fixing]
```

---

*Last Updated: 2026-03-24*
*Maintained by: Development Team*
*Document Version: 1.1*
