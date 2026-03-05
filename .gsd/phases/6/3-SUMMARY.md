---
phase: 6
plan: 3
wave: 1
status: complete
---

# Plan 6.3 Summary: Chemical Formulas & Equations

## Activities
- **Formula Parsing**:
    - Built `components/utils/formatFormula.tsx` using regex to wrap all stoichiometry integers in `<sub>` tags.
    - Applied the formula formatter to the **Compounds** table and the **Compound Details** page (Title and Properties).
- **Equation Parsing & Linking**:
    - Developed `components/utils/formatEquation.tsx`.
    - Implemented molecule ID detection (CPD links) within reaction definitions. 
    - Automated cleanup of ModelSEED equation syntax (`(1)` and `[0]` markers) for cleaner UI presentation.
    - Injected interactive links for all discovered compounds in the **Reactions** table and **Reaction Details** page.

## Verification
- Verified formulas render with subscripts.
- Verified reaction equations create clickable Molecule links pointing to `/biochem/compounds/[id]`.

## Status: COMPLETE

## Timestamp Log
- Created: 2026-03-05 09:30:00 -06:00
- Updated: 2026-03-05 09:30:00 -06:00 - Summary generated after execution.
