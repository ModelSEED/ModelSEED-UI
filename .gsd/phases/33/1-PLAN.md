---
phase: 33
plan: 1
wave: 1
depends_on: []
files_modified:
  - app/(build-model)/plant/page.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "PlantSEED v3.0 banner has a linebreak after 'PlantSEED v2.0' text"
    - "The banner is also available as a pop-up for the 'UPLOAD Plants FASTA' section"
  artifacts:
    - "Banner tooltip contains linebreak after PlantSEED v2.0"
    - "Pop-up dialog appears when clicking on the disabled 'UPLOAD Plants FASTA' tab"
---

# Plan 33.1: PlantSEED Banner Linebreak and Pop-up

<objective>
Add a linebreak in the PlantSEED v3.0 banner after "PlantSEED v2.0" text, and add the banner as a pop-up for the "UPLOAD Plants FASTA" section in Build Model page.

Purpose: Improve visual formatting of the maintenance banner and make it more accessible via pop-up
Output: Modified banner with linebreak and pop-up dialog
</objective>

<context>
Load for context:
- app/(build-model)/plant/page.tsx (lines 230-280)
</context>

<tasks>

<task type="auto">
  <name>Add linebreak to PlantSEED banner tooltip</name>
  <files>app/(build-model)/plant/page.tsx</files>
  <action>
    In the Tooltip component at line 236-238, modify the title to include a linebreak after "PlantSEED v2.0". The current text is:
    "PlantSEED v3.0 Update In Progress: Annotation and reconstruction services are temporarily offline for updates and will be restored shortly."
    
    Change to:
    "PlantSEED v2.0\nUpdate In Progress: Annotation and reconstruction services are temporarily offline for updates and will be restored shortly."
    
    Note: Use \n for linebreak in MUI Tooltip title.
  </action>
  <verify>View the page source and confirm the tooltip title contains \n after "PlantSEED v2.0"</verify>
  <done>Tooltip title has linebreak after "PlantSEED v2.0"</done>
</task>

<task type="auto">
  <name>Add pop-up dialog for UPLOAD Plants FASTA section</name>
  <files>app/(build-model)/plant/page.tsx</files>
  <action>
    Add a Dialog component that shows the maintenance message when the user clicks on the disabled "UPLOAD Plants FASTA" tab (when PLANTSEED_MAINTENANCE is true). The dialog should display:
    - Title: "PlantSEED v2.0"
    - Body: "Update In Progress: Annotation and reconstruction services are temporarily offline for updates and will be restored shortly."
    
    Use MUI Dialog component. The dialog should open when the disabled tab is clicked.
  </action>
  <verify>Click on disabled "UPLOAD Plants FASTA" tab - dialog should appear with the maintenance message</verify>
  <done>Pop-up dialog appears with PlantSEED v2.0 maintenance message</done>
</task>

</tasks>

<verification>
- [ ] Banner tooltip has linebreak after "PlantSEED v2.0"
- [ ] Pop-up dialog appears when clicking disabled "UPLOAD Plants FASTA" tab
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>