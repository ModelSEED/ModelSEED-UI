---
phase: 6
plan: 3
wave: 1
---

# Plan 6.3: Chemical Formulas & Equations Parsing

## Objective
Convert string formulas like `H2O` or `CO2` into properly formatted React structural blocks mapping the stoichiometric integers to HTML `<sub>` formats. Further, reaction equations must map individual compound IDs as active links `<Link href="https://modelseed.org/biochem/compounds/cpd...">{molecule}</Link>`.

## Context
- .gsd/SPEC.md
- User requested equations in Reactions tab map to the proper links. "the only link to be applied is the equation molecule link https://modelseed.org/biochem/compounds/cpd00001" 
- Compounds tab has a "Formula" column, currently rendering without subscripts.

## Tasks

<task type="auto">
  <name>Format Chemical Formulas (Compounds & Details)</name>
  <files>
    - lib/utils/formatFormula.tsx
    - components/data-tables/BiochemCompoundsDataGrid.tsx
    - app/cpd/[id]/page.tsx
  </files>
  <action>
    - Create a reusable parser `lib/utils/formatFormula.tsx` to handle strings like `C12H22O11`.
    - It should regex map numbers to `<sub>{number}</sub>`. (Regex e.g. `/([A-Z][a-z]?)(\d*)/g`).
    - Use this utility in the DataGrid `Formula` column render function, and anywhere the Formula is displayed on the detailed `page.tsx` for compounds.
  </action>
  <verify>grep "formatFormula" components/data-tables/BiochemCompoundsDataGrid.tsx</verify>
  <done>Subscripts render correctly for all generic biochemistry formulas.</done>
</task>

<task type="auto">
  <name>Format Equation Links (Reactions Grid)</name>
  <files>
    - lib/utils/formatEquation.tsx
    - components/data-tables/BiochemReactionsDataGrid.tsx
  </files>
  <action>
    - Create a parser for equations. A reaction equation follows standard formats (e.g. `(1) cpd00001 + (1) cpd00012 <=> (2) cpd00009 + (1) cpd00067 ...`). Note: In legacy, equation terms render with the *name* (like `H2O + PPi <=> 2 Phosphate + H+`) and link to the exact path. So the parser actually needs to render `H2O + 3 H+ + Allophanate <=> 2 CO2 + 2 NH3`-style strings. Note: if the string rendered is just the name, and the underlying data contains the CPD IDs, logic might be bound to the API response structure (`equation_parsed` versus `equation`).
    - The task requires mapping the React equation display such that molecules link precisely to `https://modelseed.org/biochem/compounds/cpdXXXXX` (or internal routes based on Plan 1 decisions). The text itself should wrap in the `formatFormula` logic (for `H2O` or `CO2`).
    - Use the parser in `BiochemReactionsDataGrid.tsx` for the Equation column.
  </action>
  <verify>grep "formatEquation" components/data-tables/BiochemReactionsDataGrid.tsx</verify>
  <done>Reaction equations have accurate hyperlinks specifically for molecules, while stoich coefficients and operators `+`, `<=>` are unlinked.</done>
</task>

## Success Criteria
- [ ] Number substrings in `Formula` columns become `<sub>` tags correctly without breaking alphabetical symbols.
- [ ] Equation string components are separated, with the compound names acting as clickable hyperlinks wrapping the `formatFormula()` subscript parser, maintaining identical style/color from the legacy app.

## Timestamp Log
- Created: 2026-03-05 09:14:00 -06:00
