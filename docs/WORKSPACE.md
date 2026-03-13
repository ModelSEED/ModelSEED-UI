# Workspace & modelseed‑api Interaction (`WORKSPACE.md`)

The heart of ModelSEED’s user data and public reference data is the **PATRIC Workspace Service** plus the newer **ModelSEED REST API (`modelseed-api`)**. This document explains how we interact with these backends.

---

## Workspace Client (`lib/api/workspace.ts`)

`lib/api/workspace.ts` supports both the legacy JSON-RPC Workspace service and the new REST workspace proxy:

```text
Legacy JSON-RPC: https://p3.theseed.org/services/Workspace
REST proxy:      ${MODELSEED_API_URL}/api/workspace/*
```

Phase 20 targets the REST proxy by default via `USE_NEW_PROXY=true`.

### Core Helpers

- `workspaceLs(paths: string[]): Promise<Record<string, any>>`  
  - Wraps `Workspace.ls` in legacy mode.
  - Posts `{ paths }` to `/api/workspace/ls` in proxy mode.
  - Used for listing public reference folders (e.g. plant models, media) when needed.

- `workspaceGet(objects: string[]): Promise<any[]>`  
  - Wraps `Workspace.get` in legacy mode.
  - Posts `{ objects }` to `/api/workspace/get` in proxy mode.
  - Used where we still need raw Workspace objects.

- Proxy-only operations:
  - `workspaceCreate(body)`
  - `workspaceDelete(body)`
  - `workspaceCopy(body)`
  - `workspaceMetadata(body)`
  - `workspacePermissions(body)`
  - `workspaceDownloadUrl(body)`

All of these helpers go through shared request helpers that:

- Attaches `Authorization: <token>` using the stored RAST/PATRIC token.
- Performs standard JSON-RPC / REST error handling and throws JS `Error`s when the server reports an error.
- Normalizes proxy vs JSON-RPC response envelopes so page code can consume one shape.
- Exposes `parseWorkspaceGetObject()` to unwrap tuple/data wrappers and parse JSON strings returned by `Workspace.get`.

---

## REST Proxy Client (`lib/api/modelseed.ts`)

Wherever possible, we prefer to call **modelseed‑api** instead of talking directly to Workspace or ProbModelSEED:

- Base URL: `MODELSEED_API_URL` from `lib/api/config.ts`.
- Key endpoints:
  - `GET /api/models` → list of models for the authenticated user.
  - `GET /api/media/public` → public media formulations.
  - `POST /api/workspace/{op}` → future‑proof workspace proxy (ls/get/etc.).

The helper `modelseedFetch()` in `lib/api/modelseed.ts`:

- Reads `AuthResult` from `localStorage['auth']`.
- Sends the raw token as `Authorization: <token>`.
- Throws descriptive errors when HTTP status is not OK.

`USE_MODELSEED_API` (from `NEXT_PUBLIC_USE_MODELSEED_API`) determines whether user-data pages (`/my-models`, `/myMedia`) talk to modelseed-api or are disabled with a clear configuration error.
`USE_NEW_PROXY` (from `NEXT_PUBLIC_USE_NEW_PROXY`) determines whether workspace operations use the REST proxy or the legacy JSON-RPC service.

---

## Authentication in Requests

- Tokens come from `lib/api/auth.ts` and `AuthProvider.tsx` (see `AUTHENTICATION.md`).
- For both Workspace and modelseed‑api:
  - We send `Authorization: <raw token>`.
  - No extra `Bearer ` prefix is added, because the services expect the full PATRIC/RAST token string.

---

## Performance: Caching with TanStack Query

Because Workspace/model objects can be large, we rely on **TanStack Query**:

1. **Unique Keys** — use stable keys such as:
   - `['workspace', 'ls', path]` for listing.
   - `['workspace', 'get', path]` for object loads.
   - `['models']`, `['media']` for modelseed‑api lists.
2. **Stale Time** — user models/media rarely change during a single session, so user‑data queries typically use `staleTime` in the minutes range to avoid redundant requests.

---

## Debugging Workspace & modelseed‑api Calls

If user data fails to load:

1. Check the **Network** tab:
   - For legacy flows: look for `POST https://p3.theseed.org/services/Workspace`.
   - For modern flows: look for `GET ${MODELSEED_API_URL}/api/models` or `/api/media/public`.
2. Confirm that the request includes:
   - `Authorization` header with a non‑empty token.
   - Expected JSON‑RPC payload (for Workspace) or REST path/params (for modelseed‑api).
3. For Workspace permission errors (`_ERROR_User lacks permission to / for requested action!_ERROR_`), prefer routing through the REST workspace proxy with `USE_NEW_PROXY=true`, since it centralizes Workspace behavior and permissions.

---

*Refer to the [`Workspace` repository](https://github.com/cshenry/Workspace) and [`modelseed-api`](https://github.com/ModelSEED/modelseed-api) for backend implementation details.*
