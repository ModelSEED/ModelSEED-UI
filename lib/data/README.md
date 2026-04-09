# lib/data

> Static datasets for ModelSEED UI display pages

## Overview

This folder contains hardcoded data used by UI pages. No runtime database queries — all data is bundled at build time.

## Files

| File | Content | Lines | Used By |
|------|---------|-------|---------|
| [`publications.ts`](#publicationsts) | ~100 ModelSEED-related publications | ~1,820 | About page citations |
| [`team.ts`](#teamts) | Team member profiles with categories | ~200 | About page team roster |

---

## publications.ts

**Purpose**: Curated list of scientific publications related to ModelSEED, PlantSEED, and metabolic modeling research.

### Interface

```ts
interface Publication {
  title: string;          // Full publication title
  authors: string[];      // Authors in citation format
  publication: string | null;  // Journal name (null if not in a journal)
  volumn?: string;        // Volume number (legacy spelling preserved)
  number?: string;        // Issue number
  pages?: string;         // Page range (e.g., "1487-1499")
  year?: number;          // Publication year
}
```

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `PUBLICATIONS` | `Publication[]` | Complete publication list (~100 entries) |

### Usage

```tsx
import { PUBLICATIONS } from '@/lib/data/publications';

export function PublicationsList() {
  return (
    <ul>
      {PUBLICATIONS.map((pub, i) => (
        <li key={i}>
          {pub.authors.join(', ')} ({pub.year}). {pub.title}.
          {pub.publication && ` ${pub.publication}`}
        </li>
      ))}
    </ul>
  );
}
```

### Notes

- Ordered roughly by relevance/importance
- Extracted from legacy AngularJS application
- Legacy property name `volumn` (not `volume`) preserved for compatibility

---

## team.ts

**Purpose**: Structured team member database for the About page, extracted from the legacy `app/views/docs/team.html`.

### Interfaces

```ts
interface TeamMember {
  name: string;           // Full name
  url?: string;           // Personal/professional website
  role?: string;          // Job title or role
  affiliation: string;    // Institution or organization
  affiliationUrl?: string; // Institution website
  imageSrc: string;       // Path to image (relative to /public)
  imageWidth?: number;    // Image width in pixels
  imageHeight?: number;   // Image height in pixels
}

interface TeamCategory {
  title: string;          // Category heading
  level: 'h3' | 'h4';    // Heading level for semantic HTML
  members: TeamMember[];  // Members in this category
}
```

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `TEAM_DATA` | `TeamCategory[]` | Team members grouped by category |
| `TEAM_INTRO` | `string` | HTML intro text for team page |

### Categories

| Category | Level | Description |
|----------|-------|-------------|
| Principal Investigators | h3 | Lead researchers |
| Partner PIs | h3 | Collaborating institution leads |
| Scientists | h3 | Research scientists |
| Developers | h3 | Software engineers |
| Contributors | h4 | External contributors |
| Alumni | h4 | Former team members |

### Usage

```tsx
import { TEAM_DATA, TEAM_INTRO } from '@/lib/data/team';

export function TeamPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: TEAM_INTRO }} />
      {TEAM_DATA.map((category) => (
        <section key={category.title}>
          <category.level>{category.title}</category.level>
          <div className="grid">
            {category.members.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
```

### Team Images

Images are stored in `/public/img/team/`. Reference them in `imageSrc` relative to `/public`:

```ts
{
  name: 'John Doe',
  imageSrc: '/img/team/john-doe.jpg',
  imageWidth: 150,
  imageHeight: 150
}
```

### Adding a Team Member

1. Add image to `/public/img/team/`
2. Add entry to the appropriate category in `TEAM_DATA`
3. Include all required fields (`name`, `affiliation`, `imageSrc`)
4. Optional fields (`url`, `role`, `affiliationUrl`, `imageWidth`, `imageHeight`) can be omitted

---

**Related:**
- Main lib README: [`../README.md`](../README.md)
- About page component: `app/about/team/page.tsx`
