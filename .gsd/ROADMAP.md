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

## Phase 6: Reference Data UI Fidelity & Formatting
**Status**: ✅ Complete
- Revert/update internal resource links to perfectly match the legacy ModelSEED routes (e.g., changing `/cpd/[id]` to `/biochem/compounds/[id]`).
- Restore all hyperlinked columns across Reference Data tabs.
- Ensure 1-to-1 visual matching in tables, particularly vertical list spacing (e.g., Subsystems/Reactions arrays).
- Implement the "Comment" button modal in the Reactions table.
- Implement proper chemical formula rendering for equations and compound formulas.

## Phase 7: User Workspace Implementation
**Status**: ✅ Complete
- Transition the `User Data` section from a placeholder to a functional workspace.
- Implement "My Models" DataGrid (`/my-models`).
- Implement "My Media" DataGrid (`/myMedia`).
- Build the "Build New Model" wizard skeleton in (`/plant`).
- Implement the "Model Detail" page to handle routes like `/model/plantseed/plantseed/...` using Next.js catch-all routing.

## Phase 8: Frontpage Links, Subscription, & About Page
**Status**: ✅ Complete
- Clean up the PATRIC/RAST login and account creation URLs to use functional links.
- Remove the obsolete subscription section from the homepage.
- Replace the bug report message with a "Contact Us" `mailto:` link.
- Rebuild the `/about` page to port legacy AngularJS content to Next.js using MUI layout.

## Phase 9: Events Pages & Escher Integration
**Status**: ✅ Complete
- Build all the individual link pages for events (e.g., PlantSEED 2018, 2017, 2016, 2015). The main event page is built, but these subpages are missing.
- Review legacy code in `external/ModelSEED-UI/escher/escher_builder.html` and transition methodologically so the Escher HTML link functions properly.

## Phase 10: Advanced Biochem Table Actions
**Status**: ⏳ Pending
- Implement global search with highlighting (like Google Docs) across all Biochemistry DataGrids.
- Integrate advanced column/row multi-filters (>, <, between, text matches) docked next to the global search.
- Implement top-right pagination directly synced with MUI DataGrid across all reference data tables.
- Upgrade `lib/api/biochem.ts` to parse complex mathematical filtering safely translating to Solr syntax.

## Timestamp Log
- Updated: 2026-03-03T16:49:44-06:00 - Phase 3 marked complete
- Updated: 2026-03-04T07:52:00-06:00 - Phase 4 marked complete
- Updated: 2026-03-04T08:45:00-06:00 - Phase 5 marked complete
- Updated: 2026-03-05T09:06:00-06:00 - Added Phase 6
- Updated: 2026-03-05T09:32:00-06:00 - Phase 6 marked complete
- Updated: 2026-03-05T14:02:00-06:00 - Phase 7 marked complete
- Updated: 2026-03-05T14:26:00-06:00 - Added Phase 8
- Updated: 2026-03-05T14:25:50-0600 - completed Phase 8 tasks
- Updated: 2026-03-06T12:35:00-06:00 - Added Phase 9
- Updated: 2026-03-06T12:48:00-06:00 - Phase 9 marked complete
- Updated: 2026-03-06T13:06:00-06:00 - Added Phase 10
