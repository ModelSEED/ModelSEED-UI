---
phase: 1
plan: 2
wave: 2
updated_at: 2026-03-03T09:00:36-07:59
---

# Plan 1.2: Core CSS & MUI Theme Setup

## Objective
Analyze legacy CSS and bootstrap overrides, and implement them as a global MUI v7 `ThemeProvider` along with minimal global CSS to match the original style identically.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- external/ModelSEED-UI/css/core.css
- app/layout.tsx
- app/globals.css

## Tasks

<task type="auto">
  <name>Extract Theme Variables</name>
  <files>lib/theme.ts</files>
  <action>
    Analyze `external/ModelSEED-UI/css/core.css` components (colors, typography, spacing) and translate into an MUI theme object in `lib/theme.ts`.
    - Identify primary, secondary colors, and background shades.
    - Set up the MUI typography config using the legacy fonts (e.g., icomoon integration, standard web fonts used).
  </action>
  <verify>cat lib/theme.ts</verify>
  <done>`lib/theme.ts` exists and exposes a valid MUI `createTheme` object containing the core app styling.</done>
</task>

<task type="auto">
  <name>Apply MUI Theme Provider</name>
  <files>app/layout.tsx, app/globals.css</files>
  <action>
    Implement `<ThemeProvider>` inside `app/layout.tsx` (using Next.js App Router compatible setups such as the AppRouterCacheProvider if necessary for MUI v7).
    - Insert global overrides (baseline, resets) that couldn't fit cleanly into the MUI Theme into `app/globals.css`.
  </action>
  <verify>grep "ThemeProvider" app/layout.tsx</verify>
  <done>The Next.js root layout successfully wraps the `children` with the constructed MUI ThemeProvider.</done>
</task>

## Success Criteria
- [ ] `lib/theme.ts` exports a tailored MUI theme matching the legacy visual style.
- [ ] The Next.js layout implements this theme globally.
