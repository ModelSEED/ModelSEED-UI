# About (`app/about`)

> Information pages about the ModelSEED project, including version, data sources, and funding.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **About landing** | `page.tsx` | Project description and funding sources |
| **Version info** | `version/page.tsx` | Version, changelog, service status |
| **Status table** | `version/StatusTable.tsx` | Backend service connectivity checker |
| **Data sources** | `data-sources/page.tsx` | External databases and resources |
| **Layout** | `layout.tsx` | Shared layout for about subpages |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   app/about (This Layer)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  page.tsx   │  │version/page.tsx│ │data-sources/  │  │
│  │  - funding  │  │  - changelog │  │   page.tsx    │  │
│  │  - about    │  │  - StatusTable│  │  - databases  │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Server Components**: `version/page.tsx` reads `CHANGELOG.md` via `fs.readFileSync`
2. **Client Components**: `StatusTable.tsx` pings services on mount
3. **Static Data**: `data-sources/page.tsx` uses static `DATA_SOURCES` array

## File Reference

### page.tsx

**Purpose**: About ModelSEED landing page.

**Content**: Project description and funding sources (DOE, NSF grants)

### version/page.tsx

**Purpose**: Version and changelog page.

**Server Function**: `getChangelog()` - reads `CHANGELOG.md` from project root

**Features**:
- Version badge (v3.0.0)
- Rendered Markdown changelog
- StatusTable component showing service connectivity

### version/StatusTable.tsx

**Purpose**: Service connectivity status checker.

**Services Checked**:
| Service | Endpoint | Auth Required |
|---------|----------|---------------|
| RAST Auth | p3.theseed.org | No |
| PATRIC Auth | user.patricbrc.org | No |
| Shock | p3.theseed.org/services/shock_api | No |
| SOLR | modelseed.org/solr | No |
| API | modelseed.org/api | No |
| ProbModelSEED | (configurable) | Yes |
| Workspace | (configurable) | Yes |

**Status Indicators**: ✓ (success), ✗ (error), — (unauth), loading

### data-sources/page.tsx

**Purpose**: External data sources documentation.

**Data Categories**:
- Biochemical data and metabolic maps (KEGG, MetaCyc, PlantCyc, Rhea)
- Genome annotations (SEED, RAST, MG-RAST)
- Plant Genomes (JGI Phytozome)
- Plant Gene Atlas (JGI Gene Atlas)

---

**Related:**
- Main app README: [`../README.md`](../README.md)
- API config: [`lib/api/config.ts`](../../lib/api/config.ts)
- Team page: [`../team/`](../team/)
- Publications: [`../publications/`](../publications/)