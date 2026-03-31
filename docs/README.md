# ModelSEED-UI Documentation Registry

> **AI Agent Quick-Start**  
> If you are an AI navigating this directory, use this file to understand the architecture domains before making assumptions about how auth, routing, or the workspace operates.

This directory is the **deep-dive documentation library** for the modern **ModelSEED-UI** (Next.js 16 + MUI 7). Treat this file as the master index for technical specifications.

---

## Deep-Dive Document Library

Depending on the feature or system you are working on, select the appropriate manual:

| System Domain | Target Document | Core Topics Covered |
| :--- | :--- | :--- |
| **High-Level Design** | **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Tech stack, TanStack Query data flow, API clients, and the MUI v7 theming system. |
| **URL Parity** | **[ROUTING.md](./ROUTING.md)** | Algorithms for mapping legacy AngularJS Hash-bundle routes to Next.js App Router catch-all (`[...path]`) URLs. |
| **User Sessions** | **[AUTHENTICATION.md](./AUTHENTICATION.md)** | RAST/PATRIC login flow, `useAuth` Zustand store, and Token management for API requests. |
| **External Data** | **[WORKSPACE.md](./WORKSPACE.md)** | Handling PATRIC Workspace JSON-RPC objects and the `modelseed-api` proxy endpoints. |
| **Scientific Data** | **[BIOCHEMISTRY.md](./BIOCHEMISTRY.md)** | Solr-indexed reactions/compounds lookup and chemical formula/stoichiometry UX rendering rules. |
| **Legacy Codebase** | **[LEGACY_TRANSITION.md](./LEGACY_TRANSITION.md)** | Transitioning from the AngularJS `external/ModelSEED-UI` source code to modern React patterns. |
| **Testing Platform** | **[TESTING.md](./TESTING.md)** | Vitest unit tests, Playwright E2E tests, and GitHub Actions CI/CD pipeline. |
| **Contributing** | **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** | Rules for maintaining these documents and keeping this registry up-to-date. |

---

## Known Issues & Action Items

For a curated list of UI bugs, API limitations, backend blockers, and developer action items, see the project root [`issues.md`](../issues.md).

---

## Project Design Principles

When modifying the codebase, refer back to these core invariants:

1. **Scientific Accuracy Above All**: We render biological identifiers, chemical formulas, and network models. Subscripts ($H_2O$) and correct casing must strictly follow IUPAC/KEGG/SEED domain standards. See `BIOCHEMISTRY.md`.
2. **Ironclad Catch-all Routing**: Every previously published URL referring to the old site must redirect to an identical page on this site. Never break a legacy link. See `ROUTING.md`.
3. **Decoupled API Architecture**: Do not put `fetch()` inside React components. All interactions with PATRIC, RAST, or Solr routing occur exclusively via wrappers inside `lib/api/`, utilizing `@tanstack/react-query` for state. See `ARCHITECTURE.md`.
4. **MUI-Native Styling**: Use MUI v7 themes (`lib/theme.ts`) and the `sx` prop over ad-hoc CSS files. We prioritize a dense, clean, and functional dashboard UX.

---
*Maintained per GSD methodology. Keep docs in sync with `.gsd/STATE.md` phase changes and add new issues to `../issues.md`.*

## Timestamp Log
- Updated: 2026-03-31 16:00:00 CDT - UI reached full production parity with legacy ModelSEED. Advanced options and inline metadata editing integrated through REST proxy. Codebase conforms entirely to Next.js strict mode limits with an error-free test suite.
