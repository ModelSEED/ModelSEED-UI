# Workspace & modelseed-api Interaction (`WORKSPACE.md`)

> **🤖 AI Agent Quick-Start**
> The application is in a transitional phase between the legacy JSON-RPC Workspace and the new REST `modelseed-api` (Poplar). **Always check** the environment variables `USE_MODELSEED_API` and `USE_NEW_PROXY` to determine which API client to use for user data and workspace operations.

The heart of ModelSEED’s user data (Models, Jobs, Media) and public reference data is the **PATRIC Workspace Service** plus the newer **ModelSEED REST API (`modelseed-api`)**. This document explains the dual-backend architecture and how to interface with them.

---

## 📡 The Two Backends

### 1. Legacy PATRIC Workspace (JSON-RPC)
- **URL**: `https://p3.theseed.org/services/Workspace`
- **Protocol**: JSON-RPC over POST.
- **Client Wrapper**: `lib/api/workspace.ts`
- **Usage**: Historically used for everything. Currently being phased out in favor of the proxy for workspace object retrieval (`workspaceGet`) and directory listing (`workspaceLs`).

### 2. ModelSEED REST API (Poplar)
- **URL**: `MODELSEED_API_URL` (e.g., `http://poplar.cels.anl.gov:8000`)
- **Protocol**: Standard REST (GET/POST/DELETE).
- **Client Wrapper**: `lib/api/modelseed.ts`
- **Usage**: The modern backend for:
  - User Models (`/api/models`)
  - Jobs (`/api/jobs`)
  - User and Public Media (`/api/media`)
  - **Workspace Proxy**: `/api/workspace/*`

---

## 🛠️ Data Fetching Rules

When writing data fetching logic in the context of user data, you **must** use the abstractions in `lib/api/workspace.ts` and `lib/api/modelseed.ts`. Do not write `fetch()` calls manually in UI components.

### Workspace Proxy (`lib/api/workspace.ts`)
This file exports dual-purpose functions. If `USE_NEW_PROXY=true`, it transparently routes JSON-RPC-style requests through the modern REST proxy (`/api/workspace/ls`, `/api/workspace/get`). 
- **`workspaceLs(['/path'])`**: Returns directory contents.
- **`workspaceGet(['/path/to/obj'])`**: Returns the raw workspace object. **Crucial**: Use the helper `parseWorkspaceGetObject()` to unwrap the deeply nested tuple/data response.

### ModelSEED API (`lib/api/modelseed.ts`)
This file explicitly calls the modern Poplar endpoints.
- If `USE_MODELSEED_API=false`, UI features depending on these endpoints (like My Models) should gracefully degrade or show an error state.

---

## 🔑 Authentication Rules

Both backends require the exact same authentication token.
- **Header**: `Authorization: <token-string>`
- **Rule**: There is **no** `Bearer ` prefix. Pass the token string exactly as it comes from `getStoredAuth()`.

---

## 🐛 Debugging Workspace Errors

If a workspace call fails:
1. **Check the Network Tab**: 
   - Is it hitting `p3.theseed.org` (Legacy) or `poplar.cels.anl.gov` (REST)?
2. **Check the Payload**: 
   - JSON-RPC requires an array `[{ paths: [...] }]`. 
   - REST proxy expects standard JSON body `{ paths: [...] }`. The wrappers in `lib/api/workspace.ts` handle this transformation automatically.
3. **Permissions Error**: If an `_ERROR_User lacks permission...` occurs, verify the token is present and valid, and ensure the requested workspace path actually belongs to the authenticated user or is explicitly public.
