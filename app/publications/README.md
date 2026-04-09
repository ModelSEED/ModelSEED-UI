# Publications (`app/publications`)

> Searchable publications list displaying ModelSEED-related research papers.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Publications list** | `page.tsx` | Searchable, filterable publication table |
| **Styles** | `publications.module.css` | Component styling |
| **Data source** | `lib/data/publications.ts` | Publication data and `Publication` type |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  app/publications (This Layer)          │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │     page.tsx        │  │ publications.module.css │  │
│  │  - search/filter    │  │  - table, highlights   │  │
│  │  - text highlight   │  │                         │  │
│  └─────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      Data Layer                           │
│             lib/data/publications.ts (types & data)     │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Data Import**: `page.tsx` imports `PUBLICATIONS` from `lib/data/publications`
2. **Author Processing**: Authors array joined into semicolon-separated string for display/filtering
3. **Search Filtering**: Filter by query across title, authors, publication, pages
4. **Sorting**: Sort by year (toggle between ascending/descending)
5. **Highlighting**: Matching text highlighted in search results

## File Reference

### page.tsx

**Purpose**: Searchable publications listing with text highlighting and year sorting.

**Features:**
- Real-time search across title, authors, publication venue, and pages
- Case-insensitive matching
- Text highlighting for matched terms
- Toggleable year sorting (newest first / oldest first)
- Client-side filtering (no API calls)

**Hooks Used:**
- `useState` - Query string, sort direction
- `useMemo` - Processed publications, filtered results

**Usage:**
```tsx
import { PUBLICATIONS } from '@/lib/data/publications';

// Rendered automatically via Next.js App Router
// Access at /publications
```

### publications.module.css

**Purpose**: CSS Module for publications page styling.

**Classes:**
| Class | Description |
|-------|-------------|
| `.container` | Page container with max-width and padding |
| `.searchRow` | Flex container for search input and toggle |
| `.searchInput` | Search field styling |
| `.yearToggle` | Clickable year sort toggle |
| `.pubTable` | Publication list table |
| `.publication` | Individual publication row |
| `.highlight` | Matched text highlighting style |
| `.noResults` | Empty state message |

## Adding New Publications

1. Add publication to `lib/data/publications.ts` in the `PUBLICATIONS` array
2. Maintain order by relevance/importance
3. Use consistent author format: `LastName, FirstName Middle`

**Publication fields:**
```typescript
interface Publication {
  title: string;           // Full title (required)
  authors: string[];       // Author list (required)
  publication: string | null; // Journal name or null
  volumn?: string;         // Volume (legacy spelling)
  number?: string;         // Issue number
  pages?: string;          // Page range (e.g., "1487-1499")
  year?: number;           // Publication year
}
```

---

**Related:**
- Data source: [`lib/data/publications.ts`](../../lib/data/publications.ts)
- Similar pattern: [`app/team/`](../team/) for team listing
- Main app README: [`../README.md`](../README.md)