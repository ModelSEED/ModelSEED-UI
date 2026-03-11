---
updated_at: 2026-03-03T16:16:00-06:00
---

# GSD Decisions Log

## Phase 2 Decisions

**Date:** 2026-03-03

### Scope
- Phase 2 is scoped to: the **Home Page** (route `/`) only, including the shared application shell (Header/Navbar + Footer) that wraps all pages.
- Does **not** include implementing any linked pages (Team, Publications, Projects, etc.) — buttons and nav links will be rendered but will navigate to placeholder routes.
- Routing scaffolding will be set up so future phases can simply add `app/<route>/page.tsx` files.

### Approach
- **App Shell as Layout**: Header (navbar) and Footer will be React Server Components placed in `app/layout.tsx` (or a nested layout), so they persist across all future page navigations without re-rendering.
- **Home Page as `app/page.tsx`**: The root page component renders the hero/login section, features grid, mailing list CTA, "More Info" section.
- **Routing**: Use Next.js App Router file-system routing. All legacy Angular `ui-router` states map 1:1 to `app/` directories. Next.js `<Link>` replaces `ui-sref`.
- **Styling**: Use MUI components (AppBar, Button, TextField, Container, Grid, Box, Typography) themed via the existing `lib/theme.ts`. Section-specific styles use CSS Modules (e.g., `home.module.css`) for the splash/home page visual fidelity.
- **Assets**: All images already exist in `public/img/` and `public/img/home/`. Icomoon fonts are in `public/icomoon/`.

### Constraints
- No Angular code is reused — only the HTML structure and CSS values are referenced for pixel-accurate reproduction.
- Sign-in form is a UI-only stub for now (no auth integration until Phase 5).
- Mailing list form posts to the existing Mailchimp endpoint (preserved from legacy).

## Phase 3 Decisions

**Date:** 2026-03-03

### Scope
- Phase 3 scope has been updated from just generic "Shared UI Components" to building the four primary header tab landing pages: `/team`, `/publications`, `/projects`, and `/events`.
- Sub-pages (like individual team members `/team/:name` or specific yearly events `/events/plantseed2015`) are currently **excluded** from this initial Phase 3 scope to ensure we focus on the core landing pages first (unless requested otherwise).
- The global `<Header />` will be updated to properly highlight the active tab using Next.js `usePathname()`.

### Approach
- Chose: **Data-Driven (Content Extraction)** for static content.
- Reason: Instead of raw, hardcoded JSX ports of `team.html` and `publications.html`, we will extract content into local JSON objects or arrays (e.g., `lib/data/team.ts`, `lib/data/publications.ts`) and map over them. This maintains exact visual replication while dramatically improving maintainability and code readability.
- Chose: **Client-side Header Navigation** (`"use client"`).
- Reason: To utilize `usePathname()` for active tab highlighting, the header component must be a client component.

### Constraints
- Must achieve exact 1:1 visual fidelity with the legacy Angular site.
- Must use modern MUI v7 components integrated with Next.js App Router, completely replacing old `ngMaterial` wrappers.

## Phase 4 Decisions

**Date:** 2026-03-03

### Scope
- Full implementation of the Biochem tabs: Reactions and Compounds, including their respective detail pages (`/rxn/[id]` and `/cpd/[id]`). 
- Sub-navigation for the other tabs (Public Models, Subsystems, Media) will be built to match the legacy UI, but will remain as "Coming Soon" or empty stubs for now.

### Approach
- **Data Fetching:** Direct client-side fetching using fetching utilities and `@tanstack/react-query` to hit the existing ModelSEED Solr API, preserving the snappy client-side experience of the legacy app. A utility to translate table state to Solr queries (replacing `biochem.js` behavior) will be created.
- **Data Tables:** Since there is a lot of data, we will use `@mui/x-data-grid` (or equivalent robust table) with server-side pagination (translating table state into Solr offset/limit parameters) to match the legacy `ng-table-solr`.

### Constraints
- Search behaves exactly as the legacy UI (custom query parsing for parens, colons, etc.).
- Formatting of columns (deltaG, stoich, aliases with external links) must map 1:1.

## Phase 5 Decisions

**Date:** 2026-03-04

### Scope
- Deferred Fusions, Regulons ("Projects" links) and Escher.
- Two-Header Architecture:
  1. Maintain the current global header (`components/layout/Header.tsx`) for public pages (Home, Team, Publications, Projects, Events, About).
  2. Implement a new contextual App Header (`components/layout/AppHeader.tsx`) specifically for the reference data / user data / build model sections. This header will display the `Reference Data | User Data | Build Model` tabs and a `More` dropdown for public links.
- Implement the Workspace API to bring the non-Solr tables online (Plant Models, Subsystems).
- Rename the `biochem` routes to `reference-data`. The Sub-navigation for reference-data will contain Public Plant Models, Subsystems, Reactions, Compounds, Media.
- Implement Sign-In Gate: Clicking "User Data" or "Build Model" when not authenticated must trigger a sign-in dialog popup (mocked for now) instead of just navigating.

### Approach
- Chose: RESTful POST JSON-RPC to ModelSEED Workspace API `https://p3.theseed.org/services/Workspace` with typed utility hooks.
- Reason: Simplifies authentication logic for future phases, successfully tested live API.

### Constraints
- Must ensure that legacy permalinks like `/rxn/[id]` and `/cpd/[id]` are not broken by the renaming of `app/biochem` to `app/reference-data`.

## Phase 6 Decisions

**Date:** 2026-03-05

### Scope
- Revert/update internal resource links to perfectly match the legacy ModelSEED routes (e.g., changing `/cpd/[id]` to `/biochem/compounds/[id]`, `/rxn/[id]` to `/biochem/reactions/[id]`).
- Restore all hyperlinked columns across Reference Data tabs (Public Plant Models, Subsystems, Reactions, Compounds). 
- If a route doesn't exist yet (e.g., `/genomes/`, `/model/`), the link must still be generated exactly as it was in the legacy UI.
- Ensure 1-to-1 visual matching in tables, particularly regarding vertical list spacing (e.g., multiple Pathways or Features in one cell should stack vertically) and link colors.
- Implement the "Comment" button modal in the Reactions table.
- Implement proper chemical formula rendering for equations and compound formulas.

### Approach
- **Exact Path Replication:** Update next.js `Link` components to formulate `href` attributes that perfectly match legacy `modelseed.org` paths. Rename app routing folders as requested to match the legacy paths (e.g. `app/biochem/compounds/[id]`).
- **DataGrid Formatting:** Utilize `getRowHeight={() => 'auto'}` and custom `renderCell` functions to display arrays as vertically spaced lists in Subsystems/Reactions tables, replicating the legacy styling exactly.
- **Text Parsers:** Implement regex-based formatting for formulas (converting numbers to subscripts) and mapping reaction equations to clickable molecule links.

### Constraints
- Every link, button, vertical spacing, and feature must be identical to the original UI. Priority is absolute visual and structural fidelity.

## Phase 10 Decisions

**Date:** 2026-03-06

### Scope
- Implement Global Search across all Biochemistry Tables with partial hit highlighting (like Google Docs/Search).
- Implement advanced row/column filters (greater than, less than, between, text matches) aligned next to the global search.
- Implement Top-Right Pagination across all Biochemistry tables.
- This goes beyond standard legacy 1:1 fidelity to deeply integrate an enhanced UI experience while remaining visually native.

### Approach
- Chose: **Option A (MUI DataGrid Custom Toolbar + Partially Client/Server filtering)**.
- Reason: Option A seamlessly integrates with the `DataGrid` engine. We will map complex filters into native Solr Query Syntax (`q=*` plus `fq=field:[min TO max]`) inside `lib/api/biochem.ts` for server-side evaluation where appropriate, and apply client-side text highlighting logic via custom `renderCell` functions for the visible page data.
- The `CustomToolbar` will replace the default `DataGrid` header, embedding the global search, filter dropdown, and a mirrored `TablePagination` component docked top-right.

### Constraints
- Solr API strictness: Solr requires URL encoded arrays and explicit `[X TO Y]` boolean operators. `buildSolrUrl` will need an upgrade to parse complex MUI `filterModel` items.

## Timestamp Log
- Updated: 2026-03-03T17:35:00-06:00 - Defined Phase 4 decisions
- Updated: 2026-03-05T09:05:00-06:00 - Defined Phase 6 decisions
- Updated: 2026-03-06T13:05:00-06:00 - Defined Phase 10 decisions
- Updated: 2026-03-11T09:47:00-05:00 - Defined Phase 11 decisions

## Phase 11 Decisions

**Date:** 2026-03-11

### Scope
- **PlantSEED Maintenance**: Temporarily disable the PlantSEED build pipeline functionalities in the UI. We will hide or disable the "Build New Model" buttons/forms for PlantSEED genomes and replace them with a prominent warning banner explaining the migration to v3.0. A global banner will also be added to `/plant` and `/genomes` pages.
- **Proxy All Workspaces**: Create an abstraction over the Workspace API URLs so that the frontend can route all operations (`.ls`, `.get`, etc.) through a new unified API proxy delivered by the backend team, sheltering the frontend from direct direct workspace interactions.
- **Biochemistry Fetching**: Make the Solr biochem service endpoint configurable (as either reading from Solr or José's new API).
- **RAST Job Segregation**: Explicitly keep RAST job polling pointing strictly to `modelseed_support` instead of the new proxy, as requested.

### Approach
- Chose: **Config-Driven Service Routing**.
- Reason: The backend team's new endpoints are actively being developed. Hardcoding direct URLs right now will cause breakage. Creating an abstraction where the base URLs are read from a config file (e.g., `lib/api/config.ts`) allows us to quickly toggle between old/raw endpoints and the new proxy endpoints when José is ready. 

### Constraints
- The UI must handle dual-mode or gracefully degrade when the new proxy endpoints are being fully implemented on the backend.
- Existing functionalities involving `modelseed_support` for async jobs MUST NOT break during the workspace transition.

## Milestone 1 Final Wrap-up Discussion

**Date:** 2026-03-11

### Findings & Remaining Gaps:
- The fundamental UI parity and data table features (Biochem, Public Models) are complete.
- **Data Source Links:** JGI Gene Atlas URL broken during legacy switch (fixed from phytozome.jgi.doe.gov to plantgeneatlas.jgi.doe.gov).
- **Authentication Flow:** Auth modal (`SignInModal`) successfully mocks login to allow accessing protected routes (`/plant`, `/my-models`), preventing a hard block on UI testing, and correctly links to PATRIC/RAST account creation strings. Real token generation and API injection (e.g. passing the Authorization header to `callWorkspaceApi`) remains outstanding since the backend auth proxy is not deployed.
- **User Data Workspaces:** Actual viewing of `/my-models` and saving files is a stub. Requires real auth token passing, which goes hand-in-hand with backend proxy.
- **Model Building Action:** `Build Model` initiates UI rendering but doesn't fire POST requests structurally configured to create async RAST tasks yet.

### Approach to Close Milestone:
- Considered UI-complete for the React transition.
- Next milestone should focus strictly on "Backend Integrations & Authenticated User Data," where `modelseed_support` RAST jobs and proxy routing configurations are fully tied to live JWTs.
