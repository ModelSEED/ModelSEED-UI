---
updated_at: 2026-03-03T16:21:00-06:00
---

# ModelSEED UI Roadmap

## Phase 1: Foundation (CSS & Assets)
**Status**: ✅ Complete
- Transfer and organize static assets (images, icons, fonts) from the legacy codebase to the new Next.js `public` directory.
- Analyze legacy CSS and setup modern global styles and `ThemeProvider` utilizing `@mui/material`.

## Phase 2: Core Layout and Navigation
**Status**: ✅ Complete
- Implement the main application shell (Header, Footer, Navigation).
- Set up Next.js routing structure (`app` router) based on the legacy site architecture.

## Phase 3: Primary Header Pages & Routing State
**Status**: ✅ Complete
- Rebuild the primary header tab pages (`/team`, `/publications`, `/projects`, `/events`) using modern Next.js and MUI v7 components.
- Implement client-side active tab highlighting within the global Next.js `<Header>`.
- Establish local data-driven patterns (e.g. `lib/data/team.ts`) for managing static content.
- Ensure exact 1:1 visual fidelity and responsiveness with legacy ModelSEED.

## Phase 4: Biochemistry Pages
**Status**: ✅ Complete
- Installed `@tanstack/react-query` and `@mui/x-data-grid` for data fetching and display.
- Created `lib/api/biochem.ts` — full Solr API utility ported from legacy AngularJS service.
- Implemented shared Biochem sub-navigation layout with MUI Tabs.
- Built Reactions DataGrid (`/biochem/reactions`) with all legacy columns, aliases, server-side pagination/sorting/search.
- Built Compounds DataGrid (`/biochem/compounds`) with matching functionality.
- Created Reaction detail page (`/rxn/[id]`) with full property display.
- Created Compound detail page (`/cpd/[id]`) with image, properties, and related reactions table.
- Added redirect routes from `/biochem/reactions/[id]` → `/rxn/[id]` and `/biochem/compounds/[id]` → `/cpd/[id]`.

## Phase 5: Reference Data & Workspace Integration
**Status**: ✅ Complete
- Establish `lib/api/workspace.ts` to interface securely with the ModelSEED JSON-RPC Workspace API.
- Refactor the main Application Header to match the "Reference Data | User Data | Build Model" tabbed UI.
- Rename the `/biochem` module to `/reference-data` to align with the new tab taxonomy.
- Develop the "Public Plant Models" DataGrid pulling live data from `Workspace.ls`.
- Develop the "Subsystems" DataGrid pulling live annotation overview data via `Workspace.get`.
- Develop the "Media" DataGrid pulling live media models via `Workspace.ls`.
- Build placeholder structures for `/user-data` and `/build-model`.

## Timestamp Log
- Updated: 2026-03-03T16:49:44-06:00 - Phase 3 marked complete
- Updated: 2026-03-04T07:52:00-06:00 - Phase 4 marked complete
- Updated: 2026-03-04T08:45:00-06:00 - Phase 5 marked complete
