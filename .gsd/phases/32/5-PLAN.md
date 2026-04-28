---
phase: 32
plan: 5
wave: 3
autonomous: true
depends_on: [32.1]
files_modified:
  - app/model/[...path]/page.tsx
  - lib/api/modelseed.ts
  - AGENTS.md
user_setup: []
---

# Plan 32.5: Model History & Remaining Features

<objective>
Implement model edit history UI and assess remaining feature items.

Purpose: MF002 (Model History) and assess MF005/MF006 for feasibility.

Output: Timeline view for model edits, assessment of plant workflow and file preview
</objective>

<context>
Load for context:
- app/model/[...path]/page.tsx (Edit tab currently shows counts)
- lib/api/modelseed.ts listModelEditsFromApi (line 479-483)
- app/plant/page.tsx (plant workflow)
- app/data/[...path]/page.tsx (file browser)
- AGENTS.md MF002, MF005, MF006
</context>

<tasks>

<task type="auto">
  <name>Implement model edit history timeline</name>
  <files>app/model/[...path]/page.tsx, lib/api/modelseed.ts</files>
  <action>
    Build timeline view for model edits:
    
    1. Test listModelEditsFromApi endpoint:
       ```typescript
       const edits = await listModelEditsFromApi(ref);
       // Check what data returns - fields like: timestamp, user, changes, description?
       ```
    
    2. Design timeline UI in Edit tab:
       - Show chronological list of edits
       - Each entry: timestamp, user, change summary
       - Expandable to show details
       - "Revert to this version" button (if backend supports)
       
    3. Implement with MUI Timeline:
       ```typescript
       import Timeline from '@mui/lab/Timeline';
       import TimelineItem from '@mui/lab/TimelineItem';
       import TimelineSeparator from '@mui/lab/TimelineSeparator';
       import TimelineConnector from '@mui/lab/TimelineConnector';
       import TimelineContent from '@mui/lab/TimelineContent';
       
       {edits.map((edit, idx) => (
         <TimelineItem key={edit.id}>
           <TimelineSeparator>
             <TimelineDot />
             {idx < edits.length - 1 && <TimelineConnector />}
           </TimelineSeparator>
           <TimelineContent>
             <Typography>{edit.timestamp}</Typography>
             <Typography>{edit.description}</Typography>
           </TimelineContent>
         </TimelineItem>
       ))}
       ```
    
    4. Handle empty history: "No edits recorded yet"
    5. Handle API errors gracefully (some models may not support edit history)
    
    AVOID: Breaking existing Edit tab - add alongside current view
    WHY: MF002 - Users need to see edit history for audit and rollback
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>Edit tab shows timeline of model changes with timestamps and descriptions</done>
</task>

<task type="checkpoint:decision">
  <name>Assess Plant Workflow (MF005)</name>
  <question>Is the Build Model Plant workflow functional?</question>
  <options>
    <label>Test and document</label>
    <description>Test /plant workflow end-to-end, document any API failures</description>
    <label>Mark as blocked</label>
    <description>Keep MF005 as blocked, requires backend work</description>
  </options>
</task>

<task type="checkpoint:decision">
  <name>Assess File Preview (MF006)</name>
  <question>Should we implement file preview in workspace browser?</question>
  <options>
    <label>Basic implementation</label>
    <description>Add preview for JSON/text files only - lower priority</label>
    <label>Defer</label>
    <description>Keep as low priority, focus on core features</description>
  </options>
</task>

<task type="auto">
  <name>Update AGENTS.md with feature status</name>
  <files>AGENTS.md</files>
  <action>
    Update AGENTS.md with findings:
    
    ```markdown
    ### MF002: Model History/Edits UI Limited
    **Status:** Resolved
    **Resolution:** Added Timeline view in Edit tab using listModelEditsFromApi
    
    ### MF005: Build Model Plant Workflow
    **Status:** [Resolved / Blocked]
    **Resolution:** [Document test results or backend requirements]
    
    ### MF006: Workspace Browser File Preview
    **Status:** Deferred
    **Resolution:** Low priority - can be added later if requested
    ```
  </action>
  <verify>AGENTS.md updated</verify>
  <done>AGENTS.md reflects current state of MF002, MF005, MF006</done>
</task>

</tasks>

<verification>
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] Model edit history timeline renders
- [ ] Plant workflow assessed
- [ ] File preview decision made
</verification>

<success_criteria>
- [ ] MF002: Model edit history timeline implemented
- [ ] MF005: Plant workflow tested and documented
- [ ] MF006: Decision made (implement or defer)
- [ ] AGENTS.md updated
</success_criteria>
