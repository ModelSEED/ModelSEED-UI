---
phase: 2
plan: 2
wave: 2
updated_at: 2026-03-03T12:51:25-06:00
---

# Plan 2.2: Home Page Build (App Shell + Page Content)

## Objective
Build the ModelSEED Home Page as a pixel-accurate replica of the legacy site. This includes:
1. Shared app shell components (Header/Navbar and Footer) in `components/layout/`
2. Home page content in `app/page.tsx` with its CSS Module
3. All sections: hero with login form, feature grid, mailing list CTA, more info, footer

## Context
- `.gsd/SPEC.md` — Tech stack
- `.gsd/DECISIONS.md` — Scope and approach decisions
- `lib/theme.ts` — MUI theme with legacy color tokens
- `app/globals.css` — Base global styles
- `external/ModelSEED-UI/app/views/home.html` — Source layout
- `external/ModelSEED-UI/app/views/main-toolbar.html` — Navbar source
- `external/ModelSEED-UI/splash/css/splash.css` — Section-specific styles
- `public/img/` — All assets already in place

## Tasks

<task type="auto">
  <name>Create Header (Navbar) component</name>
  <files>
    components/layout/Header.tsx
  </files>
  <action>
    Build a responsive MUI AppBar that replicates `main-toolbar.html`:
    - Dark teal background (#26c6da, matches theme primary)
    - Left: ModelSEED logo image linked to "/"
    - Center nav links: Biochemistry (MUI Button, raised/primary), Team, Publications, Projects, Events, Escher (external link)
    - Right: About link, Sign In button (MUI Button, raised/primary)
    - Use Next.js Link for all internal navigation
    - Use 'use client' since AppBar menus require interactivity
    - Include mobile responsive hamburger menu (MUI Drawer or Menu)
    - All nav links point to their respective app/ routes
  </action>
  <verify>Dev server shows header on all pages. Clicking links navigates without 404.</verify>
  <done>Header renders identically to legacy toolbar with all links functional.</done>
</task>

<task type="auto">
  <name>Create Footer component</name>
  <files>
    components/layout/Footer.tsx
  </files>
  <action>
    Build the footer matching `home.html` lines 384-465:
    - Two-part footer: dark purple upper (#201838), darker bottom (#130E21)
    - 3-column grid:
      1. "Join the Mailing List!" with Mailchimp email form
      2. "On Github!" with circular GitHub icon link
      3. "About ModelSEED" with team link
    - Bottom bar: "Copyright © 2015 ModelSEED"
    - Use MUI Container, Grid, Typography, TextField, Button, IconButton
    - Footer is a server component (no client state needed)
  </action>
  <verify>Footer appears at bottom of every page with correct layout and colors.</verify>
  <done>Footer has 3-column layout, correct colors, and functional links.</done>
</task>

<task type="auto">
  <name>Build Home Page content and integrate shell</name>
  <files>
    app/page.tsx
    app/home.module.css
    app/layout.tsx (update — add Header + Footer to shell)
  </files>
  <action>
    1. Update `app/layout.tsx` to import and render Header above {children} and Footer below.

    2. Create `app/home.module.css` with splash section styles from `splash.css`:
       - header section (white bg #fdfdfd, padding)
       - #about section (grey bg #F1F1F1, teal heading #04A0B5)
       - #about-secondary (dark purple #201838)
       - .about-item (200px inline-block cards)
       - Plant/microbe image positioning
       - section padding (100px 0)
       - .light section (white bg, bottom border)

    3. Build `app/page.tsx` with these sections:
       a. Hero Header — Logo image, "Metabolic Modeling Made Simple.", large Biochemistry button, login form (UI stub), PATRIC/RAST toggle
       b. "What is ModelSEED?" — 6 feature cards (fast, easy, microbes+plants, enabling science, open source, programmatic access) using images from public/img/home/
       c. Mailing list CTA — Dark purple background, Mailchimp form
       d. More Info — Data sources, funding text, citing, Q&A contact links

    All content text is taken directly from `home.html`.
    Use MUI components: Container, Grid, Box, Typography, Button, TextField.
    Mark as 'use client' only if needed (login form state).
  </action>
  <verify>Run `npm run dev` and open localhost:3000. Compare visually with the 4 provided screenshots.</verify>
  <done>Home page renders with all 4 sections visually matching the legacy site. Dev server runs without errors.</done>
</task>

## Success Criteria
- [ ] Header (navbar) renders on every page with correct links and colors
- [ ] Footer renders on every page with 3-column layout
- [ ] Home page has all 4 sections: hero, features, mailing list CTA, more info
- [ ] `npm run dev` starts without errors and localhost:3000 shows the full home page
- [ ] Visual comparison with legacy screenshots confirms fidelity
