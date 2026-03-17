# Biochemistry & Scientific Data Strategy (`BIOCHEMISTRY.md`)

> **🤖 AI Agent Quick-Start**
> When dealing with biochemical formulas, stoichiometry, or reaction strings, you **must** use the `<ChemicalEquation>` component. Never render raw chemical strings to the DOM.

This document defines how **Biological Information** (Reactions, Compounds, and Media) is managed, searched, and visualized in the ModelSEED-UI.

---

## 🔬 Scientific Logic: Chemical Equation Presentation

Unlike standard strings, biological data requires strict formatting to be scientifically accurate.

- **Raw String Example**: `(2) cpd00001[0] + cpd00002[0] <=> cpd00003[0] + H2O[0]`
- **Required Render**: `(2) cpd00001[0] + cpd00002[0] ⇌ cpd00003[0] + H₂O[0]`

### The `<ChemicalEquation>` Component
Located at `components/ui/ChemicalEquation.tsx`, this is a specialized React component that employs a regex engine to handle:

1. **Subscript Formatting**: Automatically converts numbers in chemical formulas (like `H2O`) into subscripts (`H₂O`). It explicitly ignores stoichiometric coefficients like `(2)`.
2. **Interactive ID Linking**: Detects `cpd*` and `rxn*` substrings and automatically wraps them in Next.js `<Link>` components pointing to `/biochem/compounds/[id]`.
3. **Compartment Parsing**: Formats or strips `[c]`, `[0]`, `[e]` compartment tags as needed by the UX.

> **Rule:** If you are rendering a `DataGrid` cell or a detail page heading that contains a compound formula or a reaction equation, you must wrap it in `<ChemicalEquation equation={rawString} />`.

---

## 📡 Data Fetching: The Solr Index vs Poplar

Biochemistry reference data (the master list of all known compounds and reactions) is **massive**.
Unlike user-specific Models or Jobs (which use `modelseed-api` via Poplar), Biochemistry tables are powered by a **Solr core**.

### API Client: `lib/api/biochem.ts`
This file contains the wrappers for Solr interaction:
- `getReactions()` and `getCompounds()`
- Handles server-side pagination, regex-based substring filtering from the DataGrid, and field sorting.

> **Rule:** Do not attempt to load the entire compound list into client memory. You must rely on Solr's server-side pagination and search capability via the `biochem.ts` abstractions.

---

## 🔗 External Cross-References (Aliases)

ModelSEED IDs are heavily mapped to other global biological databases. We process "aliases" on detail pages (`app/(reference-data)/biochem/...`).

When rendering aliases, ensure links are generated for:
- **KEGG**: Kyoto Encyclopedia of Genes and Genomes (`C00001`).
- **MetaCyc**: Metabolic pathways and enzymes.
- **BiGG**: Biologically Knowledge-Base Genome-Scale Metabolic Models.

*Consult the format functions inside the compound detail page `page.tsx` for exact URL template injection rules.*
