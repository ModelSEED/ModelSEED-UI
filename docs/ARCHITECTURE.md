# Application Architecture & Tech Stack (`ARCHITECTURE.md`)

This document defines the **high‑level design** and **information flow** for the Next.js 16 ModelSEED‑UI application.

---

## 🏗️ High‑Level Component Stack

ModelSEED‑UI is a **React 19 app** built with the Next.js App Router:

- **Routing Engine**: [Next.js 16 (App Router)](https://nextjs.org/) — catch‑all biological paths (e.g. `/model/[...path]`) and app‑directory layouts.
- **UI Framework**: [MUI v7](https://mui.com/) — shared design system and data‑heavy components such as `DataGrid`.
- **Data Engine**: [TanStack Query v5](https://tanstack.com/query/latest) — request lifecycle and caching for biochemistry, workspace, and `modelseed-api` calls.
- **State Store**: [Zustand](https://github.com/pmndrs/zustand) + React Context — global auth, layout state, and small cross‑cutting concerns.

---

## 🧬 Information Flow & Data Layer

All API code lives in `lib/api/`. The app talks to three main backends:

1. **PATRIC Workspace (JSON‑RPC)**  
   - Endpoint: `https://p3.theseed.org/services/Workspace` (see `lib/api/workspace.ts`).  
   - Used for selected reference data and legacy flows that still depend on Workspace objects.

2. **ModelSEED REST API (`modelseed-api`)**  
   - Default base URL: `MODELSEED_API_URL` (currently `http://poplar.cels.anl.gov:8000` for the demo).  
   - Client: `lib/api/modelseed.ts`.  
   - Responsibilities:
     - `/api/models` → backing **My Models**.
     - `/api/media/public` → backing **My Media**.
     - `/api/workspace/{op}` → future‑proof proxy for Workspace operations.

3. **Solr Biochemistry Search (REST)**  
   - Base: `SOLR_BASE` from `lib/api/config.ts`.  
   - Client: `lib/api/biochem.ts` for reactions/compounds lookups.

### 🔄 Data Fetching Lifecycle (TanStack Query)

We use a **query‑first** approach:

- **Step 1**: A page or component calls `useQuery()` with a stable `queryKey`.
- **Step 2**: The corresponding function in `lib/api/*` executes the network request.
- **Step 3**: TanStack Query caches the result and manages loading/error state.
- **Step 4**: Subsequent renders with the same key read from cache until the data becomes stale.

---

## 🛡️ Theme & Design System

The app uses a shared MUI theme (see `lib/theme.ts`):

- **Primary Colors**: variants of deep purple and cyan to match the legacy ModelSEED branding.
- **Typography**: tuned for dense tables (body text) and clear section headings.
- **Layout**: MUI `Box`, `Grid`, and `Container` components for consistent spacing and breakpoints.

Key patterns:

- Use `Box sx={{ ... }}` for spacing and layout; avoid inline `style` where possible.
- Use `Container maxWidth="lg"` (or similar) to keep content at a readable width.
- For data‑heavy views, prefer `DataGrid` over custom tables.

---

## ⚡ Developer Performance Guidelines

1. **Server vs Client Components**  
   - Default to Server Components in `app/` when you do not need React state or effects.  
   - Add `'use client'` only when you truly need interactivity (forms, grids, auth‑aware views).

2. **Code Splitting**  
   - Keep page‑specific UI in the corresponding `app/.../` folder so Next.js can automatically split the bundle.

3. **Selective Re‑rendering**  
   - Use `useMemo` and `useCallback` for expensive column definitions or renderers in `DataGrid` to keep scrolling and filtering responsive.

---

*Refer to `.gsd/SPEC.md` for the original project requirements and milestone‑level goals.*
