# Phase 31: UI Transition Completion - Execution Plan

## Overview
Complete all UI-side logic to achieve feature parity with legacy AngularJS UI, enabling user testing readiness.

## Execution Waves

### Wave 1: Foundation Components (Parallel)
These have no dependencies and can be built simultaneously.

#### 1.1 AddCompoundsDialog
**File**: `components/ui/AddCompoundsDialog.tsx`
**Dependencies**: Existing SOLR biochem API
**Tasks**:
- Create dialog with compound search input
- Integrate with `getCompounds()` from biochem API
- DataGrid for results with checkbox selection
- "Add Selected" button returns selected compounds

#### 1.2 AddReactionsDialog
**File**: `components/ui/AddReactionsDialog.tsx`
**Dependencies**: Existing SOLR biochem API
**Tasks**:
- Create dialog with reaction search input
- Integrate with `getReactions()` from biochem API
- DataGrid for results with checkbox selection
- "Add Selected" button returns selected reactions

#### 1.3 SelectMediaDialog
**File**: `components/ui/SelectMediaDialog.tsx`
**Dependencies**: Existing media API
**Tasks**:
- Create dialog with media autocomplete
- Fetch public + user media via existing APIs
- Return selected media object

#### 1.4 SaveAsDialog
**File**: `components/ui/SaveAsDialog.tsx`
**Tasks**:
- Create dialog with name input
- Validate name (alphanumeric)
- Save callback with API unavailable fallback

#### 1.5 ShowMetadataDialog
**File**: `components/ui/ShowMetadataDialog.tsx`
**Tasks**:
- Display metadata in key-value table
- Show permissions if available
- Close button

#### 1.6 Bulk Download Utility
**File**: `lib/utils/exportCsv.ts`
**Tasks**:
- Create CSV export utility function
- Handle array of objects to CSV conversion
- Trigger browser download

### Wave 2: Pages & Features (After Wave 1)

#### 2.1 Data Browser Page
**File**: `app/data/[...path]/page.tsx` (replace existing)
**Dependencies**: `workspaceLs` API, ShowMetadataDialog
**Tasks**:
- Fetch directory listing via `workspaceLs`
- Display files/folders in DataGrid
- Breadcrumb navigation from path
- Click folder → navigate
- Click file → show metadata or download
- Handle API errors gracefully

#### 2.2 Model Comparison Page
**File**: `app/compare/page.tsx` (new)
**Dependencies**: Model APIs
**Tasks**:
- Create new route
- Accept model refs via URL params or state
- Fetch model data for each
- Side-by-side reaction comparison table
- Basic pathway tab
- Update My Models page to add "Compare" button

#### 2.3 Biochem Table CSV Export
**Files**: 
- `app/(reference-data)/biochem/compounds/page.tsx`
- `app/(reference-data)/biochem/reactions/page.tsx`
**Tasks**:
- Add "Export CSV" button to DataControlHeader
- Use exportCsv utility
- Export current filtered/searched results

### Wave 3: Editors (After Wave 1 dialogs)

#### 3.1 Media Editor Component
**File**: `components/ui/MediaEditor.tsx`
**Dependencies**: AddCompoundsDialog
**Tasks**:
- Create embedded editor component
- DataGrid of media compounds
- Add compounds via AddCompoundsDialog
- Remove selected with confirmation
- Inline edit concentration/flux bounds
- Save button (with fallback)

#### 3.2 Media Detail Route
**File**: `app/media/[...path]/page.tsx` (new)
**Tasks**:
- Display media metadata
- Embed MediaEditor component
- Handle save/cancel actions

#### 3.3 Model Editor Enhancement
**File**: `app/model/[...path]/page.tsx` (enhance Edit tab)
**Dependencies**: AddReactionsDialog
**Tasks**:
- Enhance existing Edit Model tab
- Add Reactions button → opens AddReactionsDialog
- Remove Selected button
- Inline edit direction dropdown
- Inline edit genes
- Save button (with 501 fallback)

### Wave 4: Integration & Polish

#### 4.1 My Models Compare Integration
**File**: `app/(user-data)/my-models/page.tsx`
**Tasks**:
- Add checkbox column for multi-select
- Add "Compare Selected" button
- Navigate to /compare with selected models

#### 4.2 API Fallback Messages
**All new components**
**Tasks**:
- Consistent error messaging
- Loading spinners
- "Feature temporarily unavailable" banners where needed

## File Manifest

### New Files
1. `components/ui/AddCompoundsDialog.tsx`
2. `components/ui/AddReactionsDialog.tsx`
3. `components/ui/SelectMediaDialog.tsx`
4. `components/ui/SaveAsDialog.tsx`
5. `components/ui/ShowMetadataDialog.tsx`
6. `components/ui/MediaEditor.tsx`
7. `lib/utils/exportCsv.ts`
8. `app/compare/page.tsx`
9. `app/media/[...path]/page.tsx`

### Modified Files
1. `app/data/[...path]/page.tsx` - Replace placeholder
2. `app/model/[...path]/page.tsx` - Enhance Edit tab
3. `app/(user-data)/my-models/page.tsx` - Add compare integration
4. `app/(reference-data)/biochem/compounds/page.tsx` - Add CSV export
5. `app/(reference-data)/biochem/reactions/page.tsx` - Add CSV export

## Verification Checklist
- [ ] All new routes accessible without 404
- [ ] Data browser shows workspace contents
- [ ] Model comparison displays selected models
- [ ] Media editor allows compound manipulation
- [ ] Model edit tab has reaction add/remove
- [ ] CSV export downloads file
- [ ] API errors show user-friendly messages
- [ ] No console errors in normal operation
- [ ] Build passes without TypeScript errors
