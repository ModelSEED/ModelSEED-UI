---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Active Tab Navigation in App Shell

## Objective
Convert the current static Next.js `<Header>` component into a client component to support active path highlighting for the primary navigation tabs. Replicate the legacy `active` CSS logic used for tabs in ModelSEED-UI.

## Context
- `.gsd/SPEC.md`
- `.gsd/DECISIONS.md`
- `components/layout/Header.tsx`
- Legacy reference: `external/ModelSEED-UI/app/views/main-toolbar.html` (Lines 16-36 showing `ng-class="{ active: ... }"`)
- Legacy reference CSS: Focus on `.about-toolbar li.active a` or similar rules.

## Tasks

<task type="auto">
  <name>Convert Header to Client Component</name>
  <files>
    - `components/layout/Header.tsx`
  </files>
  <action>
    - Add `"use client";` to the top of `Header.tsx`.
    - Import `usePathname` from `next/navigation`.
    - Compute if a given tab is active by checking if `pathname.startsWith('/team')`, etc.
    - Specifically checking: `/team`, `/publications`, `/projects`, `/events`, and `/about`.
    - Do NOT change the background color of the Header (`#2D224E`).
  </action>
  <verify>npm run build</verify>
  <done>Header compiles without errors and successfully applies active styling using `usePathname`.</done>
</task>

<task type="auto">
  <name>Implement Legacy Active Class Styling</name>
  <files>
    - `components/layout/Header.tsx`
  </files>
  <action>
    - Implement or map the legacy CSS logic for `.active` tabs.
    - In the old app, the `<li>` gets the `.active` class.
    - In MUI, adjust the `Link` or wrapper `Box` style when `isActive` is true to mimic the legacy highlighted state. Use MUI `sx` or inline styled-components as appropriate. (For example, legacy active tabs often had a semi-transparent white background or a specific border).
    - Maintain 1:1 visual styling.
  </action>
  <verify>npm run build</verify>
  <done>Active tabs highlight identically to the legacy ModelSEED site.</done>
</task>

## Success Criteria
- [ ] Header handles navigation state dynamically.
- [ ] Currently selected route is visually distinct and matches legacy design.


## Timestamp Log
- Created: 2026-03-03T16:21:00-06:00
