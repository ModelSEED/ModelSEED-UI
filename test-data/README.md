# Test Data Directory (`/test-data`)

This directory contains static, offline snapshots of ModelSEED backend responses. These files are used for local testing, offline development, and unit test mocking.

## File Inventory

| File | Description | Size |
|------|-------------|------|
| `test-model.json` | Full representation of a GenomeScale model (e.g., 'Deinococcus soli' strain N5). | ~669KB |
| `test-fba.json` | FBA result metadata for `test-model`. Note that this snapshot lacks flux data. | ~2B |
| `test-fba-2.json` | Alternative FBA representation (minimal). | ~177B |
| `test-gapfill.json` | Gapfill solution array and metadata for `test-model`. | ~6KB |

## Backend Discrepancies and Mock Logic

When utilizing this data, be aware of known data structure anomalies returned from the API:

### Model Structure (`test-model.json`)
- **Biomass vs Biomasses**: The API returns an array named `biomasses` (plural). UI logic occasionally expects `biomass` (singular).
- **Genes**: Currently missing the `functions` field (only returns `id` and `name`).
- **Reactions**: Expected `equation`, `stoichiometry`, `gpr`, and `genes` are present.

### FBA Structure (`test-fba.json`)
- **Missing Flux Data**: The endpoint (`/api/models/fba`) only returns minimal summary parameters without reaction variables, compound variables, or the flux table.
- **Root Cause**: While the workspace contains `fba.0.fluxtbl` which holds flux data, the API currently doesn't merge or return it with the main FBA object check.

### Gapfill Structure (`test-gapfill.json`)
- Returns `solution_reactions` correctly, where each object details the gapfilled `reaction`, `direction`, and `compartment`.
