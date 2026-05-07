# Model Comparison (`app/compare`)

> Side-by-side comparison of metabolic models from user workspaces.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Comparison page** | `page.tsx` | Main comparison tool with tabs |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  app/compare (This Layer)                │
│  ┌─────────────────────────────────────────────────────┐│
│  │ page.tsx - Compare 2-3 models across reactions,      ││
│  │            compounds, genes with overlap stats       ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      API Layer                            │
│         lib/api/modelseed.ts (getModelDetailBundle)     │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **URL Parsing**: Model refs extracted from `?models=` query param (comma-separated, max 3)
2. **Parallel Fetch**: Models loaded in parallel via React Query
3. **Data Extraction**: Reactions, compounds, genes parsed from model bundle
4. **Comparison Build**: Union of all entities with presence flags per model
5. **Tab Navigation**: Switch between Reactions, Compounds, Genes, Summary views

## File Reference

### page.tsx

**Purpose**: Model comparison tool for analyzing metabolic model differences.

**URL Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `models` | `string` | Comma-separated workspace paths (max 3) |

**Features:**
- Parallel model fetching with React Query
- Dynamic column generation based on model count
- Presence indicators (✓ or —) per model
- Overlap statistics in Summary tab
- Error handling with partial data support

**Tabs:**
| Tab | Description |
|-----|-------------|
| Reactions | Compare metabolic reactions across models |
| Compounds | Compare metabolites across models |
| Genes | Compare gene associations across models |
| Summary | Overview with overlap statistics |

**Usage:**
```tsx
// Navigate with models to compare
router.push('/compare?models=/user@domain/workspace/model1,/user@domain/workspace/model2');
```

---

**Related:**
- Model detail: [`app/model/`](../model/)
- FBA results: [`app/fba/`](../fba/)
- Main app README: [`../README.md`](../README.md)