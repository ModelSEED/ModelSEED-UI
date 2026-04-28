# Media (`app/media`)

> Growth medium detail view and editor for metabolic modeling.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Media editor** | `[...path]/page.tsx` | Media composition viewer and editor |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   app/media (This Layer)                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [...path]/page.tsx - Media editor with compound    ││
│  │            table, save/export capabilities          ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      API Layer                            │
│  lib/api/workspace.ts (workspaceGet, workspaceCreate)   │
│  lib/api/biochem.ts (getCompoundsByIds)                │
│  lib/api/modelseed.ts (exportMediaFromApi)             │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Workspace Fetch**: Media object loaded via `workspaceGet`
2. **Compound Lookup**: Compound IDs resolved to names via `getCompoundsByIds`
3. **Editor Display**: MediaEditor component renders compound table
4. **Edit/Save**: Changes wrapped in AuthGuard, saved via `workspaceCreate`
5. **Export**: Media exported as TSV via `exportMediaFromApi`

## File Reference

### [...path]/page.tsx

**Purpose**: Media detail view with in-browser editing.

**Route Parameter**:
| Param | Type | Description |
|-------|------|-------------|
| `path` | `string[]` | Workspace path to media object |

**Features:**
- View media compound concentrations
- Edit compound values in place
- Save as new media (requires auth)
- Export to TSV format

**Authentication**: Write operations require login via AuthGuard.

**Components:**
- `MediaEditor` - Compound table with inline editing
- `SaveAsDialog` - Save-as-new media modal

---

**Related:**
- Public media: [`lib/api/modelseed.ts`](../../lib/api/modelseed.ts)
- Model detail: [`app/model/`](../model/)
- Main app README: [`../README.md`](../README.md)