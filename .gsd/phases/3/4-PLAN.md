---
phase: 3
plan: 4
wave: 2
---

# Plan 3.4: Projects & Events Pages Implementation

## Objective
Rebuild the `/projects` and `/events` hubs, replicating the simple layout structures of `ms-projects/home.html` and `ms-projects/events/events.html`.

## Context
- `.gsd/SPEC.md`
- `.gsd/DECISIONS.md`
- Reference template 1: `external/ModelSEED-UI/ms-projects/home.html`
- Reference template 2: `external/ModelSEED-UI/ms-projects/events/events.html`
- Old images mapping: `ms-projects/img/*` -> Must map correctly from `public/ms-projects/img/*` if present (or download/copy).

## Tasks

<task type="auto">
  <name>Implement Projects Hub</name>
  <files>
    - `app/projects/page.tsx`
    - `app/projects/projects.module.css` (new)
  </files>
  <action>
    - Map `ms-projects/home.html`.
    - Create a page with "ModelSEED Projects" heading and standard paragraph text.
    - Set up the grid blocks (`<md-content layout-margin layout="row">...</div>`) into MUI Grid/Flex components (using `Box` or `Stack` or equivalent inline CSS `display: flex`).
    - Build links (using `<Link>` vs `<a>` where appropriate):
       - Internal: `href="/projects/fusions"`, `href="/projects/regulons"`
       - External: `http://komodo.modelseed.org`, `http://minedatabase.mcs.anl.gov`, `http://coremodels.mcs.anl.gov`.
    - Fix missing image references `ms-projects/img/atomic-regulons.png` (can use placeholders if image doesn't exist locally, or verify we copied those in Phase 1).
  </action>
  <verify>npm run check</verify>
  <done>Projects page renders pixel-perfect to old angular `/projects`.</done>
</task>

<task type="auto">
  <name>Implement Events Hub</name>
  <files>
    - `app/events/page.tsx`
    - `app/events/events.module.css` (new)
  </files>
  <action>
    - Since Events page has a dynamic hide/view past events toggle (`ng-init="expand = false"`), make `page.tsx` `"use client"`.
    - Create React state Hook: `[expand, setExpand]`.
    - Render "ModelSEED Related Events" heading.
    - Render Latest events statically (PlantSEED 2018, 2017, 2016).
    - Render "View past events" toggle logic replicating `<i class="fa...caret">` and ternary.
    - If `expand` is true, display the hidden past events block (PlantSEED 2015).
  </action>
  <verify>npm run build</verify>
  <done>Events page dynamic toggling behaves correctly and layout perfectly mimics old site.</done>
</task>

## Success Criteria
- [ ] Users can navigate to `/projects` and see grid content.
- [ ] Users can navigate to `/events` and toggle past event visibility.


## Timestamp Log
- Created: 2026-03-03T16:21:00-06:00
