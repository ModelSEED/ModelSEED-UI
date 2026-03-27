# Known Issues & Developer Action Items

> **AI Agent & Developer Reference**
> This document catalogs known UI bugs, API limitations, and developer action items.

---

## Current Issues (March 2026)

### 🔴 CRITICAL: Model Submission Only Works on PATRIC Accounts

**Severity:** High  
**Affected:** `/plant` page, model reconstruction jobs  
**Description:** Users with RAST accounts cannot submit model reconstruction jobs. Only PATRIC accounts can create new models via the Build Model workflow. This is a backend/API limitation - RAST accounts lack the necessary workspace permissions for model creation.

**Impact:** RAST users can only view existing models, not create new ones.

**Action Item:** This is a backend authorization issue. RAST accounts need workspace write permissions to submit reconstruct jobs.

---

### 🟡 ACTIVE: Model Editing Not Fully Implemented

**Severity:** Medium  
**Affected:** Model detail page, Edit tab  
**Description:** Users can view model details and make local changes in the UI, but cannot save edits back to the workspace. The `POST /api/models/edit` endpoint may return 501 (not implemented).

**Impact:** Edit functionality is read-only. Users see "API unavailable" message when attempting to save changes.

**Location:** `lib/api/modelseed.ts:editModelFromApi`

**Action Item:** Backend needs to implement the model edit API endpoint.

---

### 🟡 ACTIVE: My Models/Media Not Consistent Across RAST and PATRIC

**Severity:** High  
**Affected:** `/my-models`, `/myMedia` pages  
**Description:** Models and media lists are NOT the same when logging in with RAST vs PATRIC credentials for the same user. This is because:
- PATRIC and RAST maintain separate user workspaces
- Each authentication system has its own independent data storage
- Users may have created models/media in one system but not the other

**Impact:** 
- Users who use both RAST and PATRIC accounts see different data in each
- Switching from RAST to PATRIC (or vice versa) shows different models/media
- No unified view of user's complete data across authentication systems

**Action Item:** Document this limitation clearly in UI or consider implementing data migration/sync between systems.

---

### 🟡 ACTIVE: RAST MS FBA Not Working

**Severity:** High  
**Affected:** `/fba/*` pages, FBA analysis  
**Description:** Flux Balance Analysis (FBA) jobs submitted through RAST accounts fail to complete or return errors. This affects:
- Running FBA on models owned by RAST users
- Viewing FBA results for RAST-owned models

**Impact:** RAST users cannot perform metabolic modeling analysis through the UI.

**Action Item:** Backend investigation required - RAST MS FBA service may be unavailable or require different authentication.

---

### 🟡 ACTIVE: My Models Data Depends on Account Type

**Severity:** Medium  
**Affected:** `/my-models` page  
**Description:** The models visible to a user depend on their authentication method:
- **PATRIC accounts** - Can view and create models in their workspace
- **RAST accounts** - Limited visibility; some operations may fail

This is expected behavior based on how each system stores user data, but the UX could be clearer about account differences.

**Impact:** Users switching between RAST and PATRIC accounts see different model lists.

**Action Item:** Add UI messaging to explain account-type differences when applicable.

---

### 🟢 COMPLETED: My Media Consistent Across Account Types

**Severity:** Low  
**Status:** ✅ Resolved  
**Description:** Media data is stored in a shared location and remains accessible regardless of whether user is logged in via RAST or PATRIC. Users see the same media library when switching accounts.

**Location:** `app/(user-data)/myMedia/page.tsx`

---

### 🟡 ACTIVE: Workspace Write Operations Limited

**Severity:** High  
**Affected Operations:**
- `workspaceCreate` - Cannot create new workspace objects
- `workspaceDelete` - Cannot delete workspace objects  
- `workspaceCopy` - Cannot copy workspace objects
- `workspaceMetadata` - Cannot get object metadata
- `workspacePermissions` - Cannot manage permissions
- `workspaceDownloadUrl` - Cannot generate download URLs

**Impact:** Users cannot save edited models/media to workspace. Delete operations fail silently. Media editor shows "API unavailable" warning.

**Location:** `lib/api/workspace.ts`

**Backend Required:** Yes - Fix POST `/api/workspace/create`, `/delete`, `/copy`, `/metadata`, `/permissions`, `/download-url` endpoints in modelseed-api

---

### 🟢 COMPLETED: Job Status Sync with Model Table

**Severity:** Low  
**Status:** ✅ Resolved  
**Description:** Previously, after a reconstruct job completed, the My Models table would not immediately show the new model. Now includes retry logic that polls for model appearance after job completion.

**Location:** `app/(user-data)/my-models/page.tsx`

---

## Quick Reference

| Issue | Severity | Status | Account Affected |
|-------|----------|--------|-------------------|
| Model submission (PATRIC only) | High | 🔴 Active | RAST |
| Model/Media list inconsistency (RAST vs PATRIC) | High | 🟡 Active | Both |
| RAST MS FBA not working | High | 🔴 Active | RAST |
| Model editing | Medium | 🟡 Active | All |
| My Models account differences | Medium | 🟡 Active | RAST |
| Workspace writes | High | 🟡 Active | All |
| Media consistency | Low | ✅ Complete | - |
| Job status sync | Low | ✅ Complete | - |

---

## Legacy Issues (Resolved/Not Applicable)

The following issues from the previous tracking document are now marked complete:

- ~~W001: Workspace Write Operations~~ → Superseded by ACTIVE issue above
- ~~W002: Model Edit API May Return 501~~ → Superseded by ACTIVE issue above  
- ~~WS001: Workspace /get Returns 500~~ → Resolved
- ~~UI001: Chemical Equation Formatting~~ → Low priority, deferred
- ~~MF001: Model Merge Workflow~~ → Not yet implemented
- ~~MF005: Build Model Plant Workflow~~ → Works on PATRIC accounts only

---

*Last Updated: 2026-03-26*
*Maintained by: Development Team*
*Document Version: 2.0*