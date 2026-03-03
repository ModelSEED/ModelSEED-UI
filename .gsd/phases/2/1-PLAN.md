---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Next.js App Folder Structure & Routing Scaffold

## Objective
Establish the complete Next.js App Router directory structure that maps every legacy Angular route to a file-system route. Each directory gets a README.md explaining its domain, and a minimal placeholder `page.tsx` so routes resolve without 404s. This forms the backbone for all future page-by-page implementation.

## Context
- `.gsd/SPEC.md` — Tech stack and constraints
- `.gsd/ARCHITECTURE.md` — Data flow and conventions
- `.gsd/DECISIONS.md` — Phase 2 scope decisions
- `external/ModelSEED-UI/app/app.js` — Legacy route definitions (source of truth for URL mapping)
- `app/layout.tsx` — Existing root layout with ThemeProvider

## Route Mapping (Legacy → Next.js)

| Legacy Angular State | URL | Next.js Path |
|---|---|---|
| `main.home` | `/` | `app/page.tsx` |
| `main.team` | `/team` | `app/team/page.tsx` |
| `main.teamMember` | `/team/:name` | `app/team/[name]/page.tsx` |
| `main.publications` | `/publications` | `app/publications/page.tsx` |
| `main.projects` | `/projects` | `app/projects/page.tsx` |
| `main.events` | `/events` | `app/events/page.tsx` |
| `main.about` | `/about` | `app/about/page.tsx` |
| `main.about.version` | `/about/version` | `app/about/version/page.tsx` |
| `main.about.faq` | `/about/faq` | `app/about/faq/page.tsx` |
| `main.about.data` | `/about/data-sources` | `app/about/data-sources/page.tsx` |
| `main.api` | `/about/api` | `app/about/api/page.tsx` |
| `app.biochem0` | `/biochem` | `app/biochem/page.tsx` |
| `app.biochem` | `/biochem/:chem` | `app/biochem/[chem]/page.tsx` |
| `app.cpd` | `/biochem/compounds/:id` | `app/biochem/compounds/[id]/page.tsx` |
| `app.rxn` | `/biochem/reactions/:id` | `app/biochem/reactions/[id]/page.tsx` |

## Tasks

<task type="auto">
  <name>Create app/ route directories with placeholder pages</name>
  <files>
    app/team/page.tsx
    app/team/[name]/page.tsx
    app/publications/page.tsx
    app/projects/page.tsx
    app/events/page.tsx
    app/about/page.tsx
    app/about/version/page.tsx
    app/about/faq/page.tsx
    app/about/data-sources/page.tsx
    app/about/api/page.tsx
    app/biochem/page.tsx
    app/biochem/[chem]/page.tsx
    app/biochem/compounds/[id]/page.tsx
    app/biochem/reactions/[id]/page.tsx
  </files>
  <action>
    Create each directory and a `page.tsx` with a simple placeholder:
    ```tsx
    export default function PageName() {
        return <div>Page Name — Coming Soon</div>;
    }
    ```
    Each placeholder must export a default component so the route resolves.
  </action>
  <verify>Run `find app -name "page.tsx" | sort` to list all route files.</verify>
  <done>All 15 route files exist (including root page.tsx), `npm run build` succeeds without route errors.</done>
</task>

<task type="auto">
  <name>Create README.md for each app/ route directory</name>
  <files>
    app/README.md
    app/team/README.md
    app/publications/README.md
    app/projects/README.md
    app/events/README.md
    app/about/README.md
    app/biochem/README.md
    components/README.md (update)
    lib/README.md (update)
    types/README.md (update)
  </files>
  <action>
    Create a brief README.md in each route directory explaining:
    - What the route represents
    - What legacy Angular view it replaces
    - Key sub-routes (if any)

    Also update the existing components/, lib/, and types/ READMEs to
    reference MUI v7 (not v6) and clarify future organization with
    the layout/ subfolder for Header/Footer.
  </action>
  <verify>Run `find app -name "README.md" | sort` to list all READMEs.</verify>
  <done>Every route directory has a README.md. components/README.md references MUI v7.</done>
</task>

## Success Criteria
- [ ] All 14 new route directories + placeholder pages exist
- [ ] Every directory has a README.md
- [ ] `npm run build` succeeds without errors
- [ ] Navigating to any route in dev server shows a placeholder page (no 404)
