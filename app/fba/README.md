# FBA Results (`app/fba`)

> Flux Balance Analysis results detail view with reaction flux data.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **FBA detail** | `[...path]/page.tsx` | Flux results with reaction table and visualization |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    app/fba (This Layer)                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [...path]/page.tsx - FBA results with tabs:         ││
│  │  Overview, Reaction Fluxes, Knockouts, Phenotype  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      API Layer                            │
│        lib/api/workspace.ts (workspaceGet)              │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Workspace Fetch**: FBA object loaded via `workspaceGet`
2. **Data Parsing**: Flux values extracted into reaction flux rows
3. **Tab Navigation**: Switch between Overview, Fluxes, Knockouts, Phenotype
4. **Visualization**: Display flux values with objective function result

## File Reference

### [...path]/page.tsx

**Purpose**: FBA simulation results viewer.

**Route Parameter**:
| Param | Type | Description |
|-------|------|-------------|
| `path` | `string[]` | Workspace path to FBA object |

**Tabs:**
| Tab | Description |
|-----|-------------|
| Overview | FBA parameters, objective value, solution status |
| Reaction Fluxes | Individual reaction flux values |
| Knockouts | Gene knockout predictions (if available) |
| Phenotype | Predicted growth phenotype |

**Key Data:**
- `objective_value`: Optimization target (e.g., biomass flux)
- `FBAReactionVariables`: Per-reaction flux values
- `media`: Growth medium used
- `model_ref`: Associated metabolic model

---

**Related:**
- Model detail: [`app/model/`](../model/)
- Gapfill detail: [`app/gapfill/`](../gapfill/)
- Main app README: [`../README.md`](../README.md)

## Scientific Context

Flux Balance Analysis (FBA) predicts metabolic fluxes through a network by solving a linear programming problem that optimizes an objective function (typically biomass production) subject to mass balance constraints.