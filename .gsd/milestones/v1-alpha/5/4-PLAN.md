---
phase: 5
plan: 4
---

# Plan 5.4: Media DataGrid & Skeleton Auth-Gated Routes

## Objective
Implement the Media tab inside Reference Data and set up layout skeletons for the User Data and Build Model sections.

## Details
1. **Media DataGrid (`app/(app)/reference-data/media/page.tsx` or similar path)**:
   - Use `workspaceLs(['/chenry/public/modelsupport/media'])`.
   - The endpoint returns ~523 media formulations.
   - Set up columns: Name (index 0), Minimal? (index 7 hash 'isMinimal'), Defined? (index 7 hash 'isDefined'), Type (index 7 hash 'type'). Use properties from index 7 (metadata).

2. **Build Skeleton Protected Routes**:
   - Create `app/user-data/page.tsx`. Provide a simple coming-soon or structural layout matching legacy `app/views/my-models.html` headers (e.g. My Models | My Media sub-tabs).
   - Create `app/build-model/page.tsx`. Provide a simple layout matching legacy `app/views/data/plant.html` (e.g. UPLOAD Plants FASTA | UPLOAD Microbes FASTA tabs).
   - Because you added the `SignInModal` intercept to the App Header in Plan 5.2, users ostensibly shouldn't be able to easily browse to these without triggering the prompt via the header, but since we're mocking auth, if they type the URL, just let the mockup render a nice placeholder for now. 

## Acceptance Criteria
- [ ] `/reference-data/media` successfully fetches from Workspace API and renders the Media DataGrid.
- [ ] `/user-data` renders a standalone page containing a skeleton UI placeholder (e.g. "My Models" and "My Media" tabs).
- [ ] `/build-model` renders a standalone page containing a skeleton UI placeholder (e.g. "Plant FASTA" and "Microbe FASTA" tabs).

## Timestamp Log
- Created: 2026-03-04 08:35:00 -06:00
