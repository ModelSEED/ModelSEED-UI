# Plan 2.1 Summary: Next.js Folder Structure & Routing Scaffold

## Work Completed
- Created 14 new route directories mapping every legacy Angular route to a Next.js App Router path.
- Each directory has a placeholder `page.tsx` that exports a default component (dynamic routes use async `params`).
- Created 7 route READMEs in `app/` explaining domain, legacy mapping, and sub-routes.
- Updated 3 existing READMEs (`components/`, `lib/`, `types/`) to reference MUI v7 and clarify planned structure.

## Route Map (15 total pages)

| Route | Type |
|---|---|
| `/` | ○ Static |
| `/about` | ○ Static |
| `/about/api` | ○ Static |
| `/about/data-sources` | ○ Static |
| `/about/faq` | ○ Static |
| `/about/version` | ○ Static |
| `/biochem` | ○ Static |
| `/biochem/[chem]` | ƒ Dynamic |
| `/biochem/compounds/[id]` | ƒ Dynamic |
| `/biochem/reactions/[id]` | ƒ Dynamic |
| `/events` | ○ Static |
| `/projects` | ○ Static |
| `/publications` | ○ Static |
| `/team` | ○ Static |
| `/team/[name]` | ƒ Dynamic |

## Verifications Performed
- `find app -name "page.tsx" | sort` — Confirmed 15 page files exist.
- `find app -name "README.md" | sort` — Confirmed 7 route READMEs exist.
- `npx next build` — Build succeeds, all 15 routes registered (11 static, 4 dynamic).

## Status
✅ Complete
