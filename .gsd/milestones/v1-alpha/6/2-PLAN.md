---
phase: 6
plan: 2
wave: 1
---

# Plan 6.2: Structural CSS Formatting & Reactions Modal

## Objective
Replicate the legacy Subsystems and Reactions DataGrid visually. Arrays of sub-items (like pathways, features, aliases) must be vertically spaced stacked links, requiring dynamic row heights in the DataGrid. Add the Reactions Comment button and its corresponding Modal.

## Context
- .gsd/SPEC.md
- User requested vertical array styling for cells matching the image exactly (`PWY-5172\nPYRUVDEHYD-PWY\n...`).
- The user requested a comment button in the reactions grid that triggers a modal identical to the legacy one.

## Tasks

<task type="auto">
  <name>DataGrid Dynamic Row Heights</name>
  <files>
    - components/data-tables/BiochemReactionsDataGrid.tsx
    - components/data-tables/SubsystemsDataGrid.tsx
  </files>
  <action>
    - Configure the MUI DataGrid components with `getRowHeight={() => 'auto'}` and `sx={{ '& .MuiDataGrid-row': { minHeight: 52 }, '& .MuiDataGrid-cell': { py: 1, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' } }}` or similar rules to allow tall cells to expand the row dynamically.
    - Create a reusable render logic mapping `val.split(';')` (or `map(v => <Typography/Link>)`) over the properties that hold multiple comma/semicolon-separated values. Each value becomes its own vertically-spaced link or line.
    - Explicitly map this logic to: `features`, `pathways`, `subsystems`, and `aliases`.
  </action>
  <verify>grep "getRowHeight" components/data-tables/BiochemReactionsDataGrid.tsx</verify>
  <done>Lists render as multiple vertically stacked text lines and dynamic heights are enabled.</done>
</task>

<task type="auto">
  <name>Implement Reactions Comment Button</name>
  <files>
    - components/data-tables/BiochemReactionsDataGrid.tsx
    - components/modals/ReactionCommentModal.tsx
  </files>
  <action>
    - Create a new interactive component `ReactionCommentModal.tsx` matching the legacy modal look (cyan header, form fields: checkboxes for 'incorrect abbreviation', 'incorrect stoichiometry', 'incorrect balance', 'incorrect EC', 'incorrect database mapping'; text inputs: 'Name', 'Email', 'Other remarks'; cancel/submit buttons).
    - In `BiochemReactionsDataGrid.tsx`, import a small Material icon `ChatBubbleOutline` or similar matching the image, right next to the ID link in the same cell.
    - On clicking the comment icon, open the `ReactionCommentModal` with the appropriate `rxnXXXXX` ID bound as a prop.
    - Submission can just log to `console.log` for now, but UI state must be fully built.
  </action>
  <verify>ls components/modals/ReactionCommentModal.tsx</verify>
  <done>The React modal perfectly visualizes the legacy comment form.</done>
</task>

## Success Criteria
- [ ] Subsystems tables display multiple features or pathways vertically instead of inline.
- [ ] Row sizes adjust dynamically to the tallest list column.
- [ ] Reactions feature a comment bubble that opens a form-filled modal identical to legacy.

## Timestamp Log
- Created: 2026-03-05 09:12:00 -06:00
