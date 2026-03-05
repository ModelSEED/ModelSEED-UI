## Phase 6 Verification

### Must-Haves
- [x] **Legacy URL Structure** — All reference data links point to `/genomes`, `/biochem/reactions`, or `/biochem/compounds`. (Evidence: `AppHeader.tsx` and Page components updated).
- [x] **External Plant Links** — Model ID columns in Public Plant Models link to `modelseed.org/model/plantseed/plantseed/[id]`. (Evidence: `app/(reference-data)/genomes/page.tsx` column definition).
- [x] **Vertical Stacked Cells** — DataGrid allows multi-line content with dynamic row heights. (Evidence: `getRowHeight="auto"` used in Reactions and Compounds pages).
- [x] **Reaction Commenting** — Modal UI created matching legacy spec with 5+ error checkboxes. (Evidence: `components/ui/ReactionCommentModal.tsx`).
- [x] **Subscript Formatting** — Chemical formulas like `H2O` or `CO2` show numbers as subscripts. (Evidence: `formatFormula` utility integration).
- [x] **Equation Molecule Links** — Molecules inside reaction equations are individual internal links. (Evidence: `formatEquation` parsing logic).

### Verdict: PASS

## Timestamp Log
- Created: 2026-03-05 09:31:00 -06:00
