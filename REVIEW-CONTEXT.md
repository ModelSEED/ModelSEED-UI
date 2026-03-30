# ModelSEED-UI Review Context

**Purpose:** Complete context document for reviewing all work done on ModelSEED-UI  
**Generated:** 2026-03-30  
**Reviewer:** Another AI model  

---

## Project Overview

ModelSEED-UI is a Next.js web application for metabolic modeling. It integrates with:
- **ModelSEED API** (FastAPI backend on poplar.cels.anl.gov:8000)
- **PATRIC/BV-BRC** - Genome database for building models
- **RAST** - Annotation service
- **Workspace** - Data storage system

### Tech Stack
- **Frontend:** Next.js 14, React, Material UI, TanStack Query
- **Backend:** FastAPI (Python)
- **Authentication:** PATRIC/RAST tokens
- **Testing:** Playwright E2E, API tests

---

## Test Environment

### Credentials (from .env.local)
```
PATRIC_USERNAME=seaver@patricbrc.org
PATRIC_TOKEN=un=seaver@patricbrc.org|tokenid=2cffd911-3a0b-40b0-be5e-b17c31358a40|...
RAST_USERNAME=seaver
RAST_TOKEN=un=seaver|tokenid=B6457814-2A00-11F1-AFD8-26A66FFFCB79|...
```

### Access
- **UI:** http://localhost:3000 (run `npm run dev`)
- **API:** http://localhost:8000 (requires SSH tunnel)
- **SSH Tunnel:** `ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov`

### API Health Check
```bash
curl http://localhost:8000/api/health
# Returns: {"status":"ok","version":"0.1.0"}
```

---

## Original Problem Space

José's E2E test report (2026-03-27) identified 17 issues across:
- **P0 (Blocking):** 1 issue
- **P1 (Major):** 7 issues  
- **P2 (Minor):** 9 issues

Categories: UI bugs, API bugs, Integration issues, External dependencies

---

## Work Completed

### 1. Authentication Fixes (Prior Session)

**Problem:** Double-encoding of `@` in workspace paths
- `@` was encoded to `%40`, then again to `%2540`
- Caused API failures for PATRIC/RAST paths

**Files Modified:**
- `lib/api/modelseed.ts` - Added `safeDecodePath()` function
- `lib/api/requestAuth.ts` - Fixed `getStoredAuthUsername()`

**Code Example:**
```typescript
// lib/api/modelseed.ts:535-548
function safeDecodePath(path: string): string {
    try {
        let decoded = path;
        let prev = '';
        while (decoded !== prev) {
            prev = decoded;
            decoded = decodeURIComponent(decoded);
        }
        return decoded;
    } catch {
        return path;
    }
}
```

---

### 2. UI Components Added (Prior Session)

**Gapfill Tab:**
- Added to model detail page (`app/model/[...path]/page.tsx`)
- Calls `/api/models/gapfills` endpoint

**Failed Job Count:**
- Added to My Jobs page (`app/(user-data)/my-models/page.tsx`)
- Shows separate card for failed jobs

---

### 3. Bulk Actions (This Session)

**Files Modified:** `app/(user-data)/my-models/page.tsx`

**Added:**
- Bulk Export (JSON download)
- Bulk Delete (with confirmation dialog)
- Compare button (2-3 models)
- Merge button (2+ models)

**Code Snippet:**
```typescript
// State
const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
const [isBulkDeleting, setIsBulkDeleting] = useState(false);

// Bulk Delete Handler
const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
        for (const modelId of selectedModelIds) {
            const model = rows.find((r) => r.id === modelId);
            if (model) {
                await deleteModelFromApi(model.path);
            }
        }
        setSelectedModelIds([]);
        setBulkDeleteDialogOpen(false);
        void refetch();
    } catch (err) {
        console.error('Bulk delete failed:', err);
    } finally {
        setIsBulkDeleting(false);
    }
}, [selectedModelIds, rows, refetch]);

// Bulk Export Handler
const handleBulkExport = useCallback(async () => {
    for (const modelId of selectedModelIds) {
        const model = rows.find((r) => r.id === modelId);
        if (model) {
            const blob = await exportModelFromApi(model.path, 'json');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${model.id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
}, [selectedModelIds, rows]);
```

---

### 4. API Test Fixes (This Session)

**Problem:** Test script using wrong endpoints and incorrect response parsing

**Fixed Tests:**

1. **Jobs endpoint** - Returns object with job IDs as keys, not array
   ```javascript
   // Before: assert(Array.isArray(result), 'Did not return array');
   // After:
   const jobs = result && typeof result === 'object' ? Object.values(result) : [];
   assert(Array.isArray(jobs), 'Did not return jobs object');
   ```

2. **User media** - Wrong endpoint
   ```javascript
   // Before: /api/media
   // After: /api/media/mine (GET)
   ```

3. **Biochemistry/Solr** - Wrong endpoint paths
   ```javascript
   // Before: ${SOLR_BASE}reaction/query?...
   // After: ${SOLR_BASE}reactions_staging/select?...
   ```

4. **Workspace endpoints** - Wrong JSON-RPC format
   ```javascript
   // Before: workspaceRpc('Workspace.ls', [[path]])
   // After: workspaceRpc('Workspace.ls', [{ paths: [path] }])
   ```

5. **Export SBML** - Returns XML, not JSON
   ```javascript
   // Before: assert(result, 'Export returned null');
   // After:
   const contentType = res.headers.get('content-type') || '';
   assert(contentType.includes('xml') || contentType.includes('sbml'), 'Not SBML format');
   ```

6. **Health check** - Wrong endpoint
   ```javascript
   // Before: /api/models/public (HEAD)
   // After: /api/health (GET)
   ```

**File Modified:** `scripts/api-test.mjs`

---

## Issue-by-Issue Status

### ✅ Fixed (7 issues)

| #  | Issue | Category | Fix |
|----|-------|----------|-----|
| 5  | Direct URL with @ | UI | Already handled by `decodeURIComponent` + `safeDecodePath` |
| 10 | No Gapfill tab | UI | Added tab to model detail |
| 13 | No Failed count | UI | Added Failed card to My Jobs |
| 18 | FBA Media "N/A" | UI | Fixed in prior session |
| 19 | FBA header style | UI | Fixed in prior session |
| 21 | No action buttons | UI | Added Compare/Merge/Export/Delete |

### ❌ Remaining (10 issues)

| #  | Issue | Category | Action |
|----|-------|----------|--------|
| 1  | Duplicate model row | API | Backend fix in model_service.py |
| 3  | Equation "N/A" | API | Backend fix in model_service.py |
| 2  | Species name | API/UI | Backend or coordinate |
| 4  | Overview fields | API | Backend fix |
| 6  | GPR missing | API | Backend fix |
| 7  | Compartment empty | API | Investigate |
| 8  | Gene functions | API | Backend fix |
| 9  | Biomass names | API | Backend fix |
| 11 | Scientific Name | UI | Investigate |
| 17 | PATRIC search | UI | Needs live test |

---

## Verification Steps

### 1. Run API Tests
```bash
cd /home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI
npm run test:api
```

**Expected Output:** All tests pass

### 2. Test UI Manually

**Login and test:**
1. Go to http://localhost:3000
2. Sign in with PATRIC credentials
3. Navigate to /my-models
4. Select multiple models
5. Verify Compare, Merge, Export, Delete buttons appear
6. Test each button

### 3. Test Job Page
1. Go to /my-jobs
2. Verify "Failed" card shows count

### 4. Test Model Detail
1. Click on any model
2. Verify FBA tab exists and shows results
3. Verify Gapfill tab exists

### 5. Test PATRIC Genome Search
1. Go to /plant
2. Click "PATRIC Microbes" tab
3. Enter search term
4. Verify results appear

---

## Key Files Reference

### Core Application
- `app/model/[...path]/page.tsx` - Model detail with tabs
- `app/(user-data)/my-models/page.tsx` - Model list with bulk actions
- `app/(user-data)/my-jobs/page.tsx` - Job list with status cards
- `app/(build-model)/plant/page.tsx` - Build model page

### API Layer
- `lib/api/modelseed.ts` - ModelSEED API client
- `lib/api/workspace.ts` - Workspace API client
- `lib/api/patric.ts` - PATRIC genome search
- `lib/api/requestAuth.ts` - Authentication

### Testing
- `scripts/api-test.mjs` - API test suite
- `tests/e2e/suite.spec.ts` - Playwright E2E tests
- `legacy/e2e-test-report-2026-03-27.html` - Original bug report

---

## Backend Issues Requiring José

### Issue #1: Duplicate Model Row
**Location:** `model_service.py:70-76`
**Problem:** `is_model` filter has unconditional `obj_type == "folder"` match, no dedup
**Fix:** Add deduplication logic for `modelfolder`/`folder` types

### Issue #3: Equation Column N/A
**Location:** `model_service.py:248-257`
**Problem:** Returns raw `stoichiometry` array but never synthesizes equation string
**Fix:** Synthesize human-readable equation from reagents

### Issue #2: Species Name
**Location:** `tasks.py:143,224`
**Problem:** API sets `organism_name` but UI reads `name`
**Fix:** Either API sets `name` field, or UI reads `organism_name`

### Issue #4: Overview Fields
**Location:** `model_service.py:179-184`
**Problem:** Only copies `num_*` fields, omits `source`, `genome_ref`, `type`
**Fix:** Include these fields in get_model response

### Issue #6: GPR Missing
**Location:** `model_service.py:254`
**Problem:** Reads `rxn.get("gpr")` but raw data uses `modelReactionProteins` array
**Fix:** Synthesize GPR string from nested proteins/features

### Issue #8: Gene Functions
**Location:** `model_service.py:280-281`
**Problem:** Only returns `id` and `reactions`, no `functions`
**Fix:** Add genome feature lookup or annotation data

### Issue #9: Biomass Names
**Location:** `model_service.py:296-310`
**Problem:** Returns raw `modelcompound_ref` instead of resolved names
**Fix:** Cross-reference to resolve compound IDs to names

---

## Documentation

- `E2E-REPORT-FIX-STATUS.md` - Current fix status
- `README.md` - Project documentation
- `tests/README.md` - Testing documentation
- `AGENTS.md` - Agent commands and workflows

---

## Notes for Reviewer

1. **Test script fixes** were necessary because the backend API evolved but tests weren't updated
2. **Bulk actions** required both UI changes and importing API functions
3. **Authentication fixes** from prior session are critical - without them, PATRIC/RAST paths fail
4. **Some issues are truly backend** - cannot be fixed in UI code alone
5. **Issue #17** (PATRIC search) needs live browser testing to verify - code looks correct but couldn't test without full UI

---

## Quick Test Commands

```bash
# Start dev server
npm run dev

# Run API tests
npm run test:api

# Test specific endpoint
curl -H "Authorization: Bearer $PATRIC_TOKEN" \
  http://localhost:8000/api/models

# Health check
curl http://localhost:8000/api/health
```
