# Biochemistry & Scientific Data Strategy (`BIOCHEMISTRY.md`)

This document defines how **Biological Information** (Reactions, Compounds, and Media) is managed, searched, and visualized in the ModelSEED-UI.

---

## 🧬 Data Sources: The Solr Biochemistry Index

To support fast, sub-second searching of tens of thousands of reagents, the ModelSEED-UI fetches its biochemistry reference library from a **Solr core**.

### 🔍 API Consumption (`lib/api/biochem.ts`)
The `getReactions` and `getCompounds` methods in this file are high-level wrappers for the Solr API. They handle:
1.  **Pagination**: Fetching only 25 or 50 records at a time.
2.  **Sorting**: Dynamically adjusting Solr sort params (e.g., `sort: id asc`).
3.  **Filtering**: Converting MUI DataGrid filters into Solr-safe queries.

---

## 🔬 Scientific Logic: Chemical Equation Formatting

Reaction definitions in ModelSEED are typically stored as plain text with stoichiometry and IDs:
- **Stored string**: `(2) cpd00001[0] + cpd00002[0] <=> cpd00003[0] + cpd00004[0]`

In the UI, these must be rendered with proper **Chemical Notation** and **Hyperlinked Compounds**.

### 📜 The `ChemicalEquation` Component (`components/ui/ChemicalEquation.tsx`)

This component uses a specialized **Regex Engine** to transform raw text into a React tree:

1.  **Subscript Logic**: It identifies formula subscripts (like the `2` in `H2O`) using a regex that checks for digits following a letter.
    - **Scientific Correctness**: It *ignores* digits inside parentheses (like stoichiometric coefficients) to avoid incorrect rendering (e.g., `(2)` stays `(2)`, but `H2` becomes `H₂`).
2.  **ID Linking**: It identifies KBase/ModelSEED compound IDs (e.g., `cpd00001`) and automatically renders them as `<Link>` tags pointing to the compound detail pages.
3.  **Compartment Parsing**: It strips or formats compartment tags (like `[0]` or `[c]`) for better readability.

---

## 🧪 External Cross-References

ModelSEED identifiers are linked to the global biological ecosystem. We provide helpers in the `EXTERNAL_DBS` constant for:
- **KEGG**: Kyoto Encyclopedia of Genes and Genomes.
- **BiGG**: A database of Biologically Knowledge-Base Genome-Scale Metabolic Models.
- **MetaCyc**: Metabolic pathways and enzymes.

Linking to these external sites occurs in the detail views (`app/(reference-data)/biochem/reactions/[id]/page.tsx`).

---

## ⚡ Developer Guidelines for Biochem Data

1.  **Never render raw strings**: Always wrap reaction definitions in the `ChemicalEquation` component to handle subscripting.
2.  **Solr-First**: Avoid making local filtering logic if possible. Use the server-side Solr filtering in `lib/api/biochem.ts` for performance.
3.  **ID Integrity**: When linking to compounds, ensure the ID starts with `cpd` (e.g., `/biochem/compounds/cpd00001`).

---
*Refer to `SPEC.md` for specific chemistry rendering requirements.*
