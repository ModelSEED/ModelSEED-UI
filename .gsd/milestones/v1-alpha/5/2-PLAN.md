---
phase: 5
plan: 2
---

# Plan 5.2: Dual-Header Architecture & Sign-In Modal

## Objective
Implement a contextual "App Header" specifically for the internal data tools (`/reference-data`, `/user-data`, `/build-model`) while preserving the existing public "Home Header" for the marketing/info pages. Create a sign-in dialog prompt for protected links.

## Details
1. **Create `components/layout/SignInModal.tsx`**:
   - Implement an MUI `<Dialog>` component mocking the PATRIC/RAST sign-in interface.
   - For now, clicking "Sign In" simply closes the dialog (we will integrate real authentication in a later phase).
   - This modal needs to be triggerable via a global state or via context/props from the Header. To keep it simple, you can use a Zustand store or React Context, OR just have the `AppHeader` mount it natively with standard internal state.

2. **Create `components/layout/AppHeader.tsx`**:
   - Model this after `external/ModelSEED-UI/app/views/toolbar.html`.
   - The left side has the ModelSEED Logo pointing back to `.`.
   - Next to the logo, three primary tabs: `Reference Data`, `User Data`, `Build Model`.
   - Ensure the `Reference Data` tab is highlighted when the user is under the `/reference-data` routes (or `/rxn`, `/cpd`).
   - Clicking `User Data` or `Build Model` when unauthenticated MUST open the `SignInModal` instead of navigating.
   - The right side has a "More" dropdown containing links to: About, Version, Events, Related Projects.
   - The right side also has a standalone `Sign In` MUI Button that opens the `SignInModal`.

3. **Integrate AppHeader into the Route Layouts**:
   - Wrap `app/reference-data/layout.tsx` output with the `<AppHeader />`. Note: The current global `app/layout.tsx` renders the default `<Header />`. We need to use Next.js `usePathname` in the main layout or restructure with Route Groups `(public)` and `(app)` to ensure only one header renders.
   - Restructuring with Route Groups:
     - Move all marketing routes (`page.tsx`, `about`, `events`, `projects`, `publications`, `team`) into `app/(public)/`. Let `app/(public)/layout.tsx` load the original `<Header />`.
     - Move the tool routes (`reference-data`, `user-data`, `build-model`, `rxn`, `cpd`) into `app/(app)/`. Let `app/(app)/layout.tsx` load the new `<AppHeader />`.
     - *Simpler Approach without moving files*: Inside `app/layout.tsx`, check `pathname`. If `pathname.startsWith('/reference-data')` or `/user-data` or `/build-model` or `/rxn` or `/cpd`, render `<AppHeader />` instead of `<Header />`.
   - Update the public `<Header />` so its `Biochemistry` button links to `/reference-data`.

## Acceptance Criteria
- [ ] Users visiting the homepage or `/about` see the standard public header.
- [ ] Users visiting `/reference-data` or clicking "Biochemistry" on the homepage see the new `AppHeader` with Reference Data, User Data, Build Model tabs.
- [ ] Clicking "User Data" or "Build Model" on the `AppHeader` opens the `SignInModal`.
- [ ] Clicking the "Sign In" button on the far right opens the `SignInModal`.
- [ ] The "More" dropdown functions correctly and lists the specified secondary links.

## Timestamp Log
- Created: 2026-03-04 08:35:00 -06:00
