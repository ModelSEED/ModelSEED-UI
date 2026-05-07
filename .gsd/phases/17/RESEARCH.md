---
phase: 17
level: 2
researched_at: 2026-03-11T20:20:00-06:00
---

# Phase 17 Research: Workspace, Auth, and modelseed-api

## Current Workspace Usage and Failures

- Frontend client: `lib/api/workspace.ts`
  - Uses `WORKSPACE_URL` from `lib/api/config.ts`, which currently resolves to the legacy JSON-RPC endpoint:
    - `https://p3.theseed.org/services/Workspace`
  - All calls use JSON-RPC 1.1 with `version: '1.1'`, `method: 'Workspace.ls'` / `Workspace.get`, and `params` as arrays.
  - Auth is attached via a raw token from localStorage:
    - Header: `Authorization: <token>` (no `Bearer ` prefix), where `<token>` comes from the stored `AuthResult` in `AUTH_STORAGE_KEY`.

- My Models and My Media pages:
  - `app/(user-data)/my-models/page.tsx` previously called:
    - `workspaceLs(['/user/home/models/'])` and then shaped the result into rows.
  - `app/(user-data)/myMedia/page.tsx` previously called:
    - `workspaceLs(['/user/home/media/'])`.
  - Both produced 500 responses from Workspace with message:
    - `_ERROR_User lacks permission to / for requested action!_ERROR_`
  - This indicates the JSON-RPC `ls` call is being evaluated against a root or otherwise unauthorized path for the current user/token.

- Legacy Angular implementation (reference only, not copied):
  - `external/ModelSEED-UI/app/services/ms.js`:
    - Lists **models** via the `ms` service, not direct Workspace:
      - `$http.rpc('ms', 'list_models', params)` and then `sanitizeModel(...)`.
    - Lists **user media** using Workspace, but with a user-specific folder:
      - `var path = '/' + Auth.user + '/media';`
      - `WS.listL(path)` to read that folder.
  - The updated React-Next UI had used generic `/user/home/models/` and `/user/home/media/` paths, which do not correspond to the per-user paths the Workspace service expects for these accounts.

## Auth Token Flow

- Auth is handled in `lib/api/auth.ts` and `components/auth/AuthProvider.tsx`:
  - `loginPatric`:
    - Calls `https://user.patricbrc.org/authenticate` with `application/x-www-form-urlencoded`.
    - On success, returns an `AuthResult`:
      - `user_id` extracted from `un=<user>` in the returned token.
      - `token` is the raw pipe-delimited string (`un=...|tokenid=...|expiry=...`).
      - `method: 'PATRIC'`.
  - `loginRast`:
    - Calls `https://p3.theseed.org/Sessions/Login`.
    - On success, returns an `AuthResult` `{ user_id, token, method: 'RAST' }`.
  - `persistAuth`:
    - Stores the entire `AuthResult` under `localStorage['auth']`.
  - `AuthProvider`:
    - Hydrates `authData` from `getStoredAuth()` on mount.
    - Exposes `isAuthenticated`, `user`, `token`, and `method` via `useAuth()`.

- Workspace and modelseed-api both use the same stored token:
  - Workspace client attaches `Authorization: <token>` from `localStorage['auth']`.
  - The new modelseed-api client in `lib/api/modelseed.ts` attaches the same token:
    - `Authorization: <token>` to `/api/models` and `/api/media/public`.
  - This matches the modelseed-api README, which expects the raw PATRIC token in the `Authorization` header for all /api endpoints.

## Backend Options for User Data

### Option A — Direct Workspace JSON-RPC from the Frontend (Current / Legacy)

- Pros:
  - Matches the original Angular UI pattern for some operations.
  - No additional backend component required beyond P3 Workspace.
- Cons:
  - My Models in legacy UI actually uses the `ms` service (`list_models`) rather than Workspace, so replicating behavior correctly from the browser is complex.
  - Permissions and path semantics are brittle: `/user/home/models/` and `/user/home/media/` do not work for the PATRIC test accounts, yielding 500 errors with permission failures.
  - Tight coupling between UI and internal Workspace JSON-RPC contract makes future migrations harder.

### Option B — Route through modelseed-api (Recommended)

Per [`ModelSEED/modelseed-api`](https://github.com/ModelSEED/modelseed-api):

- Provides REST endpoints:
  - `/api/models` — list user models.
  - `/api/media/public` — list public media formulations.
  - `/api/workspace/{op}` — proxy to PATRIC Workspace for ls/get/create/delete, etc.
- Pros:
  - Hides P3 Workspace JSON-RPC details behind a stable REST interface.
  - Consolidates modeling, media, and workspace operations behind one service.
  - Designed to accept the PATRIC token in the `Authorization` header (exactly what the current auth stack provides).
- Cons:
  - Requires running modelseed-api (Docker or manual) alongside the UI.
  - Some user-specific media/list endpoints may still be evolving; we currently rely on `/api/media/public` for read-only media listings.

### Decision

- For Phase 17, the **preferred architecture is Option B**:
  - Use `modelseed-api` for:
    - `/api/models` → backing **My Models**.
    - `/api/media/public` → backing **My Media** (initially as read-only listing; can be extended later if a user-specific endpoint is added).
  - Keep the Workspace client for code paths that still need raw JSON-RPC, but remove it from the critical authenticated user-data flows wherever possible.
  - Introduce feature flags and a base URL in `lib/api/config.ts`:
    - `USE_MODELSEED_API` (from `NEXT_PUBLIC_USE_MODELSEED_API`).
    - `MODELSEED_API_URL` (defaulting to `http://localhost:8000`).

## File-Level Call Map (Target)

- `app/(user-data)/my-models/page.tsx`
  - When `USE_MODELSEED_API === true`:
    - Calls `listUserModelsFromApi()` → `GET ${MODELSEED_API_URL}/api/models`.
  - When `USE_MODELSEED_API === false`:
    - Falls back to `workspaceLs(['/user/home/models/'])` (legacy behavior, known to be permission-fragile for some accounts).

- `app/(user-data)/myMedia/page.tsx`
  - When `USE_MODELSEED_API === true`:
    - Calls `listUserMediaFromApi()` → `GET ${MODELSEED_API_URL}/api/media/public`.
  - When `USE_MODELSEED_API === false`:
    - Falls back to `workspaceLs(['/user/home/media/'])`.

- `app/(build-model)/plant/page.tsx`
  - Auth still via `AuthGuard` and `useAuth`.
  - Phase 17 execution adjusts only tab selection logic; actual RAST Microbes integration will route through modelseed-api in a later step, using the same token.

## Timestamp Log
- Created: 2026-03-11 20:20:00 -06:00

