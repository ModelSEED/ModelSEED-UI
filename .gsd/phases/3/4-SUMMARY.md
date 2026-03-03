---
phase: 3
plan: 4
status: complete
---

# Summary 3.4: Projects & Events Pages Implementation

## What Was Done

### Task 1: Implement Projects Hub
- Created `app/projects/page.tsx` as a Server Component with SEO metadata.
- Created `app/projects/projects.module.css` with two-column flex row layout matching legacy `md-content layout="row"`.
- Replicated all content from `ms-projects/home.html`:
  - **Row 1**: Fusions (internal `/projects/fusions`) + KOMODO (external `http://komodo.modelseed.org`)
  - **Row 2**: Bacillus subtilis Regulatory Network (internal `/projects/regulons`) with atomic-regulons.png + MINE Database (external)
  - **Row 3**: Core Metabolic Models (external `http://coremodels.mcs.anl.gov`) with empty flex spacer
- Copied `atomic-regulons.png` from `external/ModelSEED-UI/ms-projects/img/` to `public/img/projects/`.
- Used Next.js `Link` for internal routes, `<a target="_blank">` for external URLs.

### Task 2: Implement Events Hub
- Created `app/events/page.tsx` as a client component (`'use client'`).
- Created `app/events/events.module.css` with event block layout and muted date styling.
- Replicated all content from `ms-projects/events/events.html`:
  - **Latest**: PlantSEED 2018, 2017, 2016 with dates.
  - **Past events toggle**: `useState` hook replaces `ng-init="expand = false"` / `ng-click="expand = !expand"`.
  - **Hidden section**: PlantSEED 2015 conditionally rendered when `expand` is true.
- Used Unicode `▼`/`▲` for toggle indicators.

## Files Created
- `app/projects/projects.module.css`
- `app/events/events.module.css`
- `public/img/projects/atomic-regulons.png` (copied from legacy)

## Files Modified
- `app/projects/page.tsx` (overwritten from placeholder)
- `app/events/page.tsx` (overwritten from placeholder)

## Timestamp Log
- Created: 2026-03-03T16:49:44-06:00
