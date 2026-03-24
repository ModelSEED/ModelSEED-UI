---
phase: 32
plan: 4
wave: 3
autonomous: true
depends_on: []
files_modified:
  - lib/utils/formatEquation.ts
  - app/model/[...path]/page.tsx
  - components/ui/
  - AGENTS.md
user_setup: []
---

# Plan 32.4: UI Polish - Formatting, State & Empty States

<objective>
Address UI quality improvements: chemical equation formatting, tab state persistence, and informative empty states.

Purpose: UI001, UI003, and UI004 from Known Issues are frontend polish items that improve UX.

Output: Better formatted equations, persistent tab state, helpful empty states
</objective>

<context>
Load for context:
- lib/utils/formatEquation.ts (chemical equation formatting)
- app/model/[...path]/page.tsx (tabs: Overview, Reactions, Compounds, etc.)
- app/(user-data)/my-models/page.tsx (empty state)
- app/(user-data)/my-media/page.tsx (empty state)
- app/biochem/search/page.tsx (empty state)
- AGENTS.md UI001, UI003, UI004
</context>

<tasks>

<task type="auto">
  <name>Fix chemical equation subscript formatting</name>
  <files>lib/utils/formatEquation.ts</files>
  <action>
    Improve regex patterns for chemical formulas:
    
    1. Review current formatEquation function
    2. Enhance subscript handling:
       - CHOCO2 -> CHO₂ (detect trailing numbers as subscripts)
       - C6H12O6 -> C₆H₁₂O₆ 
       - Handle edge cases: numbers in compound names should NOT be subscripted
       - Add spacing: "2.0 A + B" -> "2.0 A + B" (coeff, space, compound)
    
    3. Updated regex pattern approach:
       ```typescript
       // Match element + optional count: C, H2, O12
       const elementPattern = /([A-Z][a-z]?)(\d*)/g;
       
       // Replace with subscript unicode
       formula.replace(elementPattern, (match, element, count) => {
         if (!count) return element;
         const subscripts = count.split('').map(d => 
           String.fromCharCode(0x2080 + parseInt(d))
         ).join('');
         return element + subscripts;
       });
       ```
    
    4. Test against known edge cases from legacy UI
    
    AVOID: Over-engineering - basic subscript is main need
    WHY: UI001 - Chemical formulas should render correctly like legacy UI
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>Chemical equations render with proper subscripts (H2O -> H₂O, C6H12O6 -> C₆H₁₂O₆)</done>
</task>

<task type="auto">
  <name>Add URL-based tab state persistence</name>
  <files>app/model/[...path]/page.tsx</files>
  <action>
    Enable deep-linking to tabs:
    
    1. Review current tab state management in model detail page
    2. Add useSearchParams to read/write tab state:
       ```typescript
       import { useSearchParams, useRouter, usePathname } from 'next/navigation';
       
       // In component:
       const searchParams = useSearchParams();
       const router = useRouter();
       const pathname = usePathname();
       
       const currentTab = searchParams.get('tab') || 'overview';
       
       const handleTabChange = (tab: string) => {
         const params = new URLSearchParams(searchParams);
         params.set('tab', tab);
         router.replace(`${pathname}?${params.toString()}`, { scroll: false });
       };
       ```
    3. Update all tab-related code to use URL params
    4. Handle invalid tab values gracefully (fallback to 'overview')
    
    AVOID: Breaking existing tab navigation - test all tabs still work
    WHY: UI003 - Users want to share links to specific tabs
  </action>
  <verify>npm run lint && npm run typecheck && manual URL test</verify>
  <done>URL changes when switching tabs, refreshing page keeps selected tab, direct URL to tab works</done>
</task>

<task type="auto">
  <name>Improve empty states with helpful messaging</name>
  <files>app/(user-data)/my-models/page.tsx, app/(user-data)/my-media/page.tsx, app/biochem/search/page.tsx</files>
  <action>
    Replace generic "No data" with helpful empty states:
    
    1. My Models empty state:
       ```typescript
       <EmptyState
         icon={<ModelIcon />}
         title="No models yet"
         description="Create your first model to get started. Models are metabolic reconstructions from genomes or biochemical data."
         action={{
           label: "Create Model",
           onClick: () => router.push('/build'),
         }}
       />
       ```
    
    2. My Media empty state:
       ```typescript
       <EmptyState
         icon={<MediaIcon />}
         title="No media defined"
         description="Media define the growth conditions for FBA. Import from biochemistry database or create custom media."
         action={{
           label: "Browse Media",
           onClick: () => router.push('/biochem/media'),
         }}
       />
       ```
    
    3. Search empty state:
       ```typescript
       <EmptyState
         icon={<SearchIcon />}
         title="No results found"
         description={`No compounds or reactions match "${query}". Try different search terms.`}
       />
       ```
    
    4. Create reusable EmptyState component if not exists
    
    AVOID: Removing existing data - just enhance empty state UI
    WHY: UI004 - Users need context about why data is empty and what to do
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>Empty states show helpful context and action buttons</done>
</task>

<task type="auto">
  <name>Update AGENTS.md with UI improvements</name>
  <files>AGENTS.md</files>
  <action>
    Mark resolved UI issues:
    
    ```markdown
    ### UI001: Chemical Equation Subscript Formatting
    **Status:** Resolved
    **Resolution:** Enhanced formatEquation.ts with proper subscript unicode conversion
    
    ### UI003: Tab Selection State Lost on Navigation  
    **Status:** Resolved
    **Resolution:** Added URL-based tab state for deep-linking support
    
    ### UI004: Empty States Could Be More Informative
    **Status:** Resolved
    **Resolution:** Added EmptyState component with contextual messaging and CTAs
    ```
  </action>
  <verify>AGENTS.md updated</verify>
  <done>UI001, UI003, UI004 marked as resolved</done>
</task>

</tasks>

<verification>
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] Chemical equations show proper subscripts
- [ ] Tab state persists via URL
- [ ] Empty states show helpful messages
</verification>

<success_criteria>
- [ ] UI001: Chemical equation formatting fixed
- [ ] UI003: Tab state persists on refresh/navigation
- [ ] UI004: Empty states are informative with actions
- [ ] AGENTS.md updated
</success_criteria>
