# ModelSEED-UI Project Documentation Index

> **🚨 AI AGENT & DEVELOPER START HERE 🚨**
> This file is your primary **Control-F** reference and context map. Read this *before* exploring the codebase. If you are an AI, use the directories and files linked here to quickly narrow your search space rather than blindly traversing the repository.

---

## 🤖 AI Agent Context Protocol

When starting a new task, follow this exact sequence:
1. **Understand Current State**: Read `.gsd/STATE.md` to know what was just completed and what is currently active.
2. **Understand the Big Picture**: Read `.gsd/ROADMAP.md` (specifically the current and next phases).
3. **Understand the Rules**: Read `PROJECT_RULES.md` and `.gemini/GEMINI.md`.
4. **Locate Target Files**: Use the **One-Stop Search Map** below to find the files relevant to your task.
5. **Read Subsystem Docs**: If working on a specific subsystem (Auth, Routing, Workspace), read its exact file in the `docs/` folder first.

---

## 🗺️ One-Stop Search Map (Quick-Find Table)

| Target Domain | ...Start Here | Why? |
| :--- | :--- | :--- |
| **System State / Next Tasks** | `.gsd/STATE.md` & `.gsd/ROADMAP.md` | Single source of truth for task progress and handoffs. |
| **Header / Main Navigation** | `components/layout/Header.tsx` | Global top navigation for home and docs. |
| **Biochem / Tools Header** | `components/layout/AppHeader.tsx` | Secondary sub-header for all biological tool pages. |
| **Model Data & Detail UI** | `app/model/[...path]/page.tsx` | Primary entry point for viewing metabolic models. |
| **Chemical Formulas** | `components/ui/ChemicalEquation.tsx` | Core component formatting (e.g., `H2O` -> H₂O). |
| **Colors/Theme/Styles** | `lib/theme.ts` | Complete MUI v7 design system (do not use raw CSS). |
| **API Calls (Ref Data)** | `lib/api/biochem.ts` | Solr queries for public biochemical reference data. |
| **API Calls (User Data)** | `lib/api/modelseed.ts` | `modelseed-api` client (Models, Jobs, Media). |
| **Workspace API** | `lib/api/workspace.ts` | JSON-RPC & proxy requests for workspace resources. |
| **Auth Logic & State** | `components/auth/AuthProvider.tsx` | Context/zustand logic handling tokens and sessions. |

---

## 📂 Codebase Geography (Folder Matrix)

### Core Logic (`lib/`) — [README](./lib/README.md)
The "Brain". All external API communication and core app configuration lives here. Always encapsulate network calls in `lib/api/` instead of putting `fetch()` inside UI components.

### UI & Routing (`app/`) — [README](./app/README.md)
The Next.js 16 App Router. Everything here maps directly to a URL.
- `(reference-data)/` — Public biological data (Biochem, Genomes).
- `(user-data)/` — Protected views requiring Auth (My Models, My Jobs, My Media).
- `model/[...path]/`, `fba/[...path]/`, `feature/[...path]/` — Catch-all URLs designed to perfectly match legacy system routes for backward compatibility.

### Reusable UI (`components/`) — [README](./components/README.md)
Stateless or purely presentational UI elements.
- `auth/` — Login/Signup forms and guards.
- `layout/` — Headers, Footers, and shell wrappers.
- `ui/` — Generic components (e.g., Data Grids, Syntax Highlighters).

### deep-dive documentation (`docs/`) — [README](./docs/README.md)
Detailed subsystem manuals. 
- See `docs/ARCHITECTURE.md` for tech stack details.
- See `docs/ROUTING.md` for legacy vs modern URL parity algorithms.

---

## 🏗️ Legacy vs. Modern Parity Matrix

**CRITICAL GSD RULE**: We maintain **100% URL parity** with the legacy AngularJS app. Existing bookmarks and publication citations *must not break*.

| Feature | Legacy System (AngularJS) | Modern System (Next.js 16) |
| :--- | :--- | :--- |
| **Routing** | Client-side `ui-router` | Server-based App Router with `[...path]` |
| **Auth** | KBase Session Cookie | Zustand `useAuth()` + LocalStorage Token |
| **State** | `$scope` & `$rootScope` | React Query + Zustand |
| **Network** | Manual `$http` wrappers | `lib/api/` + `@tanstack/react-query` |

*For full transition rules, see [LEGACY_TRANSITION.md](./docs/LEGACY_TRANSITION.md).*

---

## ⚡ Developer & Agent Quick-Action Checklist

> **When adding a new feature or migrating a legacy route:**
1. **Identify Legacy URL**: Find the exact URL path used in the AngularJS app.
2. **Create Catch-all**: Add a folder in `app/` using `[...path]` to handle arbitrary trailing paths (due to workspace encodings).
3. **Use React Query**: Define your fetch logic in `lib/api/` and use `useQuery` inside your new `page.tsx`.
4. **Style with MUI**: Import components from `@mui/material`. Check `lib/theme.ts` before adding custom hex colors.
5. **Update Roadmap**: Check off your progress in `.gsd/STATE.md` and `.gsd/ROADMAP.md` before committing.

## Repository Information
- **URL**: [https://github.com/VibhavSetlur/ModelSEED-UI](https://github.com/VibhavSetlur/ModelSEED-UI)
- **Production Branch**: `master`
- **Development Branch**: `develop`
