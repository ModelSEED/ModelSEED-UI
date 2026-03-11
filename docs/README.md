# ModelSEED-UI Developer Manual

This directory contains deep-dive documentation for specific subsystems of the **ModelSEED-UI** Next.js 16 reboot.

## 📁 Deep-Dive Document Library

| Document | Purpose |
| :--- | :--- |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | **Data Flow & Tech Stack**: In-depth look at Next.js, TanStack Query, and MUI v7 integration. |
| **[ROUTING.md](./ROUTING.md)** | **URL Management**: Comprehensive mapping between legacy AngularJS and modern Next.js catch-all routes. |
| **[AUTHENTICATION.md](./AUTHENTICATION.md)** | **Security & Auth**: Detailed guide to KBase/ModelSEED session handling and auth providers. |
| **[BIOCHEMISTRY.md](./BIOCHEMISTRY.md)** | **Scientific Data**: How the Solr-indexed Reactions and Compounds are searched and rendered. |
| **[WORKSPACE.md](./WORKSPACE.md)** | **KBase Workspace**: Interacting with the backend JSON-RPC services for Models and FBA data. |

---

## 🛠️ Project Design Principles

1.  **Scientific Accuracy First**: Chemical formulas, stoichiometry, and biological identifiers must always follow IUPAC and biological standards. See `BIOCHEMISTRY.md`.
2.  **Legacy Compatibility**: No URLs from the previous system should break. See `ROUTING.md`.
3.  **Modern UI/UX**: Use **MUI v7** components and the custom Purple/Cyan palette to maintain a premium feel.
4.  **Performance**: Utilize **React Query** for caching and **Server Components** for faster initial page loads (LHR optimization).

---
*Last Updated: 2026-03-11*
