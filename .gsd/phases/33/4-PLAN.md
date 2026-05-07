---
phase: 33
plan: 4
wave: 1
depends_on: []
files_modified:
  - components/ui/ModelDetailHeader.tsx
  - components/ui/MediaSelectionDialog.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Clicking 'Run FBA' shows a pop-up with media selection options"
    - "Media list is fetched from the API (/api/media/public)"
    - "Selected media is passed to the FBA callback"
  artifacts:
    - "MediaSelectionDialog component created"
    - "ModelDetailHeader shows dialog on Run FBA click"
---

# Plan 33.4: Add Media Selection Pop-up for Run FBA

<objective>
Add a pop-up dialog that allows users to select a media when clicking the "Run FBA" button on the model landing page. The media list should be fetched from the API.

Purpose: Allow users to choose which media to use for FBA simulation
Output: MediaSelectionDialog component integrated with Run FBA button
</objective>

<context>
Load for context:
- components/ui/ModelDetailHeader.tsx (current Run FBA button implementation)
- lib/api/modelseed.ts (listMediaFromApi function for fetching media)
</context>

<tasks>

<task type="auto">
  <name>Create MediaSelectionDialog component</name>
  <files>components/ui/MediaSelectionDialog.tsx</files>
  <action>
    Create a new component that:
    - Uses MUI Dialog component
    - Fetches available media from listMediaFromApi('/api/media/public')
    - Displays a Select/Dropdown with media options
    - Includes a "Run" button that calls onConfirm with the selected media
    - Includes a "Cancel" button to close without action
    
    Props should include:
    - open: boolean
    - onClose: () => void
    - onConfirm: (mediaId: string) => void
    - title?: string (default: "Select Media for FBA")
  </action>
  <verify>Component renders with media dropdown and Run/Cancel buttons</verify>
  <done>MediaSelectionDialog component created</done>
</task>

<task type="auto">
  <name>Integrate MediaSelectionDialog with Run FBA button</name>
  <files>components/ui/ModelDetailHeader.tsx</files>
  <action>
    Modify the ModelDetailHeader component:
    1. Import MediaSelectionDialog
    2. Add state for dialog open/close (const [mediaDialogOpen, setMediaDialogOpen] = useState(false))
    3. Change onRunFba to open the media dialog instead of directly calling the callback
    4. When user confirms media selection, call the original onRunFba callback with the media info
    
    The callback signature should change to accept an optional media parameter, or we can pass it to a wrapper function.
  </action>
  <verify>Clicking "Run FBA" opens the media selection dialog</verify>
  <done>Run FBA button triggers media selection pop-up</done>
</task>

</tasks>

<verification>
- [ ] MediaSelectionDialog created
- [ ] Run FBA opens media selection dialog
- [ ] Media list fetched from API
- [ ] Selected media passed to callback
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria