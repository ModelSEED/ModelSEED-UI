---
updated_at: 2026-03-03T12:38:15-07:59
---

# GSD Decisions Log

## Phase 2 Decisions

**Date:** 2026-03-03

### Scope
- Phase 2 is scoped to: the **Home Page** (route `/`) only, including the shared application shell (Header/Navbar + Footer) that wraps all pages.
- Does **not** include implementing any linked pages (Team, Publications, Projects, etc.) — buttons and nav links will be rendered but will navigate to placeholder routes.
- Routing scaffolding will be set up so future phases can simply add `app/<route>/page.tsx` files.

### Approach
- **App Shell as Layout**: Header (navbar) and Footer will be React Server Components placed in `app/layout.tsx` (or a nested layout), so they persist across all future page navigations without re-rendering.
- **Home Page as `app/page.tsx`**: The root page component renders the hero/login section, features grid, mailing list CTA, "More Info" section.
- **Routing**: Use Next.js App Router file-system routing. All legacy Angular `ui-router` states map 1:1 to `app/` directories. Next.js `<Link>` replaces `ui-sref`.
- **Styling**: Use MUI components (AppBar, Button, TextField, Container, Grid, Box, Typography) themed via the existing `lib/theme.ts`. Section-specific styles use CSS Modules (e.g., `home.module.css`) for the splash/home page visual fidelity.
- **Assets**: All images already exist in `public/img/` and `public/img/home/`. Icomoon fonts are in `public/icomoon/`.

### Constraints
- No Angular code is reused — only the HTML structure and CSS values are referenced for pixel-accurate reproduction.
- Sign-in form is a UI-only stub for now (no auth integration until Phase 5).
- Mailing list form posts to the existing Mailchimp endpoint (preserved from legacy).
