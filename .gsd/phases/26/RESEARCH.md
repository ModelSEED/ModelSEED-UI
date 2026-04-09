---
phase: 26
researched_at: 2026-03-16 11:07:14 CDT
---

# Phase 26 Research: Model Detail Legacy Translation Gaps

## Objective
Document all model-detail features that remain untranslated from legacy (`external/ModelSEED-UI`) into the modern Next.js model page, with explicit scope for validation readiness.

## Scope Decision
- In scope: model detail parity gaps that block full validation for `/model/...`.
- Out of scope for this phase: changing current Run FBA / Run Gapfill button integration behavior (user-requested hold).

## Legacy Baseline Reviewed
- `external/ModelSEED-UI/app/views/data/model.html`
- `external/ModelSEED-UI/app/views/data/model-generic.html`
- `external/ModelSEED-UI/app/views/lists/model-fbas.html`
- `external/ModelSEED-UI/app/views/lists/model-gapfills.html`
- `external/ModelSEED-UI/app/views/lists/expanded-expression.html`
- `external/ModelSEED-UI/app/ctrls/data-view-ctrls.js`

## Current Modern Baseline Reviewed
- `app/model/[...path]/page.tsx`
- `components/ui/ModelDetailHeader.tsx`
- `lib/api/modelseed.ts`

## Untranslated / Incomplete Features

### 1) Visualize Data dropdown behavior
- Legacy: dropdown drives conditional panels for FBA, Expression, GapFill.
- Current: dropdown state exists but does not render any selection-specific panel.
- Impact: high (explicitly visible mismatch and non-functional UX).

### 2) Related FBA and Gapfill data panels under Visualize Data
- Legacy: model-scoped list views with rows and selection/actions context.
- Current: no equivalent panels on model detail despite available APIs (`/api/models/fba`, `/api/models/gapfills`).
- Impact: high for parity and validation.

### 3) Expression visualization panel
- Legacy: expression list table with empty-state messaging.
- Current: no expression panel linked to Visualize Data.
- Impact: medium-high.

### 4) Download/options and detail-surface parity
- Legacy: explicit model download options panel and side detail views for reaction/compound drill-ins.
- Current: model detail page lacks equivalent drill-in surfaces and does not reproduce legacy download/options UX.
- Impact: medium.

### 5) Plant/advanced legacy surfaces not translated
- Legacy includes additional plant-specific/dynamic surfaces (Predictions tab, dynamic map tabs).
- Current has a simplified static tab model.
- Impact: medium; must be explicitly translated or intentionally marked unsupported in UI.

## API/Backend Feasibility
- Required data APIs already exist in frontend client:
  - `getModelFbaFromApi(ref)`
  - `listModelGapfillsFromApi(ref)`
  - `manageModelGapfillsFromApi(payload)`
- Expression panel can initially consume available model object fields (`expression_data`) with graceful empty-state if absent.

## Validation Targets for Phase 26
- `/model/...` Visualize Data dropdown is functional and drives visible content states.
- FBA/Gapfill/Expression states show deterministic empty/data/error behavior.
- Non-translated legacy-only features are either implemented or explicitly surfaced as unsupported with clear UX messaging.

## Timestamp Log
- Created: 2026-03-16 11:07:14 CDT
