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

## Phase 4: Page Implementation
- Recreate individual pages (Home, Data Views, Tools, etc.) using the shared components and Next.js App Router.

## Phase 5: State and Data Integration
- Integrate `zustand` for global application state.
- Set up `@tanstack/react-query` to interface securely with the modern backend.

## Timestamp Log
- Updated: 2026-03-03T16:49:44-06:00 - Phase 3 marked complete
