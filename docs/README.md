# ModelSEED-UI Technical Reference

This is the focused, authoritative technical reference for ModelSEED-UI. It consolidates the former topic files so architecture, API integration, operations, testing, migration guidance, and troubleshooting stay discoverable in one maintained location. The root [README](../README.md) covers project orientation; [CONTRIBUTING.md](../CONTRIBUTING.md) owns release workflow and versioning policy.

## Contents

- [Architecture](#architecture)
- [Authentication](#authentication)
- [Workspace and APIs](#workspace-and-apis)
- [Routing and legacy migration](#routing-and-legacy-migration)
- [Scientific data and atom mapping](#scientific-data-and-atom-mapping)
- [UI integration](#ui-integration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Documentation maintenance](#documentation-maintenance)

## Architecture

### Architecture & Information Flow

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


## Authentication

### Authentication & Security Strategy

> **🤖 AI Agent Quick-Start**
> All downstream API calls to Workspace or `modelseed-api` **require** the raw PATRIC token in the `Authorization` header. Do not prepend `Bearer `. Always use `getStoredAuth()` from `lib/api/auth.ts` to access the token outside of React lifecycle methods.

ModelSEED-UI authenticates against **RAST** and **PATRIC/BV-BRC** services. This document outlines how users are logged in, how tokens are securely managed, and how private routes are guarded.

---

## 🛡️ The Global Auth Provider

**Location:** `components/auth/AuthProvider.tsx`

The application enforces auth state via a React Context. It provides:
- `isAuthenticated` (boolean)
- `user` (string ID)
- `token` (raw authorization string)
- `login()` and `logout()` mutators.

### Storage & Persistence
Tokens are stored **exclusively in `localStorage['auth']`**. We do not use cookies.
The `AuthProvider` listens to cross-tab `storage` events, ensuring that if a user logs out in Tab A, they are immediately stripped of credentials in Tab B.

---

## 🚪 Sign-In Flow

Low-level communication lives in `lib/api/auth.ts`.

1. **User Action:** The user submits credentials via the `SignInModal.tsx` specifying either PATRIC or RAST.
2. **Backend Authentication:**
   - **PATRIC:** `POST https://user.patricbrc.org/authenticate`
   - **RAST:** `POST https://p3.theseed.org/Sessions/Login`
   *Note: Both require `application/x-www-form-urlencoded` payloads.*
3. **Token Resolution:** The response is destructured into an `AuthResult`:
   ```ts
   interface AuthResult {
     user_id: string;
     token: string; // The exact string to pass in network headers
     method: 'PATRIC' | 'RAST';
   }
   ```
4. **Hydration:** `persistAuth()` fires, writing to LocalStorage, and triggering the React Context to re-render the app in an authenticated state.

---

## 💂 Protecting Routes

We enforce privacy using the `<AuthGuard>` wrapper.

**Location:** `components/auth/AuthGuard.tsx`

If an entire page (like `/my-models` or `/my-jobs`) requires authentication, wrap the page's output:

```tsx
export default function ProtectedPage() {
    return (
        <AuthGuard>
            <MySecretDataComponent />
        </AuthGuard>
    );
}
```

**Behavior:**
- Unauthenticated users will see an "Authentication Required" prompt.
- It prevents React Query from firing unauthorized `workspaceGet()` requests and returning 401/403 errors.

### Component-Level Guarding
If a page is public but has private features (e.g., a "Save to My Workspace" button on a public biochemistry page), use the hook:
```tsx
const { isAuthenticated } = useAuth();
<Button disabled={!isAuthenticated}>Save</Button>
```

---

## 📡 Sending Tokens to Backends

When writing new `lib/api/` abstractions, retrieve the token globally and attach it:
```typescript
import { getStoredAuth } from './auth';

export async function fetchMyPrivateData() {
    const auth = getStoredAuth();
    if (!auth) throw new Error("Unauthorized");

    const res = await fetch("...", {
        headers: {
            "Authorization": auth.token // DO NOT prepend 'Bearer'
        }
    });
}
```


## Workspace and APIs

### Workspace & modelseed-api Interaction

> **🤖 AI Agent Quick-Start**
> The application is in a transitional phase between the legacy JSON-RPC Workspace and the new REST `modelseed-api` (Poplar). **Always check** the environment variables `USE_MODELSEED_API` and `USE_NEW_PROXY` to determine which API client to use for user data and workspace operations.

The heart of ModelSEED’s user data (Models, Jobs, Media) and public reference data is the **PATRIC Workspace Service** plus the newer **ModelSEED REST API (`modelseed-api`)**. This document explains the dual-backend architecture and how to interface with them.

---

## 📡 The Two Backends

### 1. Legacy PATRIC Workspace (JSON-RPC)
- **URL**: `https://p3.theseed.org/services/Workspace`
- **Protocol**: JSON-RPC over POST.
- **Client Wrapper**: `lib/api/workspace.ts`
- **Usage**: Historically used for everything. Currently being phased out in favor of the proxy for workspace object retrieval (`workspaceGet`) and directory listing (`workspaceLs`).

### 2. ModelSEED REST API (Poplar)
- **URL**: `MODELSEED_API_URL` (e.g., `http://poplar.cels.anl.gov:8000`)
- **Protocol**: Standard REST (GET/POST/DELETE).
- **Client Wrapper**: `lib/api/modelseed.ts`
- **Usage**: The modern backend for:
  - User Models (`/api/models`)
  - Jobs (`/api/jobs`)
  - User and Public Media (`/api/media`)
  - **Workspace Proxy**: `/api/workspace/*`

---

## 🛠️ Data Fetching Rules

When writing data fetching logic in the context of user data, you **must** use the abstractions in `lib/api/workspace.ts` and `lib/api/modelseed.ts`. Do not write `fetch()` calls manually in UI components.

### Workspace Proxy (`lib/api/workspace.ts`)
This file exports dual-purpose functions. If `USE_NEW_PROXY=true`, it transparently routes JSON-RPC-style requests through the modern REST proxy (`/api/workspace/ls`, `/api/workspace/get`).
- **`workspaceLs(['/path'])`**: Returns directory contents.
- **`workspaceGet(['/path/to/obj'])`**: Returns the raw workspace object. **Crucial**: Use the helper `parseWorkspaceGetObject()` to unwrap the deeply nested tuple/data response.

### ModelSEED API (`lib/api/modelseed.ts`)
This file explicitly calls the modern Poplar endpoints.
- If `USE_MODELSEED_API=false`, UI features depending on these endpoints (like My Models) should gracefully degrade or show an error state.

---

## 🔑 Authentication Rules

Both backends require the exact same authentication token.
- **Header**: `Authorization: <token-string>`
- **Rule**: There is **no** `Bearer ` prefix. Pass the token string exactly as it comes from `getStoredAuth()`.

---

## 🐛 Debugging Workspace Errors

If a workspace call fails:
1. **Check the Network Tab**:
   - Is it hitting `p3.theseed.org` (Legacy) or `poplar.cels.anl.gov` (REST)?
2. **Check the Payload**:
   - JSON-RPC requires an array `[{ paths: [...] }]`.
   - REST proxy expects standard JSON body `{ paths: [...] }`. The wrappers in `lib/api/workspace.ts` handle this transformation automatically.
3. **Permissions Error**: If an `_ERROR_User lacks permission...` occurs, verify the token is present and valid, and ensure the requested workspace path actually belongs to the authenticated user or is explicitly public.


## Routing and legacy migration

### Routing & Legacy Parity Strategy

> **🤖 AI Agent Quick-Start**
> If you are creating a new route that previously existed in the AngularJS app, you **must** ensure the final URL structure matches perfectly. Use Next.js Route Groups `(group-name)` to organize code without affecting the URL.

This document defines the **URL Management Strategy** for ModelSEED-UI.

---

## 🔗 The Problem: Deep Nesting in Workspace Data
In the legacy ModelSEED UI, biological data objects like Models, FBA results, and Genomes were located at paths exactly matching their KBase Workspace location. These paths could be highly dynamic and deeply nested:

- **Legacy URL example**: `modelseed.org/model/user/my_models/folder_A/the_model_name`

## 🚏 The Solution: Catch-all Dynamic Routes
We use the **Next.js 16 Catch-all Routing** pattern (`[...path]`) to capture these dynamic segments and pass them as an array to a single page component.

### Route Mapping Matrix

| Legacy URL Pattern | New Next.js Page Location | Current Status |
| :--- | :--- | :--- |
| `/model/*` | `app/model/[...path]/page.tsx` | ✅ Functional |
| `/fba/*` | `app/fba/[...path]/page.tsx` | ✅ Functional |
| `/gapfill/*` | `app/gapfill/[...path]/page.tsx` | ✅ Functional |
| `/genome/*` | `app/genome/[...path]/page.tsx` | ✅ Functional |
| `/feature/*` | `app/feature/[...path]/page.tsx` | ✅ Functional |
| `/biochem/reactions/:id` | `app/(reference-data)/biochem/reactions/[id]/page.tsx` | ✅ Functional |
| `/data/*` | `app/data/[...path]/page.tsx` | ⚠️ Placeholder (Phase 30) |
| `/compare` | `app/compare/page.tsx` (Unbuilt) | ❌ Missing (Phase 30) |
| `/run/fba` | `app/run/fba/page.tsx` (Unbuilt) | ❌ Missing |

---

## 🛠️ Developer Implementation Protocol

When adding to or modifying catch-all routes:

1. **Folder Naming**: The dynamic folder MUST be named `[...path]`. Do not use `[slug]` or `[id]`.
2. **Accessing Parameters**: The `params` prop MUST be accessed via the standard Next.js 15+ async `use(params)` pattern:

```tsx
'use client';

import { use } from 'react';

export default function WorkspaceObjectPage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const fullWorkspacePath = '/' + resolvedParams.path.join('/');

    // Pass `fullWorkspacePath` to your useQuery hook
}
```

> [!CAUTION]
> **Workspace Paths start with `/`**. The `join('/')` method above does not prepend a slash. Always prepend the `/` before passing the path to the workspace API.

3. **Route Groups**: If you need a shared layout (like the User Data sidebar), wrap the folder in parentheses. Example: `app/(user-data)/my-models/page.tsx`. This keeps the URL as `/my-models`.


## Routing and legacy migration

### Legacy Transition Guide

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
- **New Router:** Create a folder named `app/model/[...path]/` and put your `page.tsx` inside. See the [routing section](#routing-and-legacy-migration).

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


## Scientific data and atom mapping

### Biochemistry & Scientific Data Strategy

> **🤖 AI Agent Quick-Start**
> When dealing with biochemical formulas, stoichiometry, or reaction strings, you **must** use the `<ChemicalEquation>` component. Never render raw chemical strings to the DOM.

This document defines how **Biological Information** (Reactions, Compounds, and Media) is managed, searched, and visualized in the ModelSEED-UI.

---

## 🔬 Scientific Logic: Chemical Equation Presentation

Unlike standard strings, biological data requires strict formatting to be scientifically accurate.

- **Raw String Example**: `(2) cpd00001[0] + cpd00002[0] <=> cpd00003[0] + H2O[0]`
- **Required Render**: `(2) cpd00001[0] + cpd00002[0] ⇌ cpd00003[0] + H₂O[0]`

### The `<ChemicalEquation>` Component
Located at `components/ui/ChemicalEquation.tsx`, this is a specialized React component that employs a regex engine to handle:

1. **Subscript Formatting**: Automatically converts numbers in chemical formulas (like `H2O`) into subscripts (`H₂O`). It explicitly ignores stoichiometric coefficients like `(2)`.
2. **Interactive ID Linking**: Detects `cpd*` and `rxn*` substrings and automatically wraps them in Next.js `<Link>` components pointing to `/biochem/compounds/[id]`.
3. **Compartment Parsing**: Formats or strips `[c]`, `[0]`, `[e]` compartment tags as needed by the UX.

> **Rule:** If you are rendering a `DataGrid` cell or a detail page heading that contains a compound formula or a reaction equation, you must wrap it in `<ChemicalEquation equation={rawString} />`.

---

## 📡 Data Fetching: The Solr Index vs Poplar

Biochemistry reference data (the master list of all known compounds and reactions) is **massive**.
Unlike user-specific Models or Jobs (which use `modelseed-api` via Poplar), Biochemistry tables are powered by a **Solr core**.

### API Client: `lib/api/biochem.ts`
This file contains the wrappers for Solr interaction:
- `getReactions()` and `getCompounds()`
- Handles server-side pagination, regex-based substring filtering from the DataGrid, and field sorting.

> **Rule:** Do not attempt to load the entire compound list into client memory. You must rely on Solr's server-side pagination and search capability via the `biochem.ts` abstractions.

---

## 🔗 External Cross-References (Aliases)

ModelSEED IDs are heavily mapped to other global biological databases. We process "aliases" on detail pages (`app/(reference-data)/biochem/...`).

When rendering aliases, ensure links are generated for:
- **KEGG**: Kyoto Encyclopedia of Genes and Genomes (`C00001`).
- **MetaCyc**: Metabolic pathways and enzymes.
- **BiGG**: Biologically Knowledge-Base Genome-Scale Metabolic Models.

*Consult the format functions inside the compound detail page `page.tsx` for exact URL template injection rules.*


## Scientific data and atom mapping

### Atom Mapping

> **🤖 AI Agent Quick-Start**
> The `#N` numbers in `atom_mapping_data` are **not** RDKit atom indices and **not** SMILES
> atom positions. They are 1-based positions within an element in InChI canonical (Hill)
> order. Resolve them through the InChI structure method described below; never use them as
> renderer indices directly.

This document describes the atom-mapping data published by the ModelSEED biochemistry
Solr index, the precise claims the UI can now make, and the remaining server-side contract
needed to identify a unique atom in every case.

---

## 📦 The data as published

Reaction mappings come from `reactions_staging` on the Poplar Solr host. A mapped reaction
has `has_atom_mapping`, multi-valued `atom_mapping_data`, `atom_mapping_confidence`, and
`atom_mapping_has_symmetry_groups` fields. An entry has this grammar:

```
<entry>    ::= <side> "=" <side>
<side>     ::= <cpdId> ":" <atomRef>
<atomRef>  ::= <single> | "(" <single> (";" <single>)* ")"
<single>   ::= <ElementSymbol> "#" <index>
```

For example, `cpd00009:P#1` and `cpd00012:(O#1;O#2)` refer to one phosphorus and an
interchangeable oxygen set. Relations are symmetric and element-preserving; parenthesised
sets are symmetry groups, not ordered pairings. Relationships may also be many-to-many
across compounds.

`#N` is a **1-based index, per element, per compound, in InChI canonical (Hill) order**.
It is not a SMILES position, RDKit atom index, or RDKit atom-map number. This distinction is
material: for `cpd00009` (H3O4P), RDKit built from stored SMILES orders heavy atoms as
`[O,P,O,O,O]`, while the InChI Hill order is `[O,O,O,O,P]`. Treating `P#1` as a renderer
index would colour a chemically false atom.

The `structures_staging` core at `http://poplar:8983/solr` is the only published raw-InChI
source. Its 45,708 documents expose `id`, `inchi`, `inchikey`, `smiles`, and `svg`; the
compound core exposes only SMILES and InChIKey. Coverage is incomplete: this is about 25% of
180,050 compounds, 15,330 structure documents have no `inchi`, and 8,765 have no `smiles`.
The core is not currently reachable through the public `https://<site>/solr` proxy: both
staging.modelseed.org and modelseed.org return 404. That deployment gap blocks this method
outside a direct Poplar-backed environment.

The stored `svg` is a plain, unhighlighted RDKit depiction. It carries no mapping
information and is used only as a fallback picture when local RDKit cannot render; highlights
are always drawn locally.

---

## ✅ What the UI can resolve

The UI uses the structures core to make a conservative correspondence between canonical atom
references and the RDKit heavy-atom graph built from stored SMILES:

1. It parses the InChI formula layer in Hill order to map each canonical number to an element,
   then parses the `/c` connection layer into a canonical-numbered edge list.
2. It enumerates **all** element-preserving isomorphisms from that canonical graph onto the
   RDKit graph. If an enumeration cap is reached, the result is discarded rather than returned.
3. For canonical atom `i`, `orbit(i)` is the union of every RDKit target of `i` over all
   isomorphisms. It therefore contains the true rendered atom, but can contain
   symmetry-equivalent atoms.
4. For rendered atom `a`, `candidates(a) = { i : a ∈ orbit(i) }`. A mapping group colours
   `a` only when `candidates(a)` is non-empty and is a subset of that group's canonical
   indices. A bond is coloured only when both endpoints are coloured for the same group.

This is deliberately not a guess from SMILES order. In the live sample, 69 of 76 compounds
resolve; only 8 resolve uniquely, with mean orbit size 2.40 and maximum 6. A
symmetry-equivalent result is therefore the common, honest outcome.

### Precision disclosed for every participant

The reaction equation and legend disclose one of four levels per participant:

| Precision | Meaning |
| :--- | :--- |
| `exact-atom` | The safe candidate rule identifies the drawn atom(s) without ambiguity. |
| `symmetry-orbit` | The highlight is restricted to a symmetry-equivalent orbit that contains the true atom, but does not identify one unique atom. |
| `element-block` | The UI can make only a whole-element claim: every reference for that element is in one group and mapped indices are exactly the contiguous set `1..count`. |
| `unresolved` | No safe highlight is made; the UI reports a machine-readable reason. |

No level claims an ordered atom-to-atom pairing that `atom_mapping_data` does not publish.

---

## 📜 Remaining gap: server-side contract for unique identity

The orbit method proves containment, not unique identity: two or more graph-symmetric atoms
can remain indistinguishable. A server-published canonical atom-index map (**Option B**) or
mapped reaction SMILES (**Option C**) is required to collapse that ambiguity.

### Option B — publish a canonical-to-renderer index map

For each structure, backend owners must publish the exact structure string the client is to
render and an atom-index map whose semantics are unambiguous: for every InChI canonical
`Element#N`, it must name the corresponding **0-based atom index in that exact structure
string**. The structure string and map must be generated together and remain paired whenever
the structure changes. A field such as `atom_mapping_index_map` is sufficient only after those
field semantics, indexing base, canonical-order source, and renderer structure are confirmed.

### Option C — publish mapped reaction SMILES

Alternatively, each reaction can publish `reaction_smiles_mapped`: reaction SMILES whose
atoms have stable RDKit atom-map numbers and whose reactant/product map numbers identify the
same atom. Backend owners must confirm that those numbers are authoritative for the displayed
structures and preserve the mapping semantics. This form also publishes bond fate directly.

Until either contract is available, the four-level disclosure above is the most precise claim
the UI makes. The structures-core method safely narrows highlights; it does not convert a
symmetry class into a unique identity.

---

## 🔗 Where this lives in the code

| Concern | File |
| :--- | :--- |
| Structures-core client | `lib/api/structures.ts` |
| Structures collection configuration | `lib/api/config.ts` |
| InChI Hill-order and connection parsing | `lib/utils/inchiAtomOrder.ts` |
| Isomorphism orbits and safe mapping colours | `lib/utils/atomOrbitColors.ts` |
| Local highlights, bonds, graph disclosure, and SVG fallback | `components/ui/MoleculeRenderer.tsx` |
| Structures query, precision disclosure, legend, and error notice | `components/ui/ReactionStructureEquation.tsx` |


## UI integration

### DataControlHeader integration map

This document lists every place the shared toolbar (`components/layout/DataControlHeader.tsx`) is mounted and how each grid applies search, column filters, sorting, and pagination.

## Toolbar capabilities

- **Quick search** — writes `filterModel.quickFilterValues` (debounced). Highlighting uses the CSS Custom Highlight API where supported; `GridHighlightText` also reads quick-filter terms.
- **Filter and columns** — single column filter row (Community DataGrid limit) plus visibility toggles. Operators depend on column `type` (string, number, boolean, date).
- **Pagination** — toolbar `TablePagination` is the primary control; grids that use this toolbar should set **`hideFooter`** so the default DataGrid footer does not duplicate pagination.

## Page-by-page behavior

| Location | Data source | Grid modes | Notes |
|----------|-------------|------------|--------|
| `app/(reference-data)/biochem/reactions/page.tsx` | Solr | `paginationMode`, `sortingMode`, `filterMode`: **server** | Quick search and column filters are translated in `lib/api/biochem.ts` (`buildSolrUrl`). |
| `app/(reference-data)/biochem/compounds/page.tsx` | Solr | server | Same as reactions. Compound Solr schema has no `ontology` query field; ontology column is not server-filterable. |
| `app/(reference-data)/list-media/page.tsx` | modelseed-api or workspace | **client** (all rows loaded) | Quick search and filters run on loaded rows. |
| `app/(reference-data)/genomes/page.tsx` | API / static list | **client** | Same pattern. |
| `app/(reference-data)/genomes/Annotations/page.tsx` | Client data | **client** | Same pattern. |
| `app/(user-data)/my-models/page.tsx` | modelseed-api / workspace | **client** | `hideFooter` set. |
| `app/(user-data)/myMedia/page.tsx` | workspace | **client** | `hideFooter` set. |
| `app/(user-data)/my-jobs/page.tsx` | Client job list | **client** | `hideFooter` set. |
| `app/model/[...path]/page.tsx` | Model sub-tabs | **client** or **server** (lazy tabs) | Per-tab configuration; uses `hideFooter` where the toolbar controls paging. |
| `app/genome/[...path]/page.tsx` | Loaded genome object | **client** | `hideFooter` on both grids. |
| `app/gapfill/[...path]/page.tsx` | Loaded gapfill solution | **client** | `hideFooter`. |
| `app/fba/[...path]/page.tsx` | FBA results | **client** | `hideFooter` on reaction, exchange, and pathway map grids. |
| `components/build-model/PatricGenomesTable.tsx` | PATRIC / BV-BRC API | **server** when only quick search; **client batch** when column filters active | Quick search maps to RQL. Column filters are not expressible in RQL; when a column filter is active, the table fetches up to 5000 rows, then applies `filterDocsByGridModel` / `sortGridDocsLocally` from `lib/api/biochem.ts` and paginates in memory. |
| `components/build-model/RastGenomesTable.tsx` | modelseed-api list | **client** | All rows loaded; full toolbar semantics on in-memory data. |
| `components/ui/ReactionKnockoutsDialog.tsx` | In-memory reactions | **client** | `hideFooter`. |

## REST biochem helpers (not used by public biochem routes)

`getReactionsFromModelseedApi` / `getCompoundsFromModelseedApi` apply quick search, optional local refinement, column filters, sort, and slice in `fetchModelseedApiBiochem`. See code comments for fetch caps and `numFound` semantics.

## Verification

- Biochem Solr: `tests/e2e/datacontrol-header.spec.ts`, `tests/e2e/biochem/*.spec.ts`, `tests/unit/api/biochem.test.ts`.
- REST biochem batch path: `tests/unit/api/biochem-rest-filtering.test.ts`.
- Local filter helper: `filterDocsByGridModel` test in `tests/unit/api/biochem.test.ts`.

## Timestamp Log

- Created: 2026-05-04 12:15:00 UTC — Initial inventory and behavior notes.
- Updated: 2026-05-04 12:20:00 UTC — Documented PATRIC local filter batch, toolbar search sync pattern, and E2E additions.


## Deployment

### Deployment Configuration

This document describes every environment variable consumed by the ModelSEED UI,
how they are resolved at runtime, and how to configure them for different environments.

---

## Quick Start

```bash
cp .env.example .env.local
# Edit .env.local to match your environment, then:
npm run dev
```

---

## Deployment Mode

The `NEXT_PUBLIC_DEPLOYMENT_MODE` variable selects which set of endpoint defaults
the application uses. It is the **primary switch** that controls all URL resolution.

| Value        | Behavior |
| :----------- | :------- |
| `staging`    | All endpoints resolve to `staging.modelseed.org` subdomains. **Default when unset.** |
| `production` | All endpoints resolve to `modelseed.org` subdomains. |
| `manual`     | Disables automatic resolution. Every URL override must be set explicitly. The app will throw at startup if any required override is missing. |

**Default:** `staging` (when the variable is unset or empty)

**Required:** No. The app defaults to `staging` automatically. Only set this to `production` or `manual` if you need a different behavior. Invalid non-empty values will cause a startup error.

**Important:** When switching between staging and production, you do not need to
touch any of the individual URL variables. The mode defaults in `.env.example`
(and the hardcoded fallbacks in `lib/api/config.ts`) handle everything.

---

## Resolution Algorithm (for all URL variables)

Every URL-type variable follows a strict three-tier resolution order:

```
1. Override (highest precedence)
   e.g. NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

2. Mode-specific default
   e.g. NEXT_PUBLIC_API_BASE_URL_STAGING=https://staging.modelseed.org/PMS

3. Hardcoded fallback in lib/api/config.ts
   e.g. ${MODELSEED_SITE_BASE_URL}/PMS
```

The app checks tier 1 first. If it is empty, tier 2 is consulted. If that is also
empty (or the variable is not set), the code in `lib/api/config.ts` applies a
computed fallback derived from the site base URL.

**You only need to set the override tier (`NEXT_PUBLIC_X`) when you want to
deviate from the deployment mode defaults.** For standard staging or production
deployments, leave all override variables **blank** and rely on the mode defaults.

---

## Environment Variable Reference

### `NEXT_PUBLIC_DEPLOYMENT_MODE`

Controls which mode-default set is active.

- **Values:** `staging` | `production` | `manual`
- **Default:** `staging`
- **Required:** No. Defaults to `staging` when unset.

---

### Base URLs (no trailing slash)

#### `NEXT_PUBLIC_SITE_BASE_URL` -- Required in manual mode, otherwise optional

The base origin for the ModelSEED website. All other URL fallbacks derive from this.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `staging=https://staging.modelseed.org` / `production=https://modelseed.org`
- **Hardcoded fallback:** `SITE_DEFAULTS` in `lib/api/config.ts` (`staging=https://staging.modelseed.org` / `production=https://modelseed.org`)

#### `NEXT_PUBLIC_API_BASE_URL` -- Required in manual mode, otherwise optional

Base URL for the modelseed-api (Poplar) service.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `staging=https://staging.modelseed.org/PMS` / `production=https://modelseed.org/PMS`
- **Fallback:** `{MODELSEED_SITE_BASE_URL}/PMS`
- **Common local setup:** `http://localhost:8000` (via Poplar SSH tunnel)

#### `NEXT_PUBLIC_REST_BASE_URL` -- Required in manual mode, otherwise optional

Base URL for the legacy ModelSEED REST v0 API.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `staging=https://staging.modelseed.org/api/v0` / `production=https://modelseed.org/api/v0`
- **Fallback:** `{MODELSEED_SITE_BASE_URL}/api/v0`

#### `NEXT_PUBLIC_STATUS_API_URL` -- Required in manual mode, otherwise optional

Status endpoint used by the `/about/version` page for build and service checks.

- **Override:** Required in manual mode; when set explicitly, use `{MODELSEED_SITE_BASE_URL}/PMS/api/health`
- **Mode defaults:** `staging=https://staging.modelseed.org/PMS/api/health` / `production=https://modelseed.org/PMS/api/health`
- **Fallback:** `{MODELSEED_SITE_BASE_URL}/PMS/api/health`

---

### Solr Configuration

#### `NEXT_PUBLIC_SOLR_BASE_URL` -- Required in manual mode, otherwise optional

Shared base URL for the Solr search backend. Trailing slash is normalized at runtime.

Solr is not deployed per-site. A single instance at `modelseed.org/solr` hosts both
core sets -- `reactions`/`compounds`/`structures` and their `*_staging` twins -- so
staging and production share this base URL and differ only in the collection names.
`staging.modelseed.org/solr` is an older, separate deployment still on the pre-Solr-9
flat schema (no nested child documents, no `atom_mapping`); it is not a valid target
for this build.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `NEXT_PUBLIC_SOLR_BASE_URL_STAGING=https://modelseed.org/solr/` / `NEXT_PUBLIC_SOLR_BASE_URL_PRODUCTION=https://modelseed.org/solr/`
- **Fallback:** `https://modelseed.org/solr/`

#### `NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL` -- Optional in every mode

Base URL for only the reactions corpus. When unset, it inherits the shared Solr base URL.

- **Override:** `NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL`
- **Mode defaults:** `NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_STAGING` / `NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_PRODUCTION`
- **Fallback:** `NEXT_PUBLIC_SOLR_BASE_URL` resolution; mode-suffixed values are ignored in manual mode

#### `NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL` -- Optional in every mode

Base URL for only the compounds corpus. When unset, it inherits the shared Solr base URL.

- **Override:** `NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL`
- **Mode defaults:** `NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_STAGING` / `NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_PRODUCTION`
- **Fallback:** `NEXT_PUBLIC_SOLR_BASE_URL` resolution; mode-suffixed values are ignored in manual mode

#### `NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL` -- Optional in every mode

Base URL for only the structures corpus. When unset, it inherits the shared Solr base URL.

- **Override:** `NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL`
- **Mode defaults:** `NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_STAGING` / `NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_PRODUCTION`
- **Fallback:** `NEXT_PUBLIC_SOLR_BASE_URL` resolution; mode-suffixed values are ignored in manual mode

#### `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION` -- Required in manual mode, otherwise optional

Solr core name for the reactions collection.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_STAGING=reactions_staging` / `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_PRODUCTION=reactions`
- **Fallback:** `reactions_staging` (staging) / `reactions` (production)

#### `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION` -- Required in manual mode, otherwise optional

Solr core name for the compounds collection.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_STAGING=compounds_staging` / `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_PRODUCTION=compounds`
- **Fallback:** `compounds_staging` (staging) / `compounds` (production)

#### `NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION` -- Optional in manual mode

Solr core name for the structures collection. It remains optional in manual mode to keep pre-existing manual-mode deployments working.

- **Override:** Optional in every mode
- **Mode defaults:** `NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_STAGING=structures_staging` / `NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_PRODUCTION=structures`
- **Fallback:** `structures_staging` (staging) / `structures` (production); `structures` in manual mode

#### `NEXT_PUBLIC_SOLR_NESTED_SCHEMA` -- Optional

Controls whether reactions and compounds use Solr-9 nested-document queries.

- **When unset:** Auto-detects by a one-time probe per collection.
- **Values:** `true` / `1` forces Solr-9 nested-document queries (parent documents only); `false` / `0` forces legacy flat behavior.
- **Failure behavior:** A non-OK response or failed probe falls back to legacy flat queries.

#### `SOLR_PROXY_UPSTREAM` -- Server-only, optional

Server-only (no `NEXT_PUBLIC_` prefix) and never sent to the browser. When set, `next.config.ts` registers the rewrite `/solr/:path*` to `${SOLR_PROXY_UPSTREAM}/:path*`; when unset or empty, no proxy route exists. This makes a relative base such as `/solr/` work.

- **Internal hosts:** `http://poplar:8983/solr` is an internal host for development/internal deployments only and must never be used as a public production value.

---

### Feature Flags (optional)

#### `NEXT_PUBLIC_USE_MODELSEED_API`

Enables the modelseed-api (Poplar) proxy for workspace operations. When `false`,
the legacy Workspace URL (`https://p3.theseed.org/services/Workspace`) is used.

- **Values:** `true` | `false`
- **Default:** `true`

#### `NEXT_PUBLIC_USE_NEW_PROXY`

Enables the new proxy layer for backend services. When `false`, certain services
(ProbModelSEED, Workspace) fall back to their legacy endpoints.

- **Values:** `true` | `false`
- **Default:** `true`

---

### ProbModelSEED URL (optional)

#### `NEXT_PUBLIC_PROBMODELSEED_URL`

Override for the ProbModelSEED API endpoint. No trailing slash.

- **When `NEXT_PUBLIC_USE_NEW_PROXY=true` and this is empty:** Resolves to `{SITE_BASE_URL}/api/model`
- **When `NEXT_PUBLIC_USE_NEW_PROXY=false`:** This is ignored; the legacy URL is used instead.

---

### RDKit.js URL (optional)

#### `NEXT_PUBLIC_RDKIT_BASE_URL`

Override for self-hosted RDKit.js assets. No trailing slash.

- **When empty:** RDKit.js loads from the unpkg CDN (`https://unpkg.com/@rdkit/rdkit@{VERSION}/dist`).
- **When set:** Must point to a directory containing `RDKit_minimal.js` and `RDKit_minimal.wasm`.
  Example for self-hosting via the `/public` directory: `/rdkit`

**Note:** Next.js serves files under `public/` at the site root, so `public/rdkit` maps to the URL `/rdkit`, not `/public/rdkit`.

---

### Build Metadata (displayed on /about/version)

These values are injected at build time by CI/CD and do not affect runtime behavior.
They are safe to leave blank for local development.

| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_GIT_VERSION` | Semantic version string |
| `NEXT_PUBLIC_GIT_BRANCH` | Git branch name |
| `NEXT_PUBLIC_GIT_COMMIT` | Git commit SHA |
| `NEXT_PUBLIC_DEPLOY_DATE` | Deployment date string |

---

### Test Credentials (optional)

#### `PATRIC_TOKEN`

PATRIC authentication token for integration testing. Obtain from
<https://p3.theseed.org/user/authenticate>.

Not required for application functionality.

---

## Scenarios

### Standard Staging Deployment

Set only the deployment mode. Everything else resolves automatically:

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=staging
```

### Standard Production Deployment

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=production
```

### Local Development (Poplar Tunnel)

Start a tunnel, then override the API base URL:

```bash
ssh -L 8000:localhost:8000 YOUR_USERNAME@poplar.cels.anl.gov
```

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=staging
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Complete Custom (Manual Mode)

Set every URL explicitly:

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=manual
NEXT_PUBLIC_SITE_BASE_URL=https://my-custom-host.example.com
NEXT_PUBLIC_API_BASE_URL=https://my-custom-host.example.com/PMS
NEXT_PUBLIC_REST_BASE_URL=https://my-custom-host.example.com/api/v0
NEXT_PUBLIC_STATUS_API_URL=https://my-custom-host.example.com/PMS/api/health
NEXT_PUBLIC_SOLR_BASE_URL=https://my-custom-host.example.com/solr/
NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION=reactions
NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION=compounds
```

### Pointing Biochemistry at a Different Solr (legacy, Solr 9, or temporary)

**Legacy / do nothing.** Leave every Solr override empty. The shared mode default applies, and the nested-schema probe falls back to legacy; this is the zero-configuration state.

```env
# Leave all NEXT_PUBLIC_SOLR_* and SOLR_PROXY_UPSTREAM values empty
```

**New Solr 9, whole site.** Set the shared base (or its active mode variant) and collection names for the new instance.

```env
NEXT_PUBLIC_SOLR_BASE_URL=https://solr.example.org/solr/
NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION=reactions
NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION=compounds
NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION=structures
```

**One corpus only / temporary instance.** Set only the base for the corpus being moved; the other corpora continue using the shared legacy base.

```env
NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL=https://solr.example.org/solr/
NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION=structures
```

**Internal upstream via the built-in proxy.** Set the server-only upstream to an internal URL and use `/solr/` as the shared or per-corpus base.

```env
SOLR_PROXY_UPSTREAM=http://internal-host:8983/solr
NEXT_PUBLIC_SOLR_BASE_URL=/solr/
```

`NEXT_PUBLIC_*` values are inlined at build time, so restart a dev server and rebuild a deployed application for changes to take effect; `SOLR_PROXY_UPSTREAM` is read when the Next.js configuration loads, so it also requires a restart.

---

## Runtime Configuration Code

All URL resolution logic lives in:

- **`lib/api/config.ts`** -- Defines `resolveModeValue()`, `resolveDeploymentMode()`,
  and exports all resolved URL constants (`MODELSEED_SITE_BASE_URL`,
  `MODELSEED_API_URL`, `MODELSEED_REST_URL`, `SOLR_BASE_LEGACY`, etc.).
- **`lib/rdkit.ts`** -- Handles `NEXT_PUBLIC_RDKIT_BASE_URL` with an unpkg fallback.

---

## Switching Between Environments

To change the target environment after the app is running:

1. Update `NEXT_PUBLIC_DEPLOYMENT_MODE` in `.env.local`
2. Restart the dev server (`npm run dev`) or rebuild (`npm run build`)
3. Verify on the `/about/version` page that the correct endpoints are shown

**Note:** `.env.local` changes require a full server restart. HMR does not pick up
environment variable changes.

## Testing

### Testing Platform

> **Quick Reference**
> - Tests Location: `tests/` directory
> - Unit Tests: `tests/unit/` (Vitest)
> - E2E Tests: `tests/e2e/` (Playwright) - 59 comprehensive tests
> - API Tests: `scripts/api-test.mjs` - Direct endpoint testing
> - CI/CD: `.github/workflows/ci.yml`

This document covers the testing infrastructure that enables safe JavaScript framework updates and catches regressions before they reach users.

---

## Testing Stack

| Layer | Tool | Speed | Coverage |
|-------|------|-------|---------|
| **Unit Tests** | Vitest | < 1s | Utility functions, API clients |
| **API Tests** | Node.js | 5-10s | Direct endpoint validation |
| **E2E Tests** | Playwright | 30-60s | Critical user workflows (59 tests) |

### Why This Stack?

- **Vitest**: Native ESM support, 2-3x faster than Jest, official Next.js 16 recommendation
- **Playwright**: GitHub-native integration, professional-grade browser automation
- **happy-dom**: Better ESM compatibility than jsdom for Next.js 16

---

## Available Commands

```bash
# Unit tests (watch mode)
npm test

# Unit tests (single run)
npm run test:run

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with browser UI
npm run test:e2e:ui

# API smoke tests
npm run test:poplar-smoke
```

---

## Test Organization

### Unit Tests (`tests/unit/`)

Tests for individual functions and modules in isolation.

```
tests/unit/
├── api/
│   ├── auth.test.ts         # loginPatric, loginRast, token handling
│   ├── biochem.test.ts      # Solr compound/reaction queries
│   ├── modelseed.test.ts    # Model, Media, Job API calls
│   └── workspace.test.ts    # Workspace ls/get operations
└── utils/
    └── exportCsv.test.ts    # CSV generation utilities
```

### E2E Tests (`tests/e2e/`)

Browser-based tests that verify complete user workflows.

```
tests/e2e/
├── auth.spec.ts             # PATRIC/RAST login flow
├── browse-models.spec.ts    # My Models page navigation
├── build-model.spec.ts      # Plant model builder
├── media-workflow.spec.ts   # Media editor
├── model-detail.spec.ts     # Model detail tabs
└── run-fba.spec.ts         # FBA analysis
```

---

## Writing Tests

### Unit Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('@/lib/api/external', () => ({
  fetchData: vi.fn(),
}));

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something specific', () => {
    const result = someFunction(input);
    expect(result).toBe(expected);
  });
});
```

### API Integration Test Pattern

```typescript
describe('API Feature', () => {
  let isApiAvailable = true;

  beforeAll(async () => {
    try {
      await actualApiCall();
    } catch (e) {
      isApiAvailable = false;
    }
  });

  it('should work when API available', async () => {
    if (!isApiAvailable) return;  // Graceful skip
    const result = await actualApiCall();
    expect(result).toBeDefined();
  });
});
```

### E2E Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Auth setup if needed
    await page.goto('/');
  });

  test('should complete workflow', async ({ page }) => {
    await page.click('[data-testid="action"]');
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The test workflow (`.github/workflows/test.yml`) runs on:

| Event | Unit Tests | E2E Tests |
|-------|------------|-----------|
| Pull Request | Yes | No |
| Push to `develop` | Yes | Yes |
| Push to `master` | Yes | Yes |

### Required Secrets

| Secret | Description |
|--------|-------------|
| `PATRIC_TOKEN` | PATRIC authentication token for E2E tests |

### Coverage Enforcement

Coverage thresholds are set in `vitest.config.ts`:

```typescript
thresholds: {
  lines: 10,      // Currently 10%, increase as tests grow
  functions: 10,
  branches: 10,
  statements: 10,
}
```

---

## Environment Configuration

### Development

```bash
# Local development with tests
npm run test:run

# With coverage
npm run test:coverage

# E2E with browser UI
npm run test:e2e:ui
```

### CI Environment Variables

```yaml
NEXT_PUBLIC_USE_MODELSEED_API: 'true'
NEXT_PUBLIC_API_BASE_URL: 'http://poplar.cels.anl.gov:8000'
PATRIC_TOKEN: ${{ secrets.PATRIC_TOKEN }}
```

---

## Best Practices

### Security

1. **Never commit tokens** - Use environment variables only
2. **Skip on missing secrets** - Tests should handle missing `PATRIC_TOKEN`
3. **No sensitive data** - Use test accounts with limited access

### Test Design

1. **One assertion per test** - Each test should verify one thing
2. **Descriptive names** - Test names should describe expected behavior
3. **Arrange-Act-Assert** - Structure tests clearly
4. **Fast feedback** - Keep unit tests under 100ms

### API Tests

1. **Graceful degradation** - Skip tests when APIs unavailable
2. **Real responses** - Test against actual API responses when possible
3. **Error handling** - Verify error paths work correctly

---

## Troubleshooting

### Tests Pass Locally But Fail in CI

1. Verify `PATRIC_TOKEN` is set in GitHub secrets
2. Check environment variables match local setup
3. Review Playwright browser installation logs

### E2E Tests Timeout

1. Increase timeout: `await expect(locator).toBeVisible({ timeout: 30000 })`
2. Check network connectivity in CI
3. Verify dev server starts correctly

### Coverage Below Threshold

1. Add more tests for untested code paths
2. Increase threshold gradually as test suite grows
3. Focus on critical paths first (API clients, auth)

---

## Related Documents

- [Architecture](#architecture) - System architecture and API clients
- [Authentication](#authentication) - Auth system details
- [Workspace and APIs](#workspace-and-apis) - Workspace API
- `tests/README.md` - Quick reference for test commands


## Testing

### Testing Instructions for Production Issues Fix

## Overview
This document provides testing instructions for validating the v3.0.0 production fixes.

## Prerequisites
Before testing, ensure you have:
1. ✅ Development server running: `npm run dev`
2. ✅ SSH tunnel active: `ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov`
3. ✅ Environment configured in `.env.local`:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   PATRIC_USERNAME=your_username
   PATRIC_PASSWORD=your_password
   ```

## Test 1: Version Number Display

### Steps:
1. Navigate to `http://localhost:3000/about/version`
2. Observe the version number at the top of the page

### Expected Result:
- ✅ Version displays as **v3.0.0** (not v0.1.3 or v0.1.0)
- ✅ Version matches package.json (3.0.0)

### Status:
- ✅ **VERIFIED**: Version updated in both package.json and display page

---

## Test 2: Compound Structure Images on Reaction Pages

### Steps:
1. Navigate to `http://localhost:3000/biochem/reactions/rxn00001`
2. Scroll down to the "Equation" section
3. Look for "Compound Structures" section below the equation

### Expected Result:
- ✅ Section labeled "Compound Structures" appears below the equation
- ✅ Structure images display for compounds in the equation
- ✅ Each image has the compound ID (e.g., cpd00001) below it
- ✅ Clicking an image navigates to the compound detail page
- ✅ Clicking the compound ID navigates to the compound detail page
- ✅ Missing images are hidden gracefully (no broken image icons)
- ✅ Images have hover effect (slight shadow and lift)

### Additional Test Cases:
- `rxn00002` - Different reaction equation
- `rxn00005` - More complex equation
- Test reactions with compounds that may not have images

### Status:
- ⏳ **PENDING SSH TUNNEL**: Requires backend connection to test
- ✅ **CODE VERIFIED**: Implementation complete with proper error handling

---

## Test 3: Media Tab Population

### Steps:
1. Ensure SSH tunnel is active
2. Navigate to `http://localhost:3000/list-media`
3. Wait for the page to load

### Expected Result:
- ✅ Media items appear in the table
- ✅ Columns show: Name, Type, isDefined, isMinimal
- ✅ No timeout errors in browser console
- ✅ Table is paginated with 25 items per page
- ✅ Clicking a row navigates to media detail page

### Fallback Test (Without ModelseedAPI):
1. Update `.env.local`: `NEXT_PUBLIC_USE_MODELSEED_API=false`
2. Restart dev server
3. Navigate to `/list-media`
4. Should still show media from workspace API

### Status:
- ⏳ **PENDING SSH TUNNEL**: Requires backend connection to test
- ✅ **CODE VERIFIED**: Implementation uses correct API endpoint

---

## Test 4: SSH Tunnel Documentation

### Steps:
1. Open `README.md`
2. Navigate to "Running Tests" → "Prerequisites" section
3. Read SSH tunnel instructions

### Expected Result:
- ✅ SSH tunnel command is documented
- ✅ Explanation of why tunnel is needed
- ✅ Instructions to keep terminal open
- ✅ Environment variable documentation included

### Additional Checks:
1. Check "Troubleshooting" section in README
2. Verify the [Troubleshooting](#troubleshooting) section exists
3. Read through troubleshooting scenarios

### Status:
- ✅ **VERIFIED**: Documentation complete and comprehensive

---

## Test 5: Version Page Endpoint Status

**Note**: This test requires SSH tunnel to be active.

### Steps:
1. Ensure SSH tunnel is running
2. Navigate to `http://localhost:3000/about/version`
3. Scroll to the API Endpoint Status table

### Expected Result:
- ✅ All endpoints show "OK" status (green checkmarks)
- ✅ No "error" indicators
- ✅ Response times displayed for each endpoint

### Without SSH Tunnel:
- ⚠️ Endpoints show "error" - This is expected and documented

### Status:
- ⏳ **PENDING SSH TUNNEL**: Requires backend connection to test
- ✅ **DOCUMENTED**: README explains this behavior

---

## Test 6: Invalid Gapfill URL Handling

### Steps:
1. Navigate to an incomplete gapfill URL:
   - `http://localhost:3000/gapfill/seaver/modelseed`
   - `http://localhost:3000/gapfill/user`

### Expected Result:
- ✅ Page loads without 404 error
- ✅ Shows "No gapfill reactions found" message
- ✅ No error in browser console
- ✅ Page is functional (not broken)

### Valid URL Test:
1. Navigate to complete gapfill URL (if you have one):
   - `http://localhost:3000/gapfill/seaver/modelseed/MyModel/gf.0`

### Expected Result:
- ✅ Page loads normally
- ✅ Shows gapfill reactions (if backend is available)

### Status:
- ✅ **VERIFIED**: Code includes `isValidGapfillPath()` validation

---

## Test 7: Build and Type Checks

### Steps:
```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Unit tests
npm run test:run
```

### Expected Result:
- ✅ TypeScript: No errors
- ✅ Lint: No new errors (pre-existing warnings OK)
- ✅ Build: Succeeds with no errors
- ✅ Tests: 60+ tests pass (API tests may skip without SSH tunnel)

### Status:
- ✅ **VERIFIED**: All checks passed
  - TypeScript: ✅ Clean
  - Lint: ✅ 1 acceptable warning (img vs Image)
  - Build: ✅ Successful
  - Tests: ✅ 60 passed, 5 skipped (no tunnel)

---

## Test 8: NPM Security Audit

### Steps:
```bash
npm audit --omit=dev
```

### Expected Result:
- ✅ Output: "found 0 vulnerabilities"

### Status:
- ✅ **VERIFIED**: 0 vulnerabilities confirmed

---

## Test 9: RAST vs PATRIC Account Behavior

**This is to verify documentation, not test for a bug.**

### Steps:
1. Read [Troubleshooting](#troubleshooting) → "Different models/media between RAST and PATRIC accounts"
2. Read CHANGELOG.md → "Expected Behaviors" section

### Expected Documentation:
- ✅ States this is **expected behavior**, not a bug
- ✅ Explains RAST and PATRIC use separate workspace folders
- ✅ Clarifies same username on both systems shows different data

### Status:
- ✅ **VERIFIED**: Properly documented in multiple locations

---

## Regression Testing

### Critical User Flows to Verify:
1. **Model Building**:
   - ✅ Plant model build page loads
   - ✅ Form fields work
   - ✅ Validation functions

2. **My Models**:
   - ✅ My Models page loads
   - ✅ Table displays (may be empty without auth)
   - ✅ No JavaScript errors

3. **Biochem Tables**:
   - ✅ Reactions list: `/biochem/reactions`
   - ✅ Compounds list: `/biochem/compounds`
   - ✅ Detail pages work

4. **Navigation**:
   - ✅ All nav links work
   - ✅ No 404 errors on valid routes

### Status:
- ✅ **VERIFIED**: No regressions detected in build/test

---

## Summary Checklist

### Completed ✅
- [x] Version updated to 3.0.0
- [x] SSH tunnel documentation added
- [x] Troubleshooting guide created
- [x] Compound structure images implemented
- [x] Invalid gapfill URL validation added
- [x] CHANGELOG updated
- [x] RAST/PATRIC behavior clarified
- [x] NPM audit clean (0 vulnerabilities)
- [x] TypeScript compiles cleanly
- [x] Build succeeds
- [x] Unit tests pass (60+)

### Requires SSH Tunnel for Full Validation ⏳
- [ ] Media tab population
- [ ] Version page endpoint status
- [ ] Reaction page compound images (live data)
- [ ] Full E2E test suite

### Production Readiness
- ✅ **Code Quality**: Production-ready
- ✅ **Documentation**: Comprehensive
- ✅ **Security**: No vulnerabilities
- ✅ **Testing**: All possible tests without SSH tunnel completed
- ⏳ **Live Backend Tests**: Pending SSH tunnel access

---

## Notes for QA Team

1. **SSH Tunnel is Required**: Many features require the SSH tunnel to be active. Set it up first before testing backend-dependent features.

2. **Expected Behaviors**:
   - Media tab being empty without SSH tunnel is EXPECTED
   - Different data between RAST/PATRIC is EXPECTED
   - Some compounds may not have structure images - this is OK

3. **Test Environment**:
   - Use `.env.local` for configuration
   - Ensure `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` when using tunnel
   - Keep SSH tunnel terminal open during testing

4. **Known Limitations**:
   - See `issues.md` for documented backend API limitations
   - These are not frontend bugs and cannot be fixed from the UI

5. **Browser Console**:
   - Check console for errors during testing
   - Some CORS warnings from Solr are expected in development
   - API timeout errors without SSH tunnel are expected

---

## Contact

If you encounter issues not covered in this document:
- Check [Troubleshooting](#troubleshooting)
- Review `issues.md` for known backend limitations
- Verify SSH tunnel is active
- Check environment variable configuration


## Troubleshooting

### Troubleshooting Guide

This guide covers common issues encountered during development and deployment of the ModelSEED-UI application.

## Table of Contents

- [Backend Connection Issues](#backend-connection-issues)
- [Authentication Issues](#authentication-issues)
- [Data Display Issues](#data-display-issues)
- [Build and Development Issues](#build-and-development-issues)
- [Testing Issues](#testing-issues)

---

## Backend Connection Issues

### Version Page Shows Endpoints as "Error"

**Symptoms:**
- Visit `/about/version` page
- API endpoint status shows "error" for all endpoints
- Red error indicators in status table

**Root Cause:** SSH tunnel to Poplar API server is not active.

**Solution:**

1. **Start SSH Tunnel:**
   ```bash
   ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
   ```

2. **Keep Terminal Open:** The tunnel must remain active while developing. If you close the terminal, the tunnel dies and endpoints become unavailable.

3. **Verify Connection:**
   ```bash
   curl http://localhost:8000/health
   # Should return: 200 OK with health status JSON
   ```

4. **Check Environment Variable:**
   In `.env.local`:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

5. **Restart Dev Server:** After changing `.env.local`, restart:
   ```bash
   # Ctrl+C to stop, then:
   npm run dev
   ```

---

### Media Tab is Empty (`/list-media`)

**Symptoms:**
- Navigate to `/list-media` page
- No media items appear in the table
- May see timeout errors in console
- Loading spinner never completes

**Root Cause:** Backend API not responding (usually SSH tunnel not active).

**Solution:**

1. **Check SSH Tunnel:** See "Version Page Shows Endpoints as Error" above.

2. **Test API Directly:**
   ```bash
   # With tunnel active, should return JSON array of media
   curl http://localhost:8000/api/media/public
   ```

3. **Check Feature Flags:**
   In `.env.local`, verify:
   ```bash
   NEXT_PUBLIC_USE_MODELSEED_API=true
   NEXT_PUBLIC_USE_NEW_PROXY=true
   ```

4. **Try Workspace Fallback:**
   If API is down, can fall back to legacy workspace:
   ```bash
   NEXT_PUBLIC_USE_MODELSEED_API=false
   ```
   Then restart dev server.

5. **Check Network Tab:**
   - Open browser DevTools → Network tab
   - Refresh `/list-media` page
   - Look for failed requests to `/api/media/public`
   - Check response status and error messages

---

### Cannot Connect to SSH Tunnel

**Symptoms:**
- SSH command hangs or fails
- "Connection refused" or "Host key verification failed"

**Solution:**

1. **Verify Network Access:**
   ```bash
   ping poplar.cels.anl.gov
   ```

2. **Check SSH Key:**
   ```bash
   ssh-add -l  # List loaded keys
   ssh-add ~/.ssh/id_rsa  # Add your key if needed
   ```

3. **Test Basic SSH Connection:**
   ```bash
   ssh user@poplar.cels.anl.gov
   # Should connect without tunnel first
   ```

4. **Check Port Availability:**
   ```bash
   lsof -i :8000  # See if port 8000 is already in use
   # If in use, kill the process or use a different port
   ```

5. **Use Alternative Port:**
   ```bash
   ssh -L 8001:localhost:8000 user@poplar.cels.anl.gov
   # Then update .env.local:
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
   ```

---

## Authentication Issues

### Login Fails with PATRIC or RAST Credentials

**Symptoms:**
- Enter username/password
- Get "Authentication failed" error
- Cannot access user data pages

**Possible Causes:**
1. Incorrect credentials
2. Network connectivity to auth servers
3. Auth server temporarily down
4. SSH tunnel required for some auth flows

**Solution:**

1. **Verify Credentials:**
   - Try logging in at https://www.patricbrc.org/
   - Try logging in at https://rast.nmpdr.org/
   - Confirm credentials work on official sites first

2. **Check Network Connectivity:**
   ```bash
   curl https://p3.theseed.org/services/auth/login
   # Should return a response (may be error about missing params, that's OK)
   ```

3. **Use Developer Bypass (Testing Only):**
   For local development without real auth:
   - Username: `developer`
   - Password: `developer`
   - Returns fixed token, doesn't hit real auth servers
   - **WARNING:** Only for local testing, not for production

4. **Check Console Errors:**
   - Open browser DevTools → Console
   - Look for specific error messages
   - Check Network tab for failed auth requests

---

### Different Models/Media Between RAST and PATRIC Accounts

**Symptom:** Same username shows different models/media lists when logging into RAST vs PATRIC.

**This is EXPECTED BEHAVIOR, not a bug.**

**Explanation:**
- RAST and PATRIC are **separate systems** with different workspace folders
- A PATRIC user cannot access RAST workspace data and vice versa
- Even with the same username, they point to different underlying directories
- Your RAST models live in the RAST workspace
- Your PATRIC models live in the PATRIC workspace
- There is no synchronization between the two systems

**Solution:** None needed. Choose the appropriate auth system for the data you want to access.

---

## Data Display Issues

### Reaction Page Missing Compound Structures

**Symptoms:**
- Navigate to reaction detail page (e.g., `/biochem/reactions/rxn00001`)
- See equation text but no compound structure images

**Possible Causes:**
1. Images not loaded yet (check for loading errors)
2. Compound IDs not parsed from equation
3. Image files don't exist for some compounds

**Solution:**

1. **Check Browser Console:**
   - Look for 404 errors loading compound images
   - Some compounds may not have images (expected)

2. **Verify Image URLs:**
   Images should load from:
   ```
   https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/{cpdID}.png
   ```

3. **Check Equation Format:**
   The compound ID parser expects format: `cpd00001`, `cpd12345`, etc.
   If equation uses different format, images won't load.

4. **Network Issues:**
   Test if image CDN is accessible:
   ```bash
   curl -I https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/cpd00001.png
   # Should return 200 OK or 404 (if compound has no image)
   ```

---

### Model Data Shows N/A for Equations or Gene Functions

**Symptoms:**
- Model detail page shows "N/A" for reaction equations
- Gene functions column is empty
- Organism/Taxonomy not saved

**This is a KNOWN BACKEND LIMITATION, not a frontend bug.**

**Documented Issues:**
1. **Equation column shows N/A** - Equations not returned in model data response
2. **Gene functions missing** - Not returned by model API
3. **Organism/Taxonomy not saved** - Reconstruct endpoint limitation

**Solution:** These require backend (`modelseed-api`) fixes. See `issues.md` for full documentation of known API limitations.

---

### Duplicate Model Rows in My Models

**Symptom:** Same model appears multiple times in "My Models" table.

**This is a KNOWN BACKEND LIMITATION.**

**Cause:** API returns same model multiple times in response.

**Workaround:** Use the first occurrence. This will be fixed in a future backend update.

---

## Build and Development Issues

### TypeScript Errors After Update

**Symptoms:**
- `npm run dev` shows TypeScript errors
- `npx tsc --noEmit` reports type errors

**Solution:**

1. **Clean and Reinstall:**
   ```bash
   rm -rf .next
   rm -rf node_modules
   rm -rf tsconfig.tsbuildinfo
   npm install
   ```

2. **Check TypeScript Version:**
   ```bash
   npm list typescript
   # Should match version in package.json
   ```

3. **Regenerate Type Definitions:**
   ```bash
   npx tsc --noEmit
   # Will show specific errors with file and line numbers
   ```

---

### Build Fails with Next.js Errors

**Symptoms:**
- `npm run build` fails
- Errors about server components, client components, or hydration

**Solution:**

1. **Clear Build Cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

2. **Check for Missing `'use client'` Directives:**
   - Components using hooks (useState, useEffect, etc.) need `'use client'` at top
   - Check error message for specific file

3. **Check for Async Component Issues:**
   - Server components can be async
   - Client components cannot be async
   - Verify proper component designation

4. **Verify Environment Variables:**
   ```bash
   # Build-time vars must be in .env.local or passed to build command
   npm run build
   ```

---

### Linter Errors or Warnings

**Symptoms:**
- `npm run lint` shows errors
- Many ESLint warnings

**Solution:**

1. **Auto-Fix What's Possible:**
   ```bash
   npm run lint -- --fix
   ```

2. **Check Specific Files:**
   ```bash
   npm run lint -- path/to/file.tsx
   ```

3. **Review ESLint Config:**
   Check `eslint.config.mjs` for rule configuration.

4. **Legacy Warnings:**
   Note: The codebase may have some pre-existing warnings that are not blockers. Focus on errors in your changes.

---

## Testing Issues

### E2E Tests Fail or Hang

**Symptoms:**
- `npm run test:e2e` hangs
- Playwright tests timeout
- Authentication failures in tests

**Solution:**

1. **Ensure Prerequisites:**
   ```bash
   # Terminal 1: Dev server
   npm run dev

   # Terminal 2: SSH tunnel
   ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov

   # Terminal 3: Run tests
   npm run test:e2e
   ```

2. **Check Test Credentials:**
   In `.env.local`:
   ```bash
   PATRIC_USERNAME=your_username
   PATRIC_PASSWORD=your_password
   ```

3. **Run in Headed Mode (Debug):**
   ```bash
   npm run test:e2e:ui
   # Opens Playwright UI for debugging
   ```

4. **Check Specific Test:**
   ```bash
   npx playwright test tests/e2e/auth.spec.ts
   # Run one test file at a time
   ```

---

### Unit Tests Fail

**Symptoms:**
- `npm run test:run` shows failures
- Vitest errors

**Solution:**

1. **Run Tests in Watch Mode:**
   ```bash
   npm run test
   # Interactive mode, shows errors in real-time
   ```

2. **Check Test Files:**
   ```bash
   npm run test -- path/to/test.test.ts
   # Run specific test file
   ```

3. **Update Snapshots (if needed):**
   ```bash
   npm run test -- -u
   # Updates snapshots if UI changed intentionally
   ```

4. **Check Coverage:**
   ```bash
   npm run test:coverage
   # See which code is covered by tests
   ```

---

### CORS Errors with Solr

**Symptom:** Browser console shows CORS errors when fetching from `modelseed.org/solr`.

**This is EXPECTED in test environment.**

**Explanation:**
- Solr endpoint doesn't allow CORS from `localhost`
- Production build on correct domain works fine
- Tests handle CORS errors gracefully

**Workaround:** Tests that hit Solr should be run with proper production domain or mocked.

---

## Getting Help

If issues persist after trying these solutions:

1. **Check Known Issues:** See [`issues.md`](../issues.md) for documented backend limitations
2. **Review Architecture:** See [Architecture](#architecture) for system design
3. **Check Workspace Docs:** See [Workspace and APIs](#workspace-and-apis) for API details
4. **Check Logs:** Look at browser console and terminal output for specific errors
5. **Ask for Help:** Provide:
   - Exact error message
   - Steps to reproduce
   - Browser and OS information
   - Whether SSH tunnel is active
   - Environment variable configuration

---

## Quick Reference

### Essential Commands

```bash
# Start development
npm run dev

# SSH tunnel (keep running)
ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov

# Test connection
curl http://localhost:8000/health

# Run tests
npm run test:run         # Unit tests
npm run test:e2e         # E2E tests (requires tunnel)

# Build
npm run build
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint
npm run lint -- --fix    # Auto-fix
```

### Essential Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MODELSEED_API=true
NEXT_PUBLIC_USE_NEW_PROXY=true
PATRIC_USERNAME=your_username
PATRIC_PASSWORD=your_password
```

### Port Usage

- **3000**: Next.js dev server (`npm run dev`)
- **8000**: SSH tunnel to Poplar API (via `ssh -L 8000:localhost:8000`)
- **51204**: Vitest UI (if running `npm run test:ui`)
- **Various**: Playwright test servers (ephemeral)


## Documentation maintenance

### Documentation Editing Protocol

> **🤖 AI Agent Instructions**
> When asked to create new features or architectural changes, you MUST update this documentation library before marking the task complete.

This guide acts as the strict standard operating procedure for how to use, write, and extend the ModelSEED-UI documentation located within `docs/`.

---

## 📖 The Architecture of Documentation

To ensure high-quality and search-ready text, follow this strict taxonomy:

This file is the authoritative technical reference. Keep related invariants in the existing sections rather than creating one-file manuals for routine subsystem work.

**Do Not Create Clutter.**
When a major subsystem changes, update the relevant section here with its constraints, exact code paths, API/component contract, and cross-links. Add a new focused document only when the content cannot remain navigable in this reference.

---

## ✍️ Documentation Update Protocol

Whenever a new subsystem or major component refactor occurs:

1. **Update the relevant section**
    - Define *what* changed and *why* the business or scientific constraint exists.
    - Map exact paths in `app/`, `components/`, and `lib/`.
    - Expose the API or component contract needed for future integration.
2. **Maintain navigation**
    - Add or revise a table-of-contents entry when a substantial new section is needed.
    - Cross-link related anchors (for example, authentication, workspace, or routing).
3. **Keep the reference current**
    - Remove definitions for retired dependencies, endpoints, and stale logic.

---

## 🔥 Style & Content Principles

For human and AI scannability, execute the following writing standards:

- **Assume High-Context Readers**: Write for senior developers or specific AI agents. Skip introductory filler text.
- **Show Code Paths, Not Prose**: Factual and strict syntax. Use backticks for paths (`` `app/(user-data)/my-models/page.tsx` ``). Provide code architecture snippets if they establish a core pattern.
- **Document Current State, Not History**: This `docs/` library defines **how the system currently behaves**, not how it got here.
- **Actionable Callouts**: Use formatted blockquotes `> **Note**` to flag dangerous regressions or legacy invariants.

---

## ✅ The "Before Merge" Checklist

If you change the codebase layout, data fetching architecture, or add new APIs:

1. **[  ] Relevant Section Updated**: Does the major feature have its constraints and code paths recorded here?
2. **[  ] Table of Contents Updated**: Is a substantial new section discoverable from the contents list?
3. **[  ] URL Parity Verified**: If routing changed, did you document the legacy versus modern path in the routing section?
4. **[  ] Accuracy Check**: Did you remove definitions of removed dependencies, unused endpoints, or stale logic?

**Rule of Thumb:**
If a developer (or an AI agent) cannot press `Ctrl+Shift+F` across the workspace and immediately find the file responsible for an obscure scientific algorithm or legacy URL mapping via these documents, the documentation is incomplete.
