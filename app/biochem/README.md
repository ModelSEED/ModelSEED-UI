# Biochemistry (`/biochem`)

Biochemistry data views: reactions, compounds, and individual detail pages.

- **Replaces:** `app.biochem` → `app/views/biochem/biochem.html`
- **Sub-routes:**
  - `/biochem/[chem]` — Filtered biochemistry view (reactions/compounds)
  - `/biochem/compounds/[id]` — Individual compound detail
  - `/biochem/reactions/[id]` — Individual reaction detail

> **Note:** External services depend on the `/biochem/compounds/:id` and `/biochem/reactions/:id` URLs. These paths must be preserved exactly.
