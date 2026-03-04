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

## Timestamp Log
- Updated: 2026-03-03T17:35:00-06:00 - Defined Phase 4 decisions


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
