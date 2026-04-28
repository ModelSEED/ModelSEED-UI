# ModelSEED-UI Documentation Registry

This directory contains the technical documentation for the ModelSEED-UI application.

## Document Index

| System Domain | Target Document | Core Topics Covered |
| :--- | :--- | :--- |
| **High-Level Design** | [ARCHITECTURE.md](./ARCHITECTURE.md) | Tech stack, TanStack Query data flow, API clients, and the MUI v7 theming system. |
| **URL Parity** | [ROUTING.md](./ROUTING.md) | Algorithms for mapping legacy AngularJS Hash-bundle routes to Next.js App Router catch-all (`[...path]`) URLs. |
| **User Sessions** | [AUTHENTICATION.md](./AUTHENTICATION.md) | RAST/PATRIC login flow, `useAuth` Zustand store, and Token management for API requests. |
| **External Data** | [WORKSPACE.md](./WORKSPACE.md) | Handling PATRIC Workspace JSON-RPC objects and the `modelseed-api` proxy endpoints. |
| **Scientific Data** | [BIOCHEMISTRY.md](./BIOCHEMISTRY.md) | Solr-indexed reactions/compounds lookup and chemical formula/stoichiometry UX rendering rules. |
| **Legacy Codebase** | [LEGACY_TRANSITION.md](./LEGACY_TRANSITION.md) | Transitioning from the AngularJS source code to modern React patterns. |
| **Testing Platform** | [TESTING.md](./TESTING.md) | Vitest unit tests, Playwright E2E tests, and CI/CD pipeline. |
| **Contributing** | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Guidelines for maintaining the documentation. |

## Project Design Principles

1. **Scientific Accuracy**: Biological identifiers, chemical formulas, and network models must be rendered according to scientific standards. See `BIOCHEMISTRY.md`.
2. **URL Parity**: Legacy system links must redirect predictably in the modern application. See `ROUTING.md`.
3. **Decoupled API Architecture**: Network calls are encapsulated in `lib/api/` using `@tanstack/react-query`. Avoid direct `fetch()` calls in components. See `ARCHITECTURE.md`.
4. **MUI-Native Styling**: Utilize MUI v7 customized themes in `lib/theme.ts`. Custom CSS should be avoided.
