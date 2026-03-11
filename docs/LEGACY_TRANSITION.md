# Legacy Transition Guide (AngularJS to Next.js)

This document details the architectural shift from the legacy **AngularJS** application to the modern **Next.js 16** implementation of ModelSEED.

---

## 🏛️ Architecture Comparison

| Feature | Legacy System (AngularJS) | Modern System (Next.js 16) |
| :--- | :--- | :--- |
| **Framework** | AngularJS 1.x | Next.js 16 (React 19) |
| **UI Library** | Bootstrap 3 + Custom CSS | MUI v7 (Beta) + Vanilla CSS |
| **Routing** | `ui-router` (Client-side) | App Router (Server-side + Client) |
| **Data Fetching** | `$http` with manual caching | TanStack Query v5 (Auto-caching) |
| **State** | `$rootScope` & Services | Zustand + React Context |
| **Language** | JavaScript (ES5) | TypeScript (Strict Mode) |

---

## 🔗 URL Parity & Matching

A critical requirement for this transition is maintaining **1:1 URL parity**. Scientific citations and external links must continue to function.

### 🗺️ Route Translation Map

| Legacy Path Pattern | Functional Role | New Next.js Root |
| :--- | :--- | :--- |
| `/model/*` | Metabolic Model Detail | `app/model/[...path]` |
| `/fba/*` | FBA Result Analysis | `app/fba/[...path]` |
| `/biochem/reactions` | Reaction Reference | `app/(reference-data)/biochem/reactions` |
| `/biochem/compounds` | Compound Reference | `app/(reference-data)/biochem/compounds` |
| `/workspace/*` | File Browser | `app/data/[...path]` |

### 🌉 Implementation: The Catch-All Bridge
In AngularJS, routes like `/model/:path*` allowed for dynamic nested paths. In Next.js, we achieve this using the **Catch-all Segment** `[...path]`.

- **Legacy logic**: `$stateProvider.state('model', { url: '/model/{path:.*}' ... })`
- **Next.js logic**: A folder named `app/model/[...path]/` containing `page.tsx`.

---

## 🧬 Scientific Logic Preservation

While the framework has changed, the underlying scientific logic must remain identical.

1.  **Chemical Equations**: The legacy system used various formatters. We have centralized this in the `ChemicalEquation` component to ensure consistent, accurate rendering of subscripts and stoichiometry across all views.
2.  **Workspace RPC**: The transition involves moving from KBase's dynamic SDK (often injected via script tags) to a lightweight, typed `lib/api/workspace.ts` that interacts directly with the JSON-RPC endpoints.
3.  **Solr Index**: Both systems consume the same Solr indices for biochemistry, ensuring data consistency during the transition.

---

## 🛠️ Onboarding for Legacy Developers

If you are coming from the AngularJS codebase, keep these mental model shifts in mind:

- **Components vs Directives**: Instead of AngularJS directives (`ng-repeat`, `ng-if`), use React's map function and conditional rendering.
- **Hooks vs Services**: Global data services are replaced by Custom Hooks (e.g., `useAuth`, `useQuery`).
- **Server Components**: Remember that by default, files in the `app/` directory are **Server Components**. If you need interactivity (buttons, state, effects), add the `'use client'` directive at the top.

---
*Maintained at: `docs/LEGACY_TRANSITION.md`*
