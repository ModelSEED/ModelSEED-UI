---
phase: 3
plan: 2
wave: 1
---

# Plan 3.2: Team Page Implementation

## Objective
Recreate the Team page (`/team`) using Next.js, MUI v7, and a structured static data JSON extractor for maintainability while maintaining 1:1 legacy visual fidelity.

## Context
- `.gsd/SPEC.md`
- `.gsd/DECISIONS.md`
- Original template: `external/ModelSEED-UI/app/views/docs/team.html`
- Asset path: `public/img/team`

## Tasks

<task type="auto">
  <name>Extract Team Data Structure</name>
  <files>
    - `lib/data/team.ts` (new)
  </files>
  <action>
    - Create a TypeScript file exporting an array of team member objects or categories.
    - Category (e.g., 'Principal Investigators', 'Partner Principal Investigators', 'Scientists', 'Post-Doctoral Researchers', 'Developers', 'Graduate Students').
    - Member attributes: `name`, `url` (optional), `role`, `affiliation`, `imageSrc`, `imageHeight`, `imageWidth`.
    - Manually scrape and structure the 20+ members listed in `team.html` into this array.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Structured data is type-checked and ready for `.map()` iteration.</done>
</task>

<task type="auto">
  <name>Implement Team Page UI</name>
  <files>
    - `app/team/page.tsx`
    - `app/team/team.module.css` (new)
  </files>
  <action>
    - Construct the page using Next.js `metadata` for titles/SEO.
    - Iterate over `team.ts` categories.
    - Setup the `layout="row" layout-align="start center"` using MUI's Grid or Flex Box (`display: 'flex', alignItems: 'center'`).
    - Use Next.js `<Image />` or standard `<img>` depending on responsiveness needs (legacy used hardcoded widths/heights like `160`).
    - Integrate `team.module.css` to cover standard element styles (like `.team-member`, `.no-margin`, etc) maintaining exact typography spacing, margin, links (`<a target="_blank">`), and layout as the legacy grid.
  </action>
  <verify>Check page renders error-free by running build or standard browser checking in dev.</verify>
  <done>Visual parity 1:1 with ModelSEED Team Page.</done>
</task>

## Success Criteria
- [ ] Team members rendered via mapped static array dynamically.
- [ ] Profile images, external links, and titles are identically styled.


## Timestamp Log
- Created: 2026-03-03T16:21:00-06:00
