---
phase: 33
plan: 3
wave: 1
depends_on: []
files_modified:
  - components/ui/DownloadModelMenu.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Download Options link is properly aligned with descriptive text on model landing page"
  artifacts:
    - "DownloadModelMenu component has correct Flexbox alignment"
---

# Plan 33.3: Fix Download Options Link Alignment

<objective>
Fix the alignment issue where the "Download Options" link is not lined up with the descriptive text on the model landing page.

Purpose: Improve visual consistency in the model detail header
Output: Properly aligned Download Options button
</objective>

<context>
Load for context:
- components/ui/DownloadModelMenu.tsx (current implementation)
- app/model/[...path]/page.tsx (usage context around line 1175-1180)
</context>

<tasks>

<task type="auto">
  <name>Fix Download Options alignment</name>
  <files>components/ui/DownloadModelMenu.tsx</files>
  <action>
    Review the current layout in DownloadModelMenu and the parent container in the model detail page. The issue is that the button and helper text (if present) are not aligned properly.
    
    Options to fix:
    1. If helperText is provided, ensure it aligns with the button using the same left margin
    2. Ensure the button uses proper vertical alignment (alignItems: 'center' or 'baseline')
    3. Check the parent container for proper display/flex properties
    
    Apply the fix that best matches the surrounding UI pattern.
  </action>
  <verify>Visual inspection - Download Options button aligns with any helper text or descriptive text</verify>
  <done>Download Options link properly aligned with descriptive text</done>
</task>

</tasks>

<verification>
- [ ] Download Options button aligns with surrounding text
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria