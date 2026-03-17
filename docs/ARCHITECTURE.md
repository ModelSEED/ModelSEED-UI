# Architecture & Information Flow (`ARCHITECTURE.md`)

> **🤖 AI Agent Quick-Start**
> Before writing custom `fetch()` calls or a dedicated data store, review this document. We exclusively use **TanStack Query v5** for server state and **Zustand** for global client state.

This document serves as the high-level system specification for the ModelSEED-UI Next.js 16 app.

---

## 🏗️ High-Level Component Stack

ModelSEED-UI is a **React 19** application served by the **Next.js App Router**:

| Layer | Technology | Rules & Boundaries |
| :--- | :--- | :--- |
| **Routing Layer** | **Next.js 16** (App Router) | All biological paths must match legacy URLs via catch-all routes (e.g. `/model/[...path]`). Use Server Components by default. |
| **UX & Presentation** | **MUI v7** (Material UI) | Shared design system. Rely strictly on `lib/theme.ts`. For heavy data rendering, use `DataGrid`. |
| **Data Engine** | **TanStack Query v5** | Sole manager of request lifecycles, caching, and loading/error states for all API interaction. |
| **Shared State** | **Zustand** | Only for global auth (`useAuth`) and layout toggles. Do NOT put API responses here. |

---

## 🔌 Core Backends & API Abstraction

All core network logic MUST reside inside `lib/api/` and never directly in a `.tsx` page. The app interfaces with three primary systems:

### 1. PATRIC Workspace (JSON-RPC)
- **What**: The robust user data storage system.
- **Where**: `https://p3.theseed.org/services/Workspace`
- **Client**: `lib/api/workspace.ts`
- **Usage**: Only for legacy workflows and specific biological object retrieval parsing.

### 2. ModelSEED REST API (`modelseed-api`)
- **What**: The modern computational proxy and analysis backend.
- **Where**: Defined by `MODELSEED_API_URL` (currently `http://poplar.cels.anl.gov:8000`).
- **Client**: `lib/api/modelseed.ts`
- **Usage**: Used for **My Models**, **My Media**, **Jobs**, and workspace proxy events. Authentication requires a PATRIC Token in the `Authorization` header.

### 3. Solr Biochemistry Search (REST)
- **What**: Extremely fast reference data search.
- **Where**: Defined by `SOLR_BASE` in `lib/api/config.ts`.
- **Client**: `lib/api/biochem.ts`
- **Usage**: Exclusively for querying reactions and compounds for reference biochemistry tables.

---

## 🔄 The Data Fetching Lifecycle

We enforce a strict **Query-First** architecture. When building a new data-driven view:

1. **Invoke TanStack Query**: The component calls `useQuery()` with a hardcoded, stable `queryKey` array.
2. **Abstract the Network**: The `queryFn` executes a function mapped from `lib/api/` (e.g., `getModelsFromApi()`).
3. **Handle State Gracefully**: Let TanStack Query manage `isLoading`, `isError`, and `data` availability natively.
4. **Cache & Revalidation**: TanStack caches the output aggressively. Ensure mutations invalidate specific keys via `queryClient.invalidateQueries()`.

---

## 🎨 Theme & Strict Design System

ModelSEED-UI is dense and highly scientific. We utilize MUI v7 exclusively. 

**Core Directives for UX:**
- **No Ad-Hoc CSS**: Exclude raw `.css` or inline global styling. Rely heavily on the `sx={{...}}` prop formatted in consistent increments of `8px`.
- **Constraint Widths**: Use `Container maxWidth="lg"` or `"xl"` to keep text readability high.
- **Palette**: Defined inside `lib/theme.ts`. Deep purples and cyans to emulate legacy ModelSEED branding.
- **Complex Tables**: If a table manages more than 50 rows or requires column sorting, filtering, or pagination, exclusively use MUI's `DataGrid` combined with the unified `DataControlHeader`.

---

## ⚡ Developer Performance Guidelines

1. **Client vs Server Components**:
   - Next.js default is a Server Component (`app/page.tsx`). Do this whenever state/effects are unneeded.
   - Inject `'use client'` at the absolute lowest node of the component tree that requires interactivity or user hooks.
2. **Selective Rerendering**:
   - `useMemo` complex `DataGrid` columns to prevent heavy DOM thrashing.
   - `useCallback` on grid event handlers.
3. **Structure & Code-Splitting**:
   - Page-specific helper UI stays in the Route directory.
   - Global or cross-functional UI lives in `components/ui/`.
