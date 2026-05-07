---
phase: 32
plan: 3
wave: 2
autonomous: false
depends_on: [32.1]
files_modified:
  - app/(user-data)/my-models/page.tsx
  - app/model/[...path]/page.tsx
  - components/ui/
  - AGENTS.md
user_setup: []
---

# Plan 32.3: Feature Integration - Dialogs & Bulk Download

<objective>
Integrate existing dialog components into workflow pages and expand bulk export formats.

Purpose: MF003 (FBA/Media Selection Dialogs) and MF004 (Bulk Download formats) are ready for integration. MF001 (Model Merge) may be partially implementable.

Output: Integrated dialogs, expanded export options, documented merge workflow requirements
</objective>

<context>
Load for context:
- components/ui/SelectMediaDialog.tsx (exists but not integrated)
- components/ui/SaveAsDialog.tsx (exists but not integrated)
- app/model/[...path]/page.tsx (FBA configuration area)
- app/(user-data)/my-models/page.tsx (model listing)
- app/biochem/compounds/page.tsx (bulk export)
- app/biochem/reactions/page.tsx (bulk export)
- AGENTS.md MF003, MF004, MF001

Note: MF001 (Model Merge) requires backend /api/jobs/merge - check if functional first
</context>

<tasks>

<task type="auto">
  <name>Integrate SelectMediaDialog into FBA configuration</name>
  <files>app/model/[...path]/page.tsx, components/ui/SelectMediaDialog.tsx</files>
  <action>
    Add media selection to model FBA UI:
    
    1. Review SelectMediaDialog.tsx to understand its interface (open, onSelect, onClose)
    2. Find FBA configuration area in model detail page (search for "media" or "Media")
    3. Add "Select Media" button next to media input field:
       ```typescript
       const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
       
       // Button:
       <Button onClick={() => setMediaDialogOpen(true)}>
         Select Media
       </Button>
       
       <SelectMediaDialog
         open={mediaDialogOpen}
         onSelect={(mediaRef) => {
           setFieldValue('media', mediaRef);
           setMediaDialogOpen(false);
         }}
         onClose={() => setMediaDialogOpen(false)}
       />
       ```
    4. If media selection UI doesn't exist, add it with the dialog
    
    AVOID: Breaking existing FBA form - integrate alongside existing controls
    WHY: Users need to browse and select media from their workspace
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>SelectMediaDialog opens from FBA configuration and returns selected media</done>
</task>

<task type="auto">
  <name>Integrate SaveAsDialog into Save workflow</name>
  <files>app/model/[...path]/page.tsx, components/ui/SaveAsDialog.tsx</files>
  <action>
    Add "Save As" functionality:
    
    1. Review SaveAsDialog.tsx interface
    2. Find model editing/saving area (search for "save", "export", "download")
    3. Add "Save As" button in toolbar:
       ```typescript
       const [saveAsOpen, setSaveAsOpen] = useState(false);
       
       <Button onClick={() => setSaveAsOpen(true)} startIcon={<SaveIcon />}>
         Save As
       </Button>
       
       <SaveAsDialog
         open={saveAsOpen}
         modelRef={modelRef}
         onSave={(newRef) => {
           router.push(`/model/${newRef}`);
           setSaveAsOpen(false);
         }}
         onClose={() => setSaveAsOpen(false)}
       />
       ```
    4. If SaveAsDialog doesn't have required props, enhance it
    
    AVOID: Breaking existing export functionality - add as additional option
    WHY: Users need to save models with new names
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>SaveAsDialog integrates with model detail page</done>
</task>

<task type="auto">
  <name>Expand bulk download to include JSON and TSV formats</name>
  <files>app/biochem/compounds/page.tsx, app/biochem/reactions/page.tsx, lib/utils/exportCsv.ts</files>
  <action>
    Add JSON and TSV export options:
    
    1. Review current CSV export in lib/utils/exportCsv.ts
    2. Create export utility for multiple formats:
       ```typescript
       export function exportData(data: unknown[], format: 'csv' | 'json' | 'tsv', filename: string) {
         let content: string;
         let mimeType: string;
         let ext: string;
         
         switch (format) {
           case 'json':
             content = JSON.stringify(data, null, 2);
             mimeType = 'application/json';
             ext = 'json';
             break;
           case 'tsv':
             // Convert array of objects to TSV
             if (data.length === 0) { content = ''; break; }
             const headers = Object.keys(data[0]);
             const rows = data.map(row => headers.map(h => String(row[h] ?? '')).join('\t'));
             content = [headers.join('\t'), ...rows].join('\n');
             mimeType = 'text/tab-separated-values';
             ext = 'tsv';
             break;
           default: // csv
             content = convertToCSV(data);
             mimeType = 'text/csv';
             ext = 'csv';
         }
         
         const blob = new Blob([content], { type: mimeType });
         downloadBlob(blob, `${filename}.${ext}`);
       }
       ```
    3. Update biochemistry pages to add format selector dropdown
    4. Add "Export" button with menu: [CSV, JSON, TSV]
    
    AVOID: Removing existing CSV option - add alongside
    WHY: MF004 - Legacy feature had JSON and TSV, need parity
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>Biochem pages offer CSV, JSON, and TSV export options</done>
</task>

<task type="checkpoint:decision">
  <name>Assess Model Merge workflow feasibility</name>
  <question>Should we implement Model Merge UI now or defer?</question>
  <options>
    <label>Defer - Requires more backend testing</label>
    <description>Keep MF001 as blocked - need to verify /api/jobs/merge is functional</description>
    <label>Basic UI - Show "Coming Soon" with feature documentation</label>
    <description>Add UI placeholder that explains merge workflow when backend ready</description>
  </options>
</task>

</tasks>

<verification>
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] SelectMediaDialog opens from FBA
- [ ] SaveAsDialog integrates with model page
- [ ] CSV, JSON, TSV export works on biochem pages
</verification>

<success_criteria>
- [ ] MF003: FBA/Media Selection dialogs integrated
- [ ] MF004: Bulk download has JSON and TSV options
- [ ] MF001: Decision made and documented
</success_criteria>
