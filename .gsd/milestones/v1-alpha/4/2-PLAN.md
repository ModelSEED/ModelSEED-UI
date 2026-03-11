---
phase: 4
plan: 2
wave: 2
---

# Plan 4.2: Biochem Sub-Navigation & Layout

## Objective
Implement a shared layout for the `/biochem` routes to mirror the legacy secondary navigation (toolbar tabs) for "Public Plant Models", "Subsystems", "Reactions", "Compounds", and "Media".

## Context
- `external/ModelSEED-UI/app/views/biochem/biochem.html`
- Route matching: Legacy uses `ui-sref="app.biochem({chem: 'reactions'})"` etc. We'll use Next.js matching paths.

## Tasks

<task type="auto">
  <name>Create Shared Biochem Layout</name>
  <files>app/biochem/layout.tsx</files>
  <action>
    - Ensure `layout.tsx` renders a sub-navigation bar using MUI (e.g., `Tabs`, `Box`, `AppBar`).
    - Include Tabs for: Public Plant Models, Subsystems, Reactions, Compounds, Media.
    - Active tab behavior: Match against current route using `usePathname()`.
    - Reactions (`/biochem/reactions`) and Compounds (`/biochem/compounds`) tabs must link to fully fledged pages.
    - Other tabs can navigate to stub routes/placeholders for now matching identical legacy layout (dark purple background, white active text).
  </action>
  <verify>Check visually via browser after saving.</verify>
  <done>Biochem routes render a custom submenu toolbar matching legacy visuals.</done>
</task>

<task type="auto">
  <name>React Query Provider</name>
  <files>app/layout.tsx or a Provider component</files>
  <action>
    - Create a client `Providers` component wrapping children in `QueryClientProvider` to allow using `useQuery` globally within the app client components.
    - Insert the provider in the root layout.
  </action>
  <verify>Check that app doesn't crash on load and Provider is in DevTools.</verify>
  <done>React Query client is successfully wrapped around the application.</done>
</task>

## Success Criteria
- [ ] Sub-navigation renders successfully on Biochem routes.
- [ ] Active tab state correctly reflects current location.
- [ ] `QueryClientProvider` wraps the app to support future data fetching.

## Timestamp Log
- Created: 2026-03-03 17:28:00 -06:00
