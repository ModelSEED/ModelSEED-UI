# App Directory (`/app`)

Next.js App Router root. Each subdirectory maps to a URL route via file-system routing.

## Route Structure

| Route | Directory | Legacy Angular State |
|---|---|---|
| `/` | `app/page.tsx` | `main.home` |
| `/team` | `app/team/` | `main.team` |
| `/publications` | `app/publications/` | `main.publications` |
| `/projects` | `app/projects/` | `main.projects` |
| `/events` | `app/events/` | `main.events` |
| `/about` | `app/about/` | `main.about` |
| `/biochem` | `app/biochem/` | `app.biochem` |

## Conventions
- `layout.tsx` — Shared layout wrapper (Header + Footer)
- `page.tsx` — Route page component
- `*.module.css` — CSS Modules for page-specific styling
- Dynamic segments use `[param]` directories (e.g., `[name]`, `[id]`)
