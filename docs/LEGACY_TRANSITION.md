# Legacy Transition Guide (`LEGACY_TRANSITION.md`)

> **🤖 AI Agent Quick-Start**
> If you are tasked with migrating a feature from the `external/ModelSEED-UI` AngularJS source code into the modern Next.js 16 app, this document provides your exact translation matrix. **Do not copy AngularJS code.** Re-implement the logic using modern React patterns.

This document details the architectural shift from the legacy **AngularJS** application to the modern **Next.js 16** implementation of ModelSEED.

---

## 🏗️ Architecture Translation Matrix

| Concept | Legacy System (AngularJS) | Modern System (Next.js 16 / React 19) |
| :--- | :--- | :--- |
| **UI Framework** | Bootstrap 3 + Custom CSS | **MUI v7** (Material UI) + Vanilla CSS |
| **Routing** | `ui-router` (Client-side) | **App Router** (Server & Client) |
| **Data Fetching** | `$http` with manual promises | **TanStack Query v5** (`useQuery`) |
| **Global State** | `$rootScope` & Custom Services | **Zustand** + React Context (`useAuth`) |
| **Language** | JavaScript (ES5) | **TypeScript** (Strict Mode) |
| **Tables/Lists** | `ng-repeat` | array `.map()` or **MUI DataGrid** |

---

## 🗺️ Migrating a Legacy Route

When converting an old AngularJS page into a new Next.js route, observe the following protocol:

### 1. Identify the Source
Legacy views are located in `external/ModelSEED-UI/app/views/`. Find the HTML template and its corresponding controller in `external/ModelSEED-UI/app/scripts/ctrls/`.

### 2. Determine the URL Structure (The "URL Parity" Rule)
Scientific citations rely on exact URL matching.
- **Old Router:** `$stateProvider.state('model', { url: '/model/{path:.*}' ... })`
- **New Router:** Create a folder named `app/model/[...path]/` and put your `page.tsx` inside. See `ROUTING.md`.

### 3. Rip and Replace Data Fetching
- **Old Way:** An AngularJS `$http.post` call buried in a controller.
- **New Way:** 
  1. Define the network wrapper in `lib/api/` (either `modelseed.ts` or `workspace.ts`).
  2. Implement `useQuery` from `@tanstack/react-query` inside your React component to execute it.

---

## 🧪 Preserving Scientific Logic

While the framework has changed, the underlying scientific logic and presentation MUST remain identical.

1. **Chemical Equations**: The legacy system used various `$scope` formatters. We centralized this. **You must use the `<ChemicalEquation>` component** to ensure consistent, accurate rendering of subscripts and stoichiometry.
2. **Workspace RPC**: The transition moves from KBase's dynamic SDK (often injected via script tags) to a lightweight, typed `lib/api/workspace.ts` that interacts directly with the JSON-RPC endpoints.
3. **Solr Index**: Both systems consume the exact same Solr indices for biochemistry (`lib/api/biochem.ts` vs the legacy Javascript services).

---

## 🧠 Mental Model Shifts for Legacy Developers

If you are a human reading this and coming from the AngularJS codebase:

- **Components vs Directives**: Instead of AngularJS directives (`ng-repeat`, `ng-if`, `ng-show`), use React's array `.map()` function and JS conditional rendering (`{condition && <Component />}`).
- **Hooks vs Services**: Global data services (`Auth`, `Jobs`) are replaced by Custom Hooks (e.g., `useAuth()`).
- **Server Components by Default**: Files in the `app/` directory are **Server Components** by default. If your page uses `useState()`, `useEffect()`, or user event handlers (`onClick`), you must add the `'use client'` directive at the absolute top of the file.
