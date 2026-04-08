# ModelSEED Data Structures

Downloaded from API on 2026-03-30 for review.

## Files

- `test-model.json` - Full model data (669KB)
- `test-fba.json` - FBA results for Test model (empty)
- `test-fba-2.json` - FBA results for patrictest_121620 model (minimal)
- `test-gapfill.json` - Gapfill results for Test model

---

## Model Structure

**Endpoint:** `GET /api/models/data?ref=/seaver@patricbrc.org/modelseed/Test`

**Top-level keys:**
```json
{
  "ref": "/seaver@patricbrc.org/modelseed/Test",
  "id": "Test",
  "name": "'Deinococcus soli' Cha et al. 2014 strain N5",
  "organism_name": null,
  "taxonomy": null,
  "domain": null,
  "type": "GenomeScale",
  "source": "ModelSEED",
  "genome_ref": "/seaver@patricbrc.org/modelseed/Test/genome",
  "reactions": [...],
  "compounds": [...],
  "genes": [...],
  "compartments": [...],
  "biomasses": [...]
}
```

### Reactions
```json
{
  "id": "rxn02201_c0",
  "name": "2-amino-4-hydroxy-6-hydroxymethyl-7,8-dihydropteridine-diphosphate:4-aminobenzoate...",
  "stoichiometry": [
    [-1, "cpd00443_c0", "", 0, ""],
    [-1, "cpd02920_c0", "", 0, ""],
    [1, "cpd00012_c0", "", 0, ""],
    ...
  ],
  "direction": ">",
  "equation": "ABEE_c0 + 2-Amino-4-hydroxy-6-... => PPi_c0 + H+_c0 + Dihydropteroate_c0",
  "gpr": "fig|1309411.5.peg.2320 or fig|1309411.5.peg.2495",
  "genes": ["fig|1309411.5.peg.2320", "fig|1309411.5.peg.2495"]
}
```

**Note:** 
- Has `equation` field (human-readable) ✅
- Has `stoichiometry` array (for parsing) ✅
- Has `gpr` field ✅
- Has `genes` array ✅

### Compounds
```json
{
  "id": "cpd00001_c0",
  "name": "Cofactor",
  "formula": "C10H13N5O7P",
  "charge": null,
  "compartment": "c0"
}
```

### Genes
```json
{
  "id": "fig|1309411.5.peg.1",
  "name": "hypothetical protein"
}
```

**Note:** Genes do NOT have `functions` field - this is Issue #8

### Compartments
```json
{
  "id": "c0",
  "name": "Cytoplasm",
  "abbreviation": "c"
}
```

### Biomasses (note: plural!)
```json
{
  "id": "bio1",
  "name": "Biomass",
  "definition": "...",
  "compounds": [
    {"coefficient": -1, "modelcompound_ref": "~/modelcompounds/cpd00001_c0"},
    ...
  ]
}
```

**Note:** Field is `biomasses` (plural), not `biomass`

---

## FBA Structure

### API Endpoint Response
**Endpoint:** `GET /api/models/fba?ref=/seaver@patricbrc.org/modelseed/patrictest_121620`

The API returns ONLY minimal metadata:
```json
[
  {
    "rundate": "2026-03-27-19:17:49",
    "id": "fba.0",
    "ref": "...",
    "objective": 0,
    "media_ref": "Complete",
    "objective_function": "bio1"
  }
]
```

**Problem:** No flux data, no reaction variables, no compound variables.

### Full Workspace Contents

However, when we check the workspace DIRECTLY, there's MORE data stored:
```
/patrictest_121620/fba/
├── fba.0              (378KB)  - Main FBA object
├── fba.0.fluxtbl      (238KB)  - Tab-delimited flux table
└── fba.0.essentials   (4KB)    - Essential genes list
```

The **flux table (`fba.0.fluxtbl`)** contains 238KB of reaction flux data!

When fetched via workspace API:
```json
{
  "id": "fba.0",
  "model_ref": "...",
  "media_ref": "Complete",
  "objectiveValue": 0,
  "status": "optimal",
  "nonzero_fluxes": 0,
  "fluxes": {},  // Empty in this FBA object
  "rundate": "..."
}
```

Note: The main FBA object shows `fluxes: {}` - but there's a SEPARATE file `fba.0.fluxtbl` with the actual flux data!

### Root Cause

1. **API Issue:** `/api/models/fba` only returns summary metadata, doesn't fetch the flux table from `fba.0.fluxtbl`
2. **Data Issue:** The main `fba.0` object has empty `fluxes: {}` - the actual flux data is stored separately in `fba.0.fluxtbl`

### What Needs Fixing

Backend needs to either:
1. Include flux data when returning FBA results (fetch from `fba.0.fluxtbl`)
2. Or populate the `fluxes` field in the main `fba.0` object when saving FBA results

---

## Gapfill Structure

**Endpoint:** `GET /api/models/gapfills?ref=/seaver@patricbrc.org/modelseed/Test`

```json
[
  {
    "rundate": "",
    "id": "gf.0",
    "ref": "/seaver@patricbrc.org/modelseed/Test/gapfill.gf.0",
    "media_ref": "/chenry/public/modelsupport/patric-media/Complete||",
    "integrated": 1,
    "integrated_solution": "0",
    "solution_reactions": [
      [
        {"reaction": "rxn08669_c0", "direction": "<", "compartment": "c0"},
        {"reaction": "rxn08954_c0", "direction": ">", "compartment": "c0"},
        ...
      ]
    ]
  }
]
```

**Note:**
- Has `solution_reactions` array with gapfilled reactions
- Each reaction has `reaction`, `direction`, `compartment`
- Can be parsed to display in Gapfill tab

---

## Issues Found

1. **Biomass field name** - API returns `biomasses` (plural), UI may look for `biomass`
2. **Gene functions** - Genes only have `id` and `name`, no `functions`
3. **FBA data minimal** - No flux/variable data returned from API
4. **Reaction equation** - Has `equation` field ✅ (was Issue #3 - appears fixed in API)

---

## UI Field Mapping

| UI Expects | API Returns | Status |
|------------|-------------|--------|
| `biomass` | `biomasses` | Need fix |
| `equation` | `equation` | ✅ Works |
| `stoichiometry` | `stoichiometry` | ✅ Works |
| `gpr` | `gpr` | ✅ Works |
| `genes[].functions` | Not present | Need backend |
| `FBAReactionVariables` | Not in FBA response | Need backend |
