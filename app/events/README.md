# Events (`app/events`)

> Workshop and event pages for ModelSEED and PlantSEED activities.

## Quick Navigation

| Need | File | Description |
|------|------|-------------|
| **Events listing** | `page.tsx` | Workshop list with expand/collapse |
| **2018 workshop** | `plantseed2018/page.tsx` | Workshop details and materials |
| **2017 workshop** | `plantseed2017/page.tsx` | Workshop details and materials |
| **2016 workshop** | `plantseed2016/page.tsx` | Workshop details and materials |
| **2015 workshop** | `plantseed2015/page.tsx` | Workshop details and materials |
| **Styles** | `events.module.css` | Event page styling |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Next.js App Router pages)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   app/events (This Layer)                │
│  ┌─────────────┐  ┌──────────────────────────────────┐  │
│  │  page.tsx   │  │ plantseed2015-2018/              │  │
│  │  - listing  │  │  page.tsx (static content)       │  │
│  │  - expand   │  │  - agenda, materials, photos     │  │
│  └─────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Static Content**: All event pages use static content (no API calls)
2. **Toggle State**: `page.tsx` uses `useState` for expand/collapse of past events
3. **Navigation**: Next.js Link to individual event subpages

## File Reference

### page.tsx

**Purpose**: Events listing page with toggleable past events.

**Features**:
- Lists PlantSEED workshops 2015-2018
- Expandable section for 2015 (past events)
- Chronological order (newest first)

**State**: `expand: boolean` - toggles visibility of past events

### plantseed2015-2018/page.tsx

**Purpose**: Individual workshop detail pages.

**Content**:
- Workshop banner image
- Downloadable brochures/agendas (PDF)
- Event details (dates, location)
- Agenda/schedule (some pages)
- Photo gallery (some pages)

**Workshops:**
| Year | Dates | Route |
|------|-------|-------|
| 2018 | August 16-17 | `/events/plantseed2018` |
| 2017 | August 17-18 | `/events/plantseed2017` |
| 2016 | August 4-5 | `/events/plantseed2016` |
| 2015 | August 13-14 | `/events/plantseed2015` |

---

**Related:**
- About page: [`app/about/`](../about/)
- Main app README: [`../README.md`](../README.md)

## Scientific Context

The PlantSEED workshops trained faculty, post-docs, and graduate students in computational metabolic modeling tools, with emphasis on recruitment from minority-serving institutions. Funded by NSF grants IOS-1025398 and IOS-1444202.