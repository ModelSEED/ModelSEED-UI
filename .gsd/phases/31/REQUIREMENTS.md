# Phase 31: UI Transition Completion for User Testing

## Objective
Complete all UI-side logic and features to achieve parity with the legacy AngularJS UI, ensuring the application is ready for user testing once backend API issues are resolved.

## Background
The ModelSEED UI migration from AngularJS to Next.js has completed most major features, but several critical workflows and pages are missing or incomplete. This phase addresses all remaining gaps to ensure UI logic is sound and ready to work completely.

## Requirements

### R1: Data Browser Page (`/data/[...path]`)
**Priority**: HIGH
**Description**: Replace placeholder with functional workspace file browser
**Acceptance Criteria**:
- Display files/folders from workspace path
- Breadcrumb navigation working
- File metadata visible (size, type, date)
- Download links functional (with graceful fallback when API unavailable)
- Click folder to navigate into it

### R2: Model Comparison Page (`/compare`)
**Priority**: HIGH  
**Description**: Implement side-by-side model comparison view
**Acceptance Criteria**:
- Accessible from My Models page (multi-select + Compare button)
- Display 2-3 models in comparison table
- Show reactions present/absent in each model
- Flux values displayed when FBA data available
- Basic heatmap visualization (can use placeholder)
- Pathway comparison tab

### R3: Media Editor
**Priority**: HIGH
**Description**: Enable compound-level editing of media formulations
**Acceptance Criteria**:
- Accessible from My Media page or media detail route
- DataGrid showing media compounds
- Add Compounds button → SOLR picker dialog
- Remove Selected button with confirmation
- Inline editable: concentration, minFlux, maxFlux
- Save button (with API unavailable fallback)

### R4: Model Editor Enhancement
**Priority**: HIGH
**Description**: Enable reaction-level editing in model detail
**Acceptance Criteria**:
- Enhance existing Edit Model tab
- Add Reactions button → SOLR picker dialog
- Remove Selected Reactions with confirmation
- Inline editable: reaction direction (<=>, =>, <=)
- Inline editable: gene associations
- Edit history displayed
- Save button (with API unavailable fallback)

### R5: Missing Dialogs
**Priority**: MEDIUM
**Acceptance Criteria**:
- SaveAsDialog: Name input, save model copy
- SelectMediaDialog: Autocomplete media picker for FBA/Gapfill
- AddCompoundsDialog: SOLR compound search with multi-select
- AddReactionsDialog: SOLR reaction search with multi-select
- ShowMetadataDialog: Display object metadata and permissions

### R6: Bulk Download
**Priority**: LOW
**Description**: Export search results from biochem tables
**Acceptance Criteria**:
- Export to CSV button on compounds table
- Export to CSV button on reactions table
- Respect current search/filter state

### R7: Error Handling & API Fallbacks
**Priority**: MEDIUM
**Description**: Graceful degradation when APIs unavailable
**Acceptance Criteria**:
- All new components show clear "API unavailable" messages
- No console errors from failed API calls
- Loading states for all async operations
- User can see what features are temporarily unavailable

## Technical Notes

### Known API Limitations
- Workspace API write operations (`create`, `delete`, `copy`, `metadata`, `permissions`, `download-url`) require backend fix
- `editModelFromApi` may return 501 on some deployments
- RAST genome listing has multiple fallback strategies

### UI Patterns to Follow
- Use MUI DataGrid for all tables (consistent with existing pages)
- Use MUI Dialog for modals
- Use DataControlHeader for table toolbars
- Use existing SOLR integration from biochem pages

### Dependencies
- `@tanstack/react-query` for data fetching
- `@mui/x-data-grid` for tables
- Existing `lib/api/` clients

## Out of Scope
- Expression data upload (requires Shock integration)
- WebSocket real-time features (disabled in legacy)
- Guided tour/onboarding
- Backend API fixes (separate team responsibility)

## Success Metrics
- All legacy pages have Next.js equivalents
- Zero broken routes or 404s
- UI loads and displays correctly with mock/empty data when API unavailable
- No console errors in normal operation
