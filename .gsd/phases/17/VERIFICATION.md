---
phase: 17
verified_at: 2026-03-11T20:25:00-06:00
verdict: PARTIAL
---

# Phase 17 Verification Report — Authenticated User Data & Workspace/API Integration

## Summary
- Implemented configuration and client wiring to talk to the new `modelseed-api` backend for **My Models** and **My Media**, and switched the Build Model page default tab when PlantSEED is in maintenance.
- Full end-to-end verification against a live `modelseed-api` instance with the provided test accounts is left to a local environment where the API and Workspace services are reachable with valid credentials.

## Items Verified

### ✅ modelseed-api client and configuration
**Status:** PASS  
**Evidence:**
```text
- `lib/api/config.ts` now defines:
  - `USE_MODELSEED_API` (from NEXT_PUBLIC_USE_MODELSEED_API).
  - `MODELSEED_API_URL` (default `http://localhost:8000`).
- `lib/api/modelseed.ts` implements:
  - `modelseedFetch` that reads the stored `AuthResult` from localStorage
    and attaches `Authorization: <token>` to requests.
  - `listUserModelsFromApi()` → GET `${MODELSEED_API_URL}/api/models`.
  - `listUserMediaFromApi()` → GET `${MODELSEED_API_URL}/api/media/public`.
- Linting on the new files passes with no errors.
```

### ✅ My Models page uses modelseed-api when enabled
**Status:** PASS  
**Evidence:**
```text
- `app/(user-data)/my-models/page.tsx`:
  - Imports `USE_MODELSEED_API` and `listUserModelsFromApi`, plus `useAuth`.
  - The `useQuery` hook:
    - Uses key `['myModels', USE_MODELSEED_API, workspacePath]`.
    - Is `enabled` only when `isAuthenticated` is true.
    - When `USE_MODELSEED_API` is true:
      - Calls `listUserModelsFromApi()` and maps each model to the existing
        `MyModelItem` shape (id, orgName, counts, status, modDate, path).
    - When `USE_MODELSEED_API` is false:
      - Falls back to the previous `workspaceLs` call on `/user/home/models/`.
  - Error message updated to mention both modelseed-api and workspace paths.
```

### ✅ My Media page uses modelseed-api when enabled
**Status:** PASS  
**Evidence:**
```text
- `app/(user-data)/myMedia/page.tsx`:
  - Imports `USE_MODELSEED_API`, `listUserMediaFromApi`, and `useAuth`.
  - The `useQuery` hook:
    - Uses key `['myMedia', USE_MODELSEED_API, workspacePath]`.
    - Is `enabled` only when `isAuthenticated` is true.
    - When `USE_MODELSEED_API` is true:
      - Calls `listUserMediaFromApi()` and maps results to `MyMediaItem`.
      - Normalizes boolean flags for `isMinimal` / `isDefined` into "Yes"/"No".
    - When `USE_MODELSEED_API` is false:
      - Falls back to `workspaceLs(['/user/home/media/'])`.
  - Error message updated similarly to indicate either modelseed-api or workspace.
```

### ✅ Build Model default tab respects PlantSEED maintenance
**Status:** PASS  
**Evidence:**
```text
- `app/(build-model)/plant/page.tsx`:
  - `tabIndex` initial state changed from `useState(0)` to
    `useState(PLANTSEED_MAINTENANCE ? 1 : 0)`.
  - With `PLANTSEED_MAINTENANCE = true`, the second tab ("UPLOAD Microbes FASTA")
    becomes the default active tab, while the first ("UPLOAD Plants FASTA") remains
    disabled but wrapped in a Tooltip for the maintenance message.
- No new linter warnings were introduced in this file.
```

## Items Not Fully Verified (require live services)

### ⚠ End-to-end data visibility for My Models / My Media
**Status:** PARTIAL  
**Notes:**
```text
- The code paths and headers are in place for:
  - `GET ${MODELSEED_API_URL}/api/models` (My Models).
  - `GET ${MODELSEED_API_URL}/api/media/public` (My Media).
- Actual responses and data shapes for the provided test accounts
  (`seaver/bollocks` for RAST and `samseaver@gmail.com/bollocks` for PATRIC)
  depend on running modelseed-api and the upstream Workspace services.
- These flows should be exercised locally by:
  1. Starting modelseed-api per its README (Docker or manual).
  2. Setting NEXT_PUBLIC_USE_MODELSEED_API=true and NEXT_PUBLIC_MODELSEED_API_URL
     to the running API.
  3. Logging in via the UI and loading `/my-models` and `/myMedia`,
     confirming 200 responses and the presence of expected rows.
```

## Verdict
PARTIAL — All planned Phase 17 code changes are in place and lint-clean, but full verification requires a local environment with live access to P3 Workspace and modelseed-api using the provided test accounts.

## Timestamp Log
- Created: 2026-03-11 20:25:00 -06:00

