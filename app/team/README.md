# Team (`app/team`)

> Team page displaying ModelSEED collaborators and individual member profiles.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Team roster** | `page.tsx` | Main team listing with categories |
| **Member profile** | `[name]/page.tsx` | Individual team member page (placeholder) |
| **Styles** | `team.module.css` | Component styling |
| **Data source** | `lib/data/team.ts` | Team member data and types |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     app/team (This Layer)                │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │  page.tsx    │  │ [name]/page.tsx│  │team.module.css│ │
│  └──────────────┘  └────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      Data Layer                           │
│              lib/data/team.ts (types & data)            │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Page Render**: `page.tsx` imports `TEAM_DATA` and `TEAM_INTRO` from `lib/data/team`
2. **Category Mapping**: Categories are rendered with proper heading levels (`h3` for main, `h4` for subcategories)
3. **Member Display**: Each member renders with name, role, affiliation, and optional image
4. **External Links**: Member URLs and affiliation URLs open in new tabs

## File Reference

### page.tsx

**Purpose**: Main team listing page displaying all team members grouped by category.

**Props**: None (server component)

**Data Dependencies**:
- `TEAM_DATA: TeamCategory[]` - Array of category groups
- `TEAM_INTRO: string` - Introductory text

**Usage:**
```tsx
import { TEAM_DATA, TEAM_INTRO } from '@/lib/data/team';

// Rendered automatically via Next.js App Router
// Access at /team
```

### [name]/page.tsx

**Purpose**: Dynamic route for individual team member profiles.

**Route Parameter**:
| Param | Type | Description |
|-------|------|-------------|
| `name` | `string` | Team member identifier (URL slug) |

**Status**: Currently displays placeholder. Ready for future profile implementation.

### team.module.css

**Purpose**: CSS Module for team page styling.

**Classes**:
| Class | Description |
|-------|-------------|
| `.container` | Page container with max-width and padding |
| `.teamMember` | Flex container for individual member cards |
| `.sectionTitle` | Main category heading style |
| `.subSectionTitle` | Subcategory heading style |
| `.affiliationLink` | Styled links for affiliations |

## Adding New Team Members

1. Add member data to `lib/data/team.ts` under appropriate category
2. Place member image in `/public/img/team/` directory
3. Use consistent image dimensions (default: 160x160px)

**Member fields:**
```typescript
interface TeamMember {
  name: string;           // Full name (required)
  url?: string;          // Personal/professional website
  role?: string;         // Job title
  affiliation: string;  // Institution name
  affiliationUrl?: string; // Institution website
  imageSrc: string;      // Path to image (required)
  imageWidth?: number;   // Image width in pixels
  imageHeight?: number;  // Image height in pixels
}
```

---

**Related:**
- Data source: [`lib/data/team.ts`](../../lib/data/team.ts)
- Main app README: [`../README.md`](../README.md)
- Similar pattern: [`app/about/version/`](../about/version/) for version info