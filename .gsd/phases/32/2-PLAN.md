---
phase: 32
plan: 2
wave: 2
autonomous: true
depends_on: [32.1]
files_modified:
  - components/ui/AddCompoundsDialog.tsx
  - components/ui/AddReactionsDialog.tsx
  - app/model/[...path]/page.tsx
  - AGENTS.md
user_setup: []
---

# Plan 32.2: MUI DataGrid v7 Compatibility Fixes

<objective>
Fix MUI DataGrid v7 compatibility issues with GridRowSelectionModel type changes and other v7-specific issues.

Purpose: MUI v7 changed GridRowSelectionModel from array to object format. This plan ensures all DataGrid components handle the new format correctly.

Output: All DataGrid row selection code handles v7 object format with Set, no console errors
</objective>

<context>
Load for context:
- components/ui/AddCompoundsDialog.tsx (uses DataGrid with rowSelection)
- components/ui/AddReactionsDialog.tsx (uses DataGrid with rowSelection)
- app/model/[...path]/page.tsx (may have DataGrid usage)
- AGENTS.md UI002: Grid Row Selection Model Type Changes

Issue: MUI v7+ changed `GridRowSelectionModel` from `string[]` to `{ type: 'include', ids: Set<string> }`
</context>

<tasks>

<task type="auto">
  <name>Audit all DataGrid row selection usage</name>
  <files>components/ui/AddCompoundsDialog.tsx, components/ui/AddReactionsDialog.tsx</files>
  <action>
    Search and update all GridRowSelectionModel usage:
    
    1. Search for: onRowSelectionModelChange, rowSelectionModel, GridRowSelectionModel
    2. Identify all places using .length, .map, filter, or array methods
    3. Add type-safe handling:
       ```typescript
       // Old (v6): selectionModel.length
       // New (v7): 
       const getSelectedIds = (model: GridRowSelectionModel): string[] => {
         if (Array.isArray(model)) return model;
         if (model && typeof model === 'object' && 'ids' in model) {
           return Array.from((model as { ids: Set<string> }).ids);
         }
         return [];
       };
       ```
    4. Update AddCompoundsDialog.tsx:
       - Find state: const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([])
       - Update handler to extract IDs safely
       - Ensure Add button enables when selectionModel has items
       
    5. Update AddReactionsDialog.tsx with same pattern
    
    AVOID: Breaking existing selection behavior - test add functionality still works
    WHY: v7 changed type from array to object, existing .length calls will fail
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>All DataGrid components use type-safe selection model handling that works with v7 object format</done>
</task>

<task type="auto">
  <name>Verify and fix any other DataGrid v7 issues</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Check for other DataGrid v7 changes that may affect the app:
    
    1. Search for all DataGrid imports and usages
    2. Check for deprecated props or changed APIs in v7:
       - columnSpacing -> columnSpacing?. Use 8px default
       - rowSpacing -> rowSpacing?. Use 0.5px default  
       - paginationMode -> paginationMode still exists
       - Get column definitions that may need updating
    3. Review app/model/[...path]/page.tsx for DataGrid usage
    4. Fix any type errors or deprecated warnings
    
    AVOID: Changing DataGrid functionality - only fix type/interface issues
    WHY: v7 may have breaking changes in prop names or types
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>No DataGrid-related warnings or errors in build</done>
</task>

<task type="auto">
  <name>Update AGENTS.md with UI002 resolution</name>
  <files>AGENTS.md</files>
  <action>
    Mark UI002 as resolved in Known Issues:
    
    ```markdown
    ### UI002: Grid Row Selection Model Type Changes
    **Status:** Resolved
    **Resolution:** Added type-safe GridRowSelectionModel handling with getSelectedIds() utility. All dialogs updated for v7 object format compatibility.
    ```
  </action>
  <verify>AGENTS.md updated</verify>
  <done>UI002 marked as resolved in AGENTS.md</done>
</task>

</tasks>

<verification>
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] AddCompoundsDialog row selection works
- [ ] AddReactionsDialog row selection works
- [ ] No console errors from DataGrid
</verification>

<success_criteria>
- [ ] All DataGrid components handle v7 selection model format
- [ ] Row selection in dialogs works correctly
- [ ] AGENTS.md updated
</success_criteria>
