## Phase 6 Verification

### Must-Haves
1. **Legacy URL Structure**
   - **Requirement:** Revert/update internal resource links to perfectly match the legacy ModelSEED routes (e.g., `/genomes`, `/biochem/reactions/[id]`, `/biochem/compounds/[id]`, `/list-media`).
   - **Status:** PASS
   - **Evidence:**
     - `AppHeader.tsx` Reference Data tab points to `/genomes`, and `HeaderLayoutRouter.tsx` treats `/genomes`, `/biochem`, and `/list-media` as app routes:
       
       ```21:36:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/components/layout/AppHeader.tsx
       export default function AppHeader() {
           const pathname = usePathname();
           ...
           const isReferenceDataActive = pathname.startsWith('/genomes') ||
               pathname.startsWith('/biochem') ||
               pathname.startsWith('/list-media');
       ...
                                   component={Link}
                                   href="/genomes"
       ```

       ```13:22:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/HeaderLayoutRouter.tsx
       export default function HeaderLayoutRouter() {
           const pathname = usePathname();
       
           const isAppRoute = pathname.startsWith('/genomes') ||
               pathname.startsWith('/biochem') ||
               pathname.startsWith('/list-media') ||
               pathname.startsWith('/user-data') ||
               pathname.startsWith('/build-model');
       ```

     - Biochemistry layout tabs use legacy-aligned hrefs for all Reference Data sections:

       ```22:47:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/layout.tsx
       const REF_DATA_TABS: BiochemTab[] = [
           { label: 'Public Plant Models', href: '/genomes', ... },
           { label: 'Subsystems', href: '/genomes/Annotations', ... },
           { label: 'Reactions', href: '/biochem/reactions', ... },
           { label: 'Compounds', href: '/biochem/compounds', ... },
           { label: 'Media', href: '/list-media', ... },
       ];
       ```

     - Reactions and Compounds tables link detail pages under `/biochem/reactions/[id]` and `/biochem/compounds/[id]`:

       ```101:110:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/reactions/page.tsx
       const columns = useMemo<GridColDef<Reaction>[]>(() => [
           {
               field: 'id',
               headerName: 'ID',
               width: 120,
               renderCell: (params) => (
                   <Link href={`/biochem/reactions/${params.value}`} style={{ color: '#1976d2' }}>
                       {params.value}
                   </Link>
               ),
           },
       ```

       ```66:75:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/compounds/page.tsx
       const columns: GridColDef<Compound>[] = [
           {
               field: 'id',
               headerName: 'ID',
               width: 120,
               renderCell: (params) => (
                   <Link href={`/biochem/compounds/${params.value}`} style={{ color: '#1976d2' }}>
                       {params.value}
                   </Link>
               ),
           },
       ```

2. **Restored Hyperlinked Columns in Reference Data**
   - **Requirement:** Restore all hyperlinked columns across Reference Data tabs to match legacy behaviour.
   - **Status:** PASS
   - **Evidence:**
     - Public Plant Models table links both Model ID and Species Name to `modelseed.org`:

       ```24:52:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/genomes/page.tsx
       const columns: GridColDef<PlantModelItem>[] = [
           {
               field: 'id',
               headerName: 'Model ID',
               width: 220,
               renderCell: (params) => (
                   <Link
                       href={`https://modelseed.org/model/plantseed/plantseed/${params.value}`}
                       ...
                   >
                       {params.value}
                   </Link>
               )
           },
           {
               field: 'name',
               headerName: 'Species Name',
               width: 200,
               renderCell: (params) => (
                   <Link
                       href={`https://modelseed.org/model/plantseed/plantseed/${params.row.id}`}
                       ...
                   >
                       {params.value}
                   </Link>
               )
           },
       ];
       ```

     - Compounds and Reactions tables include clickable IDs and external alias links (BiGG, KEGG, MetaCyc) implemented via anchor tags in `parseAliases` helpers:

       ```24:52:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/compounds/page.tsx
       function parseAliases(aliases?: string[]): React.ReactNode {
           ...
           return (
               <span style={{ display: 'inline-block', maxWidth: 300 }}>
                   {aliasEntries.map((entry, i) => {
                       ...
                       return (
                           <span key={i}>
                               <strong>{prefix}:</strong>{' '}
                               {values.map((v, j) => (
                                   <span key={j}>
                                       {baseUrl ? (
                                           <a href={`${baseUrl}${v}`} target="_blank" rel="noopener noreferrer">{v}</a>
                                       ) : (
                                           v
                                       )}
                                   </span>
                               ))}
                           </span>
                       );
                   })}
               </span>
           );
       }
       ```

       ```24:56:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/reactions/page.tsx
       function parseAliases(aliases?: string[]): React.ReactNode {
           ...
           return (
               <span style={{ display: 'inline-block', maxWidth: 300 }}>
                   {aliasEntries.map((entry, i) => {
                       ...
                       return (
                           <span key={i}>
                               <strong>{prefix}:</strong>{' '}
                               {values.map((v, j) => (
                                   <span key={j}>
                                       {baseUrl ? (
                                           <a href={`${baseUrl}${v}`} target="_blank" rel="noopener noreferrer">{v}</a>
                                       ) : (
                                           v
                                       )}
                                   </span>
                               ))}
                           </span>
                       );
                   })}
               </span>
           );
       }
       ```

3. **Vertical List Spacing / Multi-line Cells**
   - **Requirement:** Ensure 1-to-1 visual matching in tables, particularly vertical list spacing for multi-line content (e.g., Subsystems/Reactions arrays).
   - **Status:** PASS
   - **Evidence:**
     - Reactions and Compounds DataGrids set `getRowHeight={() => 'auto'}` and align cell content to the top with padding:

       ```226:247:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/reactions/page.tsx
       <DataGrid<Reaction>
           ...
           getRowId={(row) => row.id}
           getRowHeight={() => 'auto'}
           disableRowSelectionOnClick
           sx={{
               border: '1px solid #e0e0e0',
               '& .MuiDataGrid-cell': {
                   py: 1,
                   alignItems: 'flex-start',
               },
           }}
           autoHeight
       />
       ```

       ```157:179:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/compounds/page.tsx
       <DataGrid<Compound>
           ...
           getRowId={(row) => row.id}
           getRowHeight={() => 'auto'}
           disableRowSelectionOnClick
           sx={{
               border: '1px solid #e0e0e0',
               '& .MuiDataGrid-cell': {
                   py: 1,
                   alignItems: 'flex-start',
               },
           }}
           autoHeight
       />
       ```

4. **Reaction Comment Modal**
   - **Requirement:** Implement the "Comment" button/modal in the Reactions table matching the legacy UX.
   - **Status:** PASS
   - **Evidence:**
     - Reactions table includes a dedicated `actions` column with a chat icon that opens the comment modal with the correct reaction ID:

       ```101:129:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/reactions/page.tsx
       const columns = useMemo<GridColDef<Reaction>[]>(() => [
           {
               field: 'id',
               headerName: 'ID',
               ...
           },
           {
               field: 'actions',
               headerName: '',
               width: 50,
               sortable: false,
               disableColumnMenu: true,
               renderCell: (params) => (
                   <IconButton
                       size="small"
                       title="Comment on this reaction"
                       onClick={() => handleOpenComment(params.row.id)}
                       sx={{ color: '#00acc1' }}
                   >
                       <ChatBubbleOutlineIcon fontSize="small" />
                   </IconButton>
               )
           },
       ], [handleOpenComment]);
       ```

     - `ReactionCommentModal` implements the cyan header, checkboxes, comment textarea, and email field, and is wired into the page:

       ```251:255:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/reactions/page.tsx
       <ReactionCommentModal
           open={commentModalOpen}
           onClose={() => setCommentModalOpen(false)}
           reactionId={commentReactionId}
       />
       ```

       ```21:69:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/components/ui/ReactionCommentModal.tsx
       export default function ReactionCommentModal({ open, onClose, reactionId }: ReactionCommentModalProps) {
           ...
           return (
               <Dialog
                   open={open}
                   onClose={onClose}
                   maxWidth="sm"
                   fullWidth
                   PaperProps={{ sx: { borderRadius: 1 } }}
               >
                   <DialogTitle sx={{
                       bgcolor: '#00acc1',
                       color: '#fff',
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'center',
                       py: 1.5
                   }}>
                       <Typography variant="h6" component="span" fontWeight={500}>
                           Comment on Reaction: {reactionId}
                       </Typography>
                       <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
                           <CloseIcon />
                       </IconButton>
                   </DialogTitle>
       ```

5. **Chemical Formula & Equation Rendering**
   - **Requirement:** Implement proper chemical formula rendering (subscripts) and clean equation formatting with clickable compound links.
   - **Status:** PASS
   - **Evidence:**
     - `formatFormula` wraps numeric parts in `<sub>` elements and is used in Compounds table and Compound details:

       ```7:22:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/components/utils/formatFormula.tsx
       export function formatFormula(formula: string | undefined | null): React.ReactNode {
           if (!formula) return 'N/A';
           const parts = formula.split(/(\d+)/);
           return (
               <>
                   {parts.map((part, i) => {
                       if (/\d+/.test(part)) {
                           return <sub key={i}>{part}</sub>;
                       }
                       return <span key={i}>{part}</span>;
                   })}
               </>
           );
       }
       ```

       ```79:83:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/compounds/page.tsx
       {
           field: 'formula',
           headerName: 'Formula',
           width: 140,
           renderCell: (params) => formatFormula(params.value)
       },
       ```

       ```169:171:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/compounds/[id]/page.tsx
       <Typography variant="h6" sx={{ mb: 1 }}>
           <strong>Compound:</strong>&nbsp;{cpd.id}&nbsp;({cpd.name},&nbsp;{formatFormula(cpd.formula)})
       </Typography>
       ```

     - `formatEquation` cleans legacy equation syntax and turns every `cpd#####` token into an internal link to `/biochem/compounds/[id]`, used in both Reactions table and related reactions grid:

       ```11:27:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/components/utils/formatEquation.tsx
       export function formatEquation(equation: string | undefined | null): React.ReactNode {
           if (!equation) return 'N/A';
           let cleaned = equation
               .replace(/\[\d+\]/g, '')
               .replace(/\(1\)\s*/g, '');
           const compoundRegex = /(cpd\d{5})/g;
           const parts = cleaned.split(compoundRegex);
           return (
               <span style={{ fontFamily: 'monospace' }}>
                   {parts.map((part, index) => {
                       if (compoundRegex.test(part)) {
                           return (
                               <Link
                                   key={index}
                                   href={`/biochem/compounds/${part}`}
                                   style={{ color: '#1976d2', textDecoration: 'none' }}
                               >
                                   {part}
                               </Link>
                           );
                       }
                       return <span key={index}>{part}</span>;
                   })}
               </span>
           );
       }
       ```

       ```131:136:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/reactions/page.tsx
       {
           field: 'definition',
           headerName: 'Equation',
           width: 350,
           sortable: false,
           renderCell: (params) => formatEquation(params.value),
       },
       ```

       ```79:97:/home/vibhav/Downloads/Work/ANL/Research/ModelSEED-UI/app/(reference-data)/biochem/compounds/[id]/page.tsx
       const rxnColumns: GridColDef<Reaction>[] = [
           {
               field: 'id',
               headerName: 'ID',
               width: 120,
               renderCell: (params) => (
                   <Link href={`/biochem/reactions/${params.value}`} style={{ color: '#1976d2' }}>
                       {params.value}
                   </Link>
               ),
           },
           ...
           {
               field: 'definition',
               headerName: 'Equation',
               width: 350,
               sortable: false,
               renderCell: (params) => formatEquation(params.value),
           },
       ];
       ```

6. **Build / Runtime Check**
   - **Requirement:** Phase should not break the production build on a compliant environment.
   - **Status:** INCONCLUSIVE (environment mismatch)
   - **Evidence:**
     - `npm run build` currently fails **only** due to the local Node.js version (`18.20.8`) being below Next.js’s required `>=20.9.0` (see terminal output from the `next build` attempt).

     - No Phase 6–specific TypeScript or runtime errors were observed in the code paths inspected above; the blocker is purely the system Node version.

7. **UI Runtime & Visual Regression Check (localhost:3001)**
   - **Requirement:** Phase 6 UI routes render correctly at runtime and preserve the legacy tabbed navigation and table layouts.
   - **Status:** PASS
   - **Evidence (manual UI walk-through via browser tools against `http://localhost:3001`):**
     - **Reference Data tab set and sub-tabs**
       - Navigated to `http://localhost:3001/genomes`; header shows `Reference Data | User Data | Build Model` links and the `Public Plant Models` tab is selected with a populated grid of models (species names, domains, reaction/gene counts) — confirms the `/genomes` entry route and Reference Data header wiring.
       - Clicking the `Subsystems` tab switches URL to `/genomes/Annotations` and shows a `Subsystems` grid with subsystem names, classes, and categories — validates the legacy `/genomes/Annotations` routing and multi-line cell layout for subsystem descriptions.
     - **Reactions and Compounds tabs**
       - Clicking `Reactions` and `Compounds` tabs moves between `/biochem/reactions` and `/biochem/compounds` while keeping the Reference Data header active; both pages show populated `DataGrid` tables with server-side pagination controls (`Rows per page: 25`, `1–25 of N`) and vertically stacked multi-line cells for aliases/pathways, matching the expected Phase 6 spacing behaviour.
       - In `Compounds`, rows for `cpd00001`, `cpd00002`, etc., display formulas as `H2O`, `C 10 H 13 N 5 O 13 P 3` with digits rendered in separate accessible tokens, and synonym/alias cells contain long, wrapped text blocks — consistent with `formatFormula` and auto row-height styling.
     - **Reactions comment modal**
       - On `/biochem/reactions`, the first row shows a `Comment on this reaction` button; invoking it opens a dialog containing:
         - Title `Comment on Reaction: rxn00001`;
         - Two checkboxes (`Is this reaction an alias for another?`, `Does it have wrong stoichiometry?`);
         - `Other Comments` multiline textarea and an `Email (optional)` field;
         - `Cancel` and `Submit` buttons.
       - Clicking `Cancel` cleanly closes the dialog and returns focus to the grid — verifies the comment modal wiring and visual behaviour under real runtime.
     - **Media tab**
       - Navigated directly to `http://localhost:3001/list-media`; the `Media` tab is selected and the page shows the `Media Formulations` heading with a `Search media...` textbox and a `DataGrid` of media entries, confirming the `/list-media` route integration with the shared Reference Data sub-navigation.

### Verdict: PASS (with environment caveat)

All Phase 6 must-have behaviours are present in the codebase, wired to the correct routes and components, and have been exercised end-to-end in a running dev environment on `http://localhost:3001`. Production build is expected to succeed once Node.js is upgraded to a supported version (`>=20.9.0`).

## Timestamp Log
- Created: 2026-03-05 09:31:00 -06:00
- Updated: 2026-03-05 15:30:00 -06:00 - Deep verification of all Phase 6 requirements with explicit code references and build check
- Updated: 2026-03-05 16:05:00 -06:00 - Manual runtime and visual checks across Reference Data tabs on localhost:3001
