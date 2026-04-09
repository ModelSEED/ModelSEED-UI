---
phase: 33
plan: 6
wave: 1
depends_on: []
files_modified:
  - app/model/[...path]/page.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "The details pane for Reactions tab is properly formatted"
  artifacts:
    - "Reaction details drawer has proper layout, spacing, and typography"
---

# Plan 33.6: Fix Reactions Details Pane Formatting

<objective>
Fix the poorly formatted details pane that opens when clicking "View" on a reaction in the model landing page Reactions tab.

Purpose: Improve the visual presentation of reaction details
Output: Properly formatted reaction details drawer
</objective>

<context>
Load for context:
- app/model/[...path]/page.tsx (detail drawer implementation around lines 1000-1100)
- Search for "openDetailDrawer" and detail drawer rendering
</context>

<tasks>

<task type="auto">
  <name>Review and fix reaction details drawer formatting</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Find the detail drawer implementation that opens when clicking "View" on a reaction. The drawer should display:
    - Reaction ID and name
    - Equation (chemical equation)
    - Direction (forward/reversible)
    - Gene associations
    - Any other relevant metadata
    
    Fix any formatting issues:
    - Ensure proper spacing between sections
    - Fix typography (use consistent font sizes, weights)
    - Ensure proper alignment of labels and values
    - Add proper padding and margins
    
    Look for Drawer, Dialog, or similar component that displays reaction details.
  </action>
  <verify>Open a reaction detail - all fields should be properly spaced and readable</verify>
  <done>Reaction details pane has proper formatting</done>
</task>

</tasks>

<verification>
- [ ] Reaction details drawer opens properly
- [ ] All fields display with proper spacing and typography
- [ ] No overflow or layout issues
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>