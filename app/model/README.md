# Metabolism Model (`app/model`)

> Comprehensive metabolic model detail view with tabbed navigation.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Model detail** | `[...path]/page.tsx` | Tabbed view of reactions, compounds, genes, FBA, gapfill |
| **README** | `README.md` | This file |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   app/model (This Layer)                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [...path]/page.tsx - Tabbed model viewer with       ││
│  │ 10 tabs: Overview, Reactions, Compounds, Genes,    ││
│  │ Compartments, Biomass, Pathways, FBA, Gapfill,     ││
│  │ Edit Model                                          ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      API Layer                            │
│  lib/api/workspace.ts (workspaceGet, workspaceLs)       │
│  lib/api/modelseed.ts (getModelDataFromApi, jobs, etc) │
│  lib/api/biochem.ts (reaction/compound details)        │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Workspace Fetch**: Model object loaded via `workspaceGet` or `getModelDataFromApi`
2. **Data Building**: Raw model parsed into row arrays for each tab (reactions, compounds, etc.)
3. **Tab Rendering**: DataGrid displays each data type with custom columns
4. **Job Operations**: FBA/gapfill submitted via `submitFbaJobFromApi` / `submitGapfillJobFromApi`
5. **Edit Mode**: Changes tracked locally, applied via `editModelFromApi`

## File Reference

### [...path]/page.tsx

**Purpose**: Comprehensive metabolic model detail view.

**Route Parameter**:
| Param | Type | Description |
|-------|------|-------------|
| `path` | `string[]` | Workspace path to model object |

**Tabs:**
| Tab | Description | Key Functions |
|-----|-------------|---------------|
| Overview | Model metadata, organism, external links | `OrganismLinksCard` |
| Reactions | Metabolic reactions with equations | `ChemicalEquation` |
| Compounds | Metabolites with formula/charge | `formatFormula` |
| Genes | Gene-reaction associations | - |
| Compartments | Model compartments with pH/potential | - |
| Biomass | Biomass reaction compounds | - |
| Pathways | Pathway maps with reaction counts | - |
| FBA | Flux Balance Analysis results | `submitFbaJobFromApi` |
| Gapfill | Gapfilling solutions | `submitGapfillJobFromApi` |
| Edit Model | Inline reaction compound edits | `editModelFromApi` |

**Data Sources:**
- Model reactions: `modelreactions` or `reactions`
- Model compounds: `modelcompounds` or `compounds`
- Genes: `modelgenes` or `genes`
- FBA results: `fba_refs`, inline data, or workspace listing
- Gapfills: `gapfill_refs`, inline data, or workspace listing

**Helper Functions:**
- `buildReactionRows()`, `buildCompoundRows()`, `buildGeneRows()`
- `extractFbaRows()`, `extractGapfillRows()`
- `normalizeBiochemReactionId()`, `normalizeBiochemCompoundId()`

---

**Related:**
- Model comparison: [`app/compare/`](../compare/)
- FBA detail: [`app/fba/`](../fba/)
- Gapfill detail: [`app/gapfill/`](../gapfill/)
- Genome view: [`app/genome/`](../genome/)
- Main app README: [`../README.md`](../README.md)

## Scientific Context

Metabolic models represent the complete set of metabolic reactions in an organism. Key elements:
- **Reactions**: Catalyzed transformations with stoichiometry and directionality
- **Compounds**: Metabolites with chemical formulas and charges
- **Genes**: Protein-coding sequences associated with reactions (GPR)
- **Biomass**: Pseudo-reaction representing cellular growth requirements
- **Compartments**: Spatial organization (cytoplasm, periplasm, etc.)