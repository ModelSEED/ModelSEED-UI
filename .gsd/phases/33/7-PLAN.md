---
phase: 33
plan: 7
wave: 1
depends_on: []
files_modified:
  - app/model/[...path]/page.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Biomass tab displays data correctly when available in the model"
  artifacts:
    - "Biomass rows properly extracted from model data"
---

# Plan 33.7: Fix Empty Biomass Display

<objective>
Fix the empty biomass display on the model landing page. The biomass tab shows no data even when biomass exists in the model.

Purpose: Ensure biomass data is properly displayed in the Biomass tab
Output: Working biomass display with proper data extraction
</objective>

<context>
Load for context:
- app/model/[...path]/page.tsx (buildBiomassRows function around lines 187-216)
- Look at how model data is structured for biomass
</context>

<tasks>

<task type="auto">
  <name>Debug and fix biomass data extraction</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Review the buildBiomassRows function (lines 187-216) and understand how it extracts biomass data from the model.
    
    Common issues to check:
    1. The model data may use different key names (biomasses vs biomass vs biomasscompounds)
    2. The data structure may be different than expected
    3. The compounds array may be empty or structured differently
    
    Debug steps:
    - Add console.log to see what keys exist in model.biomasses vs model.biomass
    - Check if compounds are nested under a different key
    - Verify the data types and structure
    
    Fix the buildBiomassRows function to properly extract biomass data regardless of the key naming convention used by the API.
  </action>
  <verify>Open a model with biomass data - Biomass tab should display rows</verify>
  <done>Biomass tab shows data when model has biomass</done>
</task>

</tasks>

<verification>
- [ ] Biomass tab displays data for models with biomass
- [ ] No console errors related to biomass extraction
- [ ] Data properly formatted in the table
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>