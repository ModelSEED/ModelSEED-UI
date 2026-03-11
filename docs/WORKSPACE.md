# KBase Workspace Interaction (`WORKSPACE.md`)

The heart of ModelSEED’s user data and public reference data is the **KBase Workspace Service**. This document explains how we interact with this JSON-RPC 1.1 dependency.

---

## 🏗️ The RPC Client (`lib/api/workspace.ts`)

We do not use a heavy SDK. Instead, we use a lightweight `fetch`-based JSON-RPC client to communicate with:
`https://kbase.us/services/ws`

### 🧪 Core Methods

#### `workspaceGet(paths: string[])`
The primary method for retrieving objects (Models, FBA, Genomes).
- **Arguments**: An array of full workspace paths (e.g., `["vibhav/models/model1"]`).
- **Response**: The raw data object returned by the `get_objects2` method of the Workspace API.

#### `listObjects(params: ListParams)`
Used for the data browser and model selection lists.

---

## 🧬 Scientific Object Mapping

KBase objects have specific type identifiers. We typically filter or cast data based on these types:

| Biological Type | KBase Type String |
| :--- | :--- |
| **Metabolic Model** | `KBaseBiochem.MetabolicModel` |
| **FBA Result** | `KBaseFBA.FBA` |
| **Genome** | `KBaseGenomes.Genome` |
| **Media** | `KBaseBiochem.Media` |

---

## 🛡️ Authentication in Requests

Every request to the Workspace service (except for public objects) requires the user's **KBase Auth Token** to be passed in the `Authorization` header.

- **Token Retrieval**: The `lib/api/workspace.ts` module fetches the token from the global Auth state/Zustand store when a request is initiated.

---

## ⚡ Performance: Caching with TanStack Query

Because Workspace objects (especially Models) can be large (1MB+ JSON), we leverage **React Query** to cache these objects in memory.

1.  **Unique Keys**: We use the workspace path as the query key: `['workspace', path]`.
2.  **Stale Time**: Biological models are generally static once created, so we use a long `staleTime` (e.g., 5-10 minutes) to prevent redundant network transfers.

---

## 🛠️ Debugging Workspace Calls

If a model fails to load:
1.  Check the **Network Tab** in Chrome DevTools.
2.  Look for the `POST` request to `https://kbase.us/services/ws`.
3.  Inspect the **JSON-RPC payload** to ensure the `params` and `token` are correct.

---
*Refer to the [KBase Workspace API Documentation](https://github.com/kbase/workspace_deluxe) for low-level method signatures.*
