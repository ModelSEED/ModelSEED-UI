---
updated_at: 2026-03-03T13:15:11-06:00
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

## Phase 3: Shared UI Components
- Rebuild common UI components (buttons, cards, forms, data tables) using MUI v7.
- Ensure visual fidelity with the legacy design system.

## Phase 4: Page Implementation
- Recreate individual pages (Home, Data Views, Tools, etc.) using the shared components and Next.js App Router.

## Phase 5: State and Data Integration
- Integrate `zustand` for global application state.
- Set up `@tanstack/react-query` to interface securely with the modern backend.
