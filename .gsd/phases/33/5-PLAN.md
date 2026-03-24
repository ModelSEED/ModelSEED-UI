---
phase: 33
plan: 5
wave: 1
depends_on: []
files_modified:
  - components/ui/ModelDetailHeader.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Clicking 'Run GapFilling' shows a pop-up with media selection options"
    - "Media list is fetched from the API"
    - "Selected media is passed to the Gapfilling callback"
  artifacts:
    - "Gapfilling button triggers the same MediaSelectionDialog as FBA"
---

# Plan 33.5: Add Media Selection Pop-up for Gapfilling

<objective>
Add the same media selection pop-up for the "Run GapFilling" button that was added for Run FBA.

Purpose: Allow users to choose which media to use for Gapfilling simulation
Output: Gapfilling button triggers media selection dialog
</objective>

<context>
Load for context:
- components/ui/ModelDetailHeader.tsx (already has MediaSelectionDialog integrated)
- Note: This was already implemented in Plan 33.4 - both FBA and Gapfill use the same dialog
</context>

<tasks>

<task type="auto">
  <name>Verify Gapfilling uses media dialog</name>
  <files>components/ui/ModelDetailHeader.tsx</files>
  <action>
    Verify that the Gapfilling button (Run GapFilling) uses the same MediaSelectionDialog as FBA. The handleOpenMediaDialog function should accept 'fba' or 'gapfill' type, and handleMediaConfirm should call onRunGapfill with the selected media when type is 'gapfill'.
    
    This was already implemented in Plan 33.4. Verify it works correctly.
  </action>
  <verify>Clicking "Run GapFilling" opens media selection dialog with title "Select Media for Gapfilling"</verify>
  <done>Gapfilling button triggers media selection pop-up</done>
</task>

</tasks>

<verification>
- [ ] Run GapFilling opens media selection dialog
- [ ] Dialog title shows "Select Media for Gapfilling"
- [ ] Selected media passed to onRunGapfill callback
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>