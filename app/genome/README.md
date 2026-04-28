# Genome & Features (`app/genome` & `app/feature`)

> Genome annotation views displaying features, roles, and subsystems from user workspaces.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Genome listing** | `genome/[...path]/page.tsx` | Features and annotations overview |
| **Feature detail** | `feature/[...path]/page.tsx` | Individual gene/feature view |
| **This README** | `genome/README.md` | Combined documentation |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                app/genome & app/feature                  │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │
│  │ genome/[...path]/page.tsx│  │feature/[...path]/page│ │
│  │  - Features DataGrid     │  │  - Feature detail    │ │
│  │  - Annotations tab       │  │  - Linked genome     │ │
│  └─────────────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      API Layer                            │
│        lib/api/workspace.ts (workspaceGet)              │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Workspace Fetch**: Genome data loaded via `workspaceGet` from user workspace
2. **Feature Parsing**: Raw feature array parsed into typed `GenomeFeature` objects
3. **Annotation Derivation**: Roles/subsystems extracted from feature metadata
4. **Tab Navigation**: Switch between Features (raw) and Annotations (derived) views
5. **Grid Display**: DataGrid with sorting, filtering, pagination

## File Reference

### genome/[...path]/page.tsx

**Purpose**: Genome detail view with features and annotations.

**Route Parameter**:
| Param | Type | Description |
|-------|------|-------------|
| `path` | `string[]` | Workspace path segments |

**Data Source**: Workspace object with `features` array containing:
- `id`, `type`, `function`, `location`, `aliases`

**Tabs:**
| Tab | Description |
|-----|-------------|
| Features | Raw genome features with ID, type, function, location |
| Annotations | Derived roles/subsystems from features |

**Types:**
```typescript
interface GenomeFeature {
  id: string;
  featureId: string;
  type: string;
  func: string;
  location: string;
  aliases: string;
}

interface GenomeAnnotation {
  id: string;
  feature: string;
  role: string;
  subsystem: string;
}
```

### feature/[...path]/page.tsx

**Purpose**: Individual gene/feature detail view.

**Route Parameter**:
| Param | Type | Description |
|-------|------|-------------|
| `path` | `string[]` | Workspace path to feature object |

**Features:**
- Displays detailed feature information
- Links back to parent genome
- Shows functional annotations and aliases

---

**Related:**
- Model view: [`app/model/`](../model/)
- API layer: [`lib/api/workspace.ts`](../../lib/api/workspace.ts)
- Main app README: [`../README.md`](../README.md)

## Scientific Context

Accurate genome annotation is the foundation for metabolic modeling. These views help researchers:
- Identify genomic evidence for metabolic reactions
- Trace genes to their functional roles in pathways
- Understand subsystem classifications for enzymes