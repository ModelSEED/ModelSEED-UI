---
phase: 5
plan: 1
---

# Plan 5.1: Workspace API Service & Route Refactor

## Objective
Establish the connection to the ModelSEED Workspace API and transition the `/biochem` routes to the broader `/reference-data` taxonomy as requested in the UI mockup.

## Details
1. **Create `lib/api/workspace.ts`**:
   - Define types for Workspace API responses (e.g., `WorkspaceMeta`, JSON-RPC requests/responses).
   - Implement `workspaceLs(paths: string[])` which maps to the "Workspace.ls" RPC method.
   - Implement `workspaceGet(objects: string[])` which maps to the "Workspace.get" RPC method.
   - Use the endpoint: `https://p3.theseed.org/services/Workspace`.

2. **Route Refactoring**:
   - Rename `app/biochem` directory to `app/reference-data`.
   - Update `app/reference-data/page.tsx` to redirect to `/reference-data/plants` (the first tab, or maybe Reactions). Legacy often defaulted to Reactions, but "Public Plant Models" is first in the list. Redirect to `/reference-data/reactions` for now to maintain parity with legacy default.
   - Update `app/reference-data/layout.tsx` tabs to include:
     - Public Plant Models (`/reference-data/plants`)
     - Subsystems (`/reference-data/subsystems`)
     - Reactions (`/reference-data/reactions`)
     - Compounds (`/reference-data/compounds`)
     - Media (`/reference-data/media`)
   - Update `/rxn/[id]` and `/cpd/[id]` back links to point back to `/reference-data/reactions` and `/reference-data/compounds`.
   - Add backwards-compatible redirects in `next.config.js` or via `page.tsx` components (from `/biochem/reactions` to `/reference-data/reactions`, etc) so we don't break existing permalinks.

## Acceptance Criteria
- [ ] `lib/api/workspace.ts` exports typed helper functions for the Workspace JSON-RPC API.
- [ ] Changing the URL from `/biochem/reactions` to `/reference-data/reactions` successfully renders the Reactions page and highlights the "Reactions" tab.
- [ ] Old `/biochem/reactions` correctly points to the new route.

## Timestamp Log
- Created: 2026-03-04 08:30:00 -06:00
