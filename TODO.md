# ModelSEED-UI Visual Testing Plan for Antigravity

> **Purpose:** This document provides a comprehensive visual testing plan for the Antigravity AI agent to validate the ModelSEED-UI application through browser interaction.
>
> **Last Updated:** 2026-03-30

---

## Prerequisites

### 1. SSH Tunnel Setup
Before testing, ensure the SSH tunnel to the backend API is active:

```bash
ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
```

This forwards `localhost:8000` to the ModelSEED API on Poplar.

### 2. Start Development Server
```bash
cd /home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI
npm run dev
```

The app will be available at `http://localhost:3000`

### 3. Environment Configuration (`.env.local`)
The application uses these environment variables:

```env
NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MODELSEED_API=true
NEXT_PUBLIC_USE_NEW_PROXY=true

# Test credentials (choose one system)
PATRIC_USERNAME=samseaver@gmail.com
PATRIC_PASSWORD=bollocks

RAST_USERNAME=seaver
RAST_PASSWORD=bollocks
```

**⚠️ IMPORTANT:** PATRIC and RAST are **separate systems** with different workspaces. You will see different data depending on which account you use.

---

## Test Credentials

| System | Username | Password | Best For |
|--------|----------|----------|----------|
| **PATRIC** | `samseaver@gmail.com` | `bollocks` | Full testing (can create models) |
| **RAST** | `seaver` | `bollocks` | Read-only testing (limited functionality) |

**Recommendation:** Use **PATRIC** credentials for most tests. RAST has known limitations.

---

## Testing Phases

### Phase 1: Public Pages (No Login Required)

These pages should work without authentication:

#### 1.1 Homepage (`/`)
- [ ] **Navigate to** `http://localhost:3000`
- [ ] **Verify** ModelSEED header/navigation is visible
- [ ] **Verify** Login form is displayed (username, password, auth provider dropdown)
- [ ] **Verify** Footer with links is present
- [ ] **Click** navigation links to ensure they work

#### 1.2 Biochemistry Data (`/biochem/reactions`, `/biochem/compounds`)
- [ ] **Navigate to** `/biochem/reactions`
- [ ] **Verify** DataGrid table loads with reaction data
- [ ] **Test** search/filter functionality
- [ ] **Click** on a reaction ID to view detail page
- [ ] **Verify** reaction detail shows: Name, Equation, EC numbers, Aliases
- [ ] **Navigate to** `/biochem/compounds`
- [ ] **Verify** compounds table loads
- [ ] **Click** on a compound ID (e.g., `cpd00001`)
- [ ] **Verify** compound detail shows: Name, Formula, Charge, Mass

#### 1.3 Public Genomes (`/genomes`)
- [ ] **Navigate to** `/genomes`
- [ ] **Verify** genome list loads from PATRIC/BV-BRC
- [ ] **Test** search functionality
- [ ] **Click** on a genome to view details

#### 1.4 Public Media (`/list-media`)
- [ ] **Navigate to** `/list-media`
- [ ] **Verify** public media list loads
- [ ] **Click** on a media item to view composition

#### 1.5 About Pages
- [ ] **Navigate to** `/about` - General info page
- [ ] **Navigate to** `/about/version` - Version information
- [ ] **Navigate to** `/about/data-sources` - Data source documentation

#### 1.6 Team Page (`/team`)
- [ ] **Navigate to** `/team`
- [ ] **Verify** team member cards display
- [ ] **Click** on a team member to view profile

---

### Phase 2: Authentication Flow

#### 2.1 PATRIC Login (Primary Test Account)
- [ ] **Navigate to** `http://localhost:3000`
- [ ] **Select** "PATRIC / BV-BRC" from auth provider dropdown
- [ ] **Enter** username: `samseaver@gmail.com`
- [ ] **Enter** password: `bollocks`
- [ ] **Click** Sign In button
- [ ] **Verify** login succeeds - user menu appears in header
- [ ] **Verify** navigation shows "My Models", "My Media", "My Jobs" links

#### 2.2 RAST Login (Secondary Test Account)
- [ ] **First logout** if logged in (click user menu → Sign Out)
- [ ] **Select** "RAST" from auth provider dropdown
- [ ] **Enter** username: `seaver`
- [ ] **Enter** password: `bollocks`
- [ ] **Click** Sign In button
- [ ] **Verify** login succeeds
- [ ] **Note:** You will see DIFFERENT data than with PATRIC account

#### 2.3 Logout Flow
- [ ] **Click** user avatar/menu in header
- [ ] **Click** Sign Out
- [ ] **Verify** redirected to login page
- [ ] **Verify** user-specific navigation (My Models, etc.) is gone

---

### Phase 3: User Data Pages (Requires PATRIC Login)

> **⚠️ Log in with PATRIC credentials before these tests**

#### 3.1 My Models (`/my-models`)
- [ ] **Navigate to** `/my-models`
- [ ] **Verify** table loads with user's models
- [ ] **Check columns:** Name, Type, Organism, Created, Actions
- [ ] **Verify** each row has action buttons (View, Delete, etc.)
- [ ] **Click** on a model name to navigate to model detail page

**Known Issue:** May show duplicate rows for some models (API issue)

#### 3.2 My Media (`/myMedia`)
- [ ] **Navigate to** `/myMedia`
- [ ] **Verify** user's custom media loads
- [ ] **Verify** actions: Create New, Edit, Delete buttons work

#### 3.3 My Jobs (`/my-jobs`)
- [ ] **Navigate to** `/my-jobs`
- [ ] **Verify** job history table loads
- [ ] **Check columns:** Job ID, Type, Status, Submitted, Completed
- [ ] **Verify** job status badges (Running, Completed, Failed)
- [ ] **Click** on a job to view details

---

### Phase 4: Model Detail Page (`/model/[...path]`)

> This is the most complex page - test thoroughly

#### 4.1 Load a Model
- [ ] **From My Models**, click on any model to open detail page
- [ ] **Verify** model header shows: Name, Organism, Type

#### 4.2 Test Each Tab
| Tab | What to Verify |
|-----|----------------|
| **Overview** | Model statistics, organism info |
| **Reactions** | DataGrid with reactions, search works |
| **Compounds** | DataGrid with metabolites |
| **Genes** | Gene list (may show N/A if API doesn't return functions) |
| **Compartments** | Compartment list (cytoplasm, extracellular, etc.) |
| **Biomass** | Biomass reactions, objective function |
| **Pathways** | KEGG pathway mapping |
| **FBA Results** | Previous FBA runs (if any) |
| **Gapfill Results** | Previous gapfill runs (if any) |

#### 4.3 Test FBA Submission
- [ ] **Click** "Run FBA" button in header
- [ ] **Verify** Media Selection dialog opens
- [ ] **Select** a media from dropdown (e.g., "Complete")
- [ ] **Click** Submit/Run
- [ ] **Verify** job starts - toast notification appears
- [ ] **Navigate to** My Jobs to see the running FBA job
- [ ] **Wait** for job to complete (may take 1-5 minutes)
- [ ] **Return** to model page, check FBA Results tab

#### 4.4 Test Gapfill Submission
- [ ] **Click** "Run Gapfill" button in header
- [ ] **Verify** Media Selection dialog opens
- [ ] **Select** a media
- [ ] **Click** Submit/Run
- [ ] **Verify** gapfill job starts

---

### Phase 5: Build Model Workflow (`/plant`)

> **⚠️ Only works with PATRIC account**

#### 5.1 Plant Model Builder
- [ ] **Navigate to** `/plant`
- [ ] **Verify** genome search interface loads
- [ ] **Search** for a genome (e.g., "Arabidopsis")
- [ ] **Select** a genome from results
- [ ] **Click** Build Model button
- [ ] **Verify** reconstruct job is submitted
- [ ] **Navigate to** My Jobs to monitor

**Known Issue:** RAST accounts cannot submit reconstruct jobs

---

### Phase 6: Compare Models (`/compare`)

- [ ] **Navigate to** `/compare`
- [ ] **Verify** model comparison interface loads
- [ ] **Select** two or more models
- [ ] **Click** Compare
- [ ] **Verify** comparison results display

---

### Phase 7: Known Issues to Verify

These are documented bugs - verify they still exist:

| Issue | How to Test | Expected Behavior |
|-------|-------------|-------------------|
| **Duplicate model rows** | View My Models | May see same model twice |
| **Equation column N/A** | View model reactions tab | Equation column may show "N/A" |
| **Gene functions missing** | View model genes tab | Functions may show N/A |
| **RAST FBA fails** | Login with RAST, run FBA | Job may fail or hang |
| **Model edit unavailable** | Try to edit model | Should show "API unavailable" |

---

### Phase 8: Error Handling

Test graceful degradation:

#### 8.1 API Unavailable
- [ ] **Stop** the SSH tunnel
- [ ] **Refresh** any data page
- [ ] **Verify** error messages display gracefully (not crashes)

#### 8.2 Invalid Routes
- [ ] **Navigate to** `/nonexistent-page`
- [ ] **Verify** 404 page displays
- [ ] **Navigate to** `/model/invalid/path`
- [ ] **Verify** appropriate error handling

#### 8.3 Unauthorized Access
- [ ] **Logout**
- [ ] **Navigate to** `/my-models`
- [ ] **Verify** redirected to login or shown auth message

---

## Visual Quality Checklist

For each page, verify:

- [ ] **Layout:** No overlapping elements, proper spacing
- [ ] **Typography:** Text is readable, proper hierarchy
- [ ] **Colors:** Consistent theme, good contrast
- [ ] **Loading States:** Spinners/skeletons show during data fetch
- [ ] **Error States:** Error messages are visible and helpful
- [ ] **Responsive:** Page works at different window sizes
- [ ] **Tables:** DataGrid sorts, filters, paginates correctly
- [ ] **Forms:** Inputs validate, submit buttons work
- [ ] **Dialogs:** Modals open/close properly

---

## Test Execution Summary

| Phase | Tests | Priority |
|-------|-------|----------|
| Phase 1: Public Pages | 15 | High |
| Phase 2: Authentication | 6 | Critical |
| Phase 3: User Data | 9 | High |
| Phase 4: Model Detail | 12 | Critical |
| Phase 5: Build Model | 5 | Medium |
| Phase 6: Compare | 4 | Low |
| Phase 7: Known Issues | 5 | Medium |
| Phase 8: Error Handling | 4 | Medium |

**Total Estimated Tests:** ~60

---

## Quick Start for Antigravity

1. **Ensure SSH tunnel is active:** `ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov`
2. **Ensure dev server running:** `npm run dev`
3. **Open browser to:** `http://localhost:3000`
4. **Login with PATRIC:** `samseaver@gmail.com` / `bollocks`
5. **Work through phases 1-4 first** (highest priority)
6. **Document any bugs** in `issues.md`
7. **Screenshot failures** for evidence

---

## Bug Reporting Template

When you find a bug, document it as:

```markdown
### 🔴 [PAGE]: Brief Description

**URL:** /path/to/page
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected:** What should happen
**Actual:** What actually happens
**Screenshot:** [if available]
**Account:** PATRIC or RAST
```

---

## Files of Interest

| File | Purpose |
|------|---------|
| `issues.md` | Current known issues |
| `README.md` | Project documentation |
| `tests/e2e/` | Existing E2E test specs |
| `.env.local` | Environment configuration |
| `lib/api/modelseed.ts` | API client |
| `lib/api/workspace.ts` | Workspace API client |

---

*End of Testing Plan*
