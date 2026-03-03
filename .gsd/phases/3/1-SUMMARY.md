---
phase: 3
plan: 1
status: complete
---

# Summary 3.1: Active Tab Navigation in App Shell

## What Was Done

### Task 1: Convert Header to Client Component
- Header was already `'use client'` from Phase 2.
- Added `usePathname` import from `next/navigation`.
- Created `isActive(href)` helper that checks `pathname.startsWith(href)`.
- Applied to all nav items: `/team`, `/publications`, `/projects`, `/events`, `/about`.

### Task 2: Implement Legacy Active Class Styling
- Extracted exact legacy CSS from `external/ModelSEED-UI/css/core.css` (lines 460-463):
  ```css
  ul.about-toolbar > li:hover,
  ul.about-toolbar > li.active {
      border-bottom: 3px solid #EBEBEB;
  }
  ```
- Mapped this to MUI `sx` props: active tabs get `borderBottom: '3px solid #EBEBEB'`, inactive get `'3px solid transparent'` (prevents layout shift).
- Hover state also applies the same bottom border.
- Text color matched to legacy `#EBEBEB`.
- `borderRadius: 0` ensures the bottom border renders as a clean line.

## Files Modified
- `components/layout/Header.tsx`

## Timestamp Log
- Created: 2026-03-03T16:36:14-06:00
