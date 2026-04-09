# Gapfill (`app/gapfill`)

> Gapfill solution detail view showing proposed metabolic reactions.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Gapfill detail** | `[...path]/page.tsx` | Proposed reactions and integration status |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  app/gapfill (This Layer)                │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [...path]/page.tsx - Gapfill solution with          ││
│  │  reaction table, integrate option                  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      API Layer                            │
│  lib/api/workspace.ts (workspaceGet, workspaceDownloadUrl)
│  lib/api/modelseed.ts (listModelGapfillsFromApi)        │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Workspace Fetch**: Gapfill object loaded via `workspaceGet`
2. **Data Parsing**: Proposed reactions extracted with direction, GPR, equation
3. **Display**: Table shows proposed reactions that fill metabolic gaps
4. **Integration**: Option to integrate solutions into parent model

## File Reference

### [...path]/page.tsx

**Purpose**: Gapfill solution viewer.

**Route Parameter**:
| Param | Type | Description |
|-------|------|-------------|
| `path` | `string[]` | Workspace path to gapfill object |

**Key Data:**
- `integrated`: Whether solution has been applied to model
- `media`: Growth medium used during gapfilling
- Proposed reactions with stoichiometry and GPR

**Actions:**
- View proposed reactions
- Integrate solution into model (requires auth)

---

**Related:**
- Model detail: [`app/model/`](../model/)
- FBA results: [`app/fba/`](../fba/)
- Main app README: [`../README.md`](../README.md)

## Scientific Context

Gapfilling identifies metabolic reactions that are missing from a model but required for growth on a specified medium. These can come from:
- Universal metabolic networks (BiochemDB)
- Genome annotations not captured in the original model
- Database-wide reaction databases