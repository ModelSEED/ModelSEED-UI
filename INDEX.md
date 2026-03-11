# ModelSEED-UI Project Documentation Index

This is the ultimate developer’s guide to the **ModelSEED-UI** Next.js 16 reboot. It is designed to be your primary **Control-F** search-ready reference for navigating, understanding, and modifying the codebase. 

---

## 🔎 One-Stop Search Map (Quick-Find Table)

| To change/adjust... | ...Go to this file/folder | Why? |
| :--- | :--- | :--- |
| **Header / Navigation** | [`components/layout/Header.tsx`](./components/layout/Header.tsx) | Main top nav for home and docs. |
| **Biochem Sidebar/Header** | [`components/layout/AppHeader.tsx`](./components/layout/AppHeader.tsx) | Sub-header for biological data tools. |
| **Model Data Rendering** | [`app/model/[...path]/page.tsx`](./app/model/[...path]/page.tsx) | Handles model exploration UI. |
| **Chemical Formulas** | [`components/ui/ChemicalEquation.tsx`](./components/ui/ChemicalEquation.tsx) | Logic for subscripting formulas like `H2O`. |
| **Colors/Theme/Styles** | [`lib/theme.ts`](./lib/theme.ts) | Primary MUI v7 theme definition. |
| **API Calls (Ref Data)** | [`lib/api/biochem.ts`](./lib/api/biochem.ts) | Solr queries for reactions/compounds. |
| **API Calls (User Data)** | [`lib/api/workspace.ts`](./lib/api/workspace.ts) | KBase Workspace / RPC adapters. |
| **Auth Logic** | [`components/auth/AuthProvider.tsx`](./components/auth/AuthProvider.tsx) | Authentication context and state. |

---

## 🏗️ Folder Structure Tree & Descriptions

A recursive view of the codebase, detailing every major directory’s function and the files within them.

### `📂 app/` — [View Folder README](./app/README.md)
The core routing and page-level logic directory using the Next.js App Router.
- `📂 (reference-data)/` — [View README](./app/(reference-data)/README.md)
    - `📂 biochem/` — [View README](./app/(reference-data)/biochem/README.md)
        - `📂 compounds/` — Searchable community compounds.
        - `📂 reactions/` — Searchable metabolic reactions.
    - `📂 genomes/` — Publicly available genome repository.
- `📂 data/[...path]/` — [View README](./app/data/README.md)
    - **Catch-all** route for legacy links to the Workspace system.
- `📂 fba/[...path]/` — [View README](./app/fba/README.md)
    - **Catch-all** for Flux Balance Analysis results. 
- `📂 gapfill/[...path]/` — [View README](./app/gapfill/README.md)
    - **Catch-all** for gapfilling reconstruction logs. 
- `📂 model/[...path]/` — [View README](./app/model/README.md)
    - **Catch-all** for the Metabolic Model viewer.
- `📂 my-models/` — Protected route where users manage their own workspace models.
- `📂 auth/` — Contains signup and login forms.
- `📜 layout.tsx` — The root layout, wrapping every page in the `AuthProvider` and `QueryClient`.

### `📂 components/` — [View Folder README](./components/README.md)
Reusable pieces of the application.
- `📂 auth/` — Authentication context, login, and signup modals.
- `📂 layout/` — Global shell components: `Header.tsx`, `Footer.tsx`, and `AppHeader.tsx`.
- `📂 ui/` — Scientific UI elements:
    - `📜 ChemicalEquation.tsx` — Complex regex-based chemical formula renderer.
    - `📜 GridHighlightText.tsx` — Component used in tables to highlight matches.
- `📂 icons/` — Custom SVG icons used in the scientific dashboard.

### `📂 lib/` — [View Folder README](./lib/README.md)
The "Brain" of the application—logic, configuration, and API adapters.
- `📂 api/` — Logic communicating with various ModelSEED/KBase servers.
    - `📜 biochem.ts` — Solr-based biochemistry searching.
    - `📜 workspace.ts` — High-level RPC (JSON-RPC) workspace service wrapper.
    - `📜 auth.ts` — Direct interaction with KBase Auth services.
- `📂 data/` — Hardcoded/static biological dictionaries and mappings.
- `📜 theme.ts` — The source of truth for all styling tokens (MUI v7).

### `📂 docs/` — [The Developer Manual](./docs/README.md) (NEW)
Central repository for deep-dive developer guides.
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — High-level data flow and tech stack details.
- **[ROUTING.md](./docs/ROUTING.md)** — Detailed mapping between legacy AngularJS paths and Next.js routes.
- **[AUTHENTICATION.md](./docs/AUTHENTICATION.md)** — How the KBase session token flow works locally and globally.
- **[BIOCHEMISTRY.md](./docs/BIOCHEMISTRY.md)** — Guide to indices and parsing scientific formulas.

---

## 🧪 Key Biological Components to Control-F

| Component | Search Tag (RegEx Friendly) | Location |
| :--- | :--- | :--- |
| **`ChemicalEquation`** | `React.FC<{ equation: string }>` | `components/ui/ChemicalEquation.tsx` |
| **`BiochemTable`** | `<DataGrid ...>` | `app/(reference-data)/biochem/reactions/page.tsx` |
| **`AuthProvider`** | `useAuth()` | `components/auth/AuthProvider.tsx` |
| **`Workspace Client`** | `workspaceGet()` | `lib/api/workspace.ts` |
| **`MUI v7 Palette`** | `createTheme({ ... })` | `lib/theme.ts` |

---

## ⚡ Developer Quick-Action Checklist

- **Adding a new legacy route?**
  1. Add a folder to `app/`.
  2. Use a `[...path]` folder for catch-all behavior.
  3. Ensure `page.tsx` uses `params.path` as its variable.
  4. Link the new route in `docs/ROUTING.md`.

- **Style Adjustment?**
  1. Check `lib/theme.ts` for global colors.
  2. Use the `sx={ ... }` prop on MUI components for standard spacing (8px increments).

- **New Data Fetching?**
  1. Define the API call in `lib/api/`.
  2. Use `useQuery` from `@tanstack/react-query` in your component.

---

## 📈 Roadmap & Tasks
For current progress and upcoming feature implementation (e.g., Phase 14: FBA), refer to:
- **[ROADMAP.md](./.gsd/ROADMAP.md)**
- **[STATE.md](./.gsd/STATE.md)**

---
*Created by the Advanced Agentic Coding team. Last Updated: 2026-03-11*
