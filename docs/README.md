# ModelSEED‑UI Developer Manual

This directory is the **documentation index** for the modern **ModelSEED‑UI** (Next.js 16 + MUI 7). Treat this file as the table of contents for all deep‑dive docs.

## 📁 Deep‑Dive Document Library

| Document | Purpose |
| :--- | :--- |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | **Data Flow & Tech Stack**: Next.js App Router, MUI 7, TanStack Query, and how we talk to the PATRIC Workspace and `modelseed-api`. |
| **[ROUTING.md](./ROUTING.md)** | **URL Management**: Mapping from the legacy AngularJS UI to modern catch‑all routes while preserving external links. |
| **[AUTHENTICATION.md](./AUTHENTICATION.md)** | **Security & Auth**: RAST/PATRIC login flows, token storage, and the global `AuthProvider` contract. |
| **[BIOCHEMISTRY.md](./BIOCHEMISTRY.md)** | **Scientific Data**: How the Solr‑indexed reactions/compounds are queried and rendered (including equation formatting). |
| **[WORKSPACE.md](./WORKSPACE.md)** | **Workspace & modelseed‑api**: JSON‑RPC calls to `https://p3.theseed.org/services/Workspace` and how `modelseed-api` proxies workspace operations. |
| **[LEGACY_TRANSITION.md](./LEGACY_TRANSITION.md)** | **AngularJS → Next.js**: Mental‑model shift for legacy contributors and details on preserving scientific behavior. |
| **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** | **How to use these docs**: Conventions for adding new documentation and keeping this index accurate. |

---

## 🛠️ Project Design Principles

1. **Scientific accuracy first**: Chemical formulas, stoichiometry, and biological identifiers must follow IUPAC and domain standards (see `BIOCHEMISTRY.md`).
2. **Legacy compatibility**: All published URLs from the previous site should continue to work, either directly or via compatible redirects (see `ROUTING.md` and `LEGACY_TRANSITION.md`).
3. **Modern UI/UX**: Use **MUI 7** components and the shared theme for any new UI surface; avoid ad‑hoc CSS where possible.
4. **Performance & reliability**: Prefer TanStack Query for data fetching, keep Workspace and `modelseed-api` access in `lib/api/`, and avoid client‑side auth or workspace logic spread across pages.

---
*Last Updated: 2026‑03‑12*
