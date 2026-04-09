# Projects (`app/projects`)

> Research projects and prototypes related to ModelSEED metabolic analysis tools.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Projects hub** | `page.tsx` | Main listing with external/internal projects |
| **Regulons** | `regulons/page.tsx` | Bacillus subtilis regulatory network |
| **Fusions** | `fusions/page.tsx` | Metabolic pathway fusion analysis |
| **Styles** | `projects.module.css` | Project card styling |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  app/projects (This Layer)              │
│  ┌─────────────┐  ┌──────────────────────────────────┐  │
│  │  page.tsx   │  │  regulons/, fusions/             │  │
│  │  - hub      │  │   page.tsx (detail views)        │  │
│  │  - cards    │  └──────────────────────────────────┘  │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Static Content**: All project pages use static content
2. **External Links**: Some projects link to external databases (KOMODO, MINE, Core Models)
3. **Internal Routes**: Regulons and Fusions have dedicated detail pages

## File Reference

### page.tsx

**Purpose**: Projects hub listing all research projects.

**Projects:**
| Project | Type | Description |
|---------|------|-------------|
| Fusions | Internal | Analysis of frequent fusion events in metabolic pathways |
| KOMODO | External | Known Media Database for microbial media recommendation |
| Regulons | Internal | Bacillus subtilis regulatory network visualization |
| MINE | External | Metabolic In Silico Network Expansion Databases |
| Core Models | External | High Quality Central Carbon Core Metabolic Models |

### regulons/page.tsx

**Purpose**: Regulatory network detail page for Bacillus subtilis.

**Content**: 
- Back button to projects hub
- Project description and paper reference
- Data visualization placeholder

### fusions/page.tsx

**Purpose**: Gene fusion analysis detail page.

**Content**:
- Back button to projects hub
- Project description
- Analysis results table/charts placeholder

---

**Related:**
- About page: [`app/about/`](../about/)
- Main app README: [`../README.md`](../README.md)

## Scientific Context

These projects represent metabolic analysis research beyond the core ModelSEED functionality:
- **Regulons**: Regulatory network reconstruction and gene expression reconciliation
- **Fusions**: Identification of enzyme fusions as evolutionary metabolic shortcuts
- **MINE**: Computational expansion of known metabolic databases
- **KOMODO**: Machine learning for media recommendation