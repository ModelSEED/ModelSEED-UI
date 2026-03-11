# App Directory (Routing & Pages)

This directory follows the **Next.js 16 App Router** convention. Folders with `page.tsx` represent routes.

## 🌉 Core Data Views (Legacy URL Parity)

These folders use **Catch-all Routes (`[...path]`)** to capture deeply nested paths and prevent broken legacy links:

| Route Path | Data Type | Component |
|------------|-----------|-----------|
| `/model` | Metabolic Models | `app/model/[...path]/page.tsx` |
| `/fba` | Flux Balance Analysis | `app/fba/[...path]/page.tsx` |
| `/genome` | Genome Annotations | `app/genome/[...path]/page.tsx` |
| `/feature` | Genomic Features (Genes) | `app/feature/[...path]/page.tsx` |
| `/gapfill` | GapFilling Results | `app/gapfill/[...path]/page.tsx` |
| `/data` | Workspace File Browser | `app/data/[...path]/page.tsx` |

> [!IMPORTANT]
> **Parameter Naming**: For a folder named `[...path]`, the `params` prop in the page component MUST be accessed as `params.path`. Using any other name (like `slug`) will result in `undefined` errors.

## 🧬 Reference Data

- **`biochem/`**: Biochemistry library including Compounds and Reactions (Solr-indexed).
- **`genomes/`**: Public genome repository (KBase-linked).
- **`list-media/`**: Public media directory.

## 🛡️ Authentication & User (Protected)

- **`auth/`**: Login, signup, and session management.
- **`my-models/`**: User-specific metabolic models.
- **`plant/`**: Build model and analysis workflow (requires authentication).

## 🛠️ Global Layout components

- **`layout.tsx`**: Root layout (includes Headers, AuthProvider, and QueryClient).
- **`page.tsx`**: The main landing page.

---
*Follow the [GSD Methodology](../.gsd/ROADMAP.md) for development.*
