# App Directory (Routing & Pages)

This directory follows the Next.js 16 App Router conventions. All application routes and pages are defined here.

## Route Map

| Route Path | Data Type | Component |
|------------|-----------|-----------|
| `/model` | Metabolic Models | `app/model/[...path]/page.tsx` |
| `/fba` | Flux Balance Analysis | `app/fba/[...path]/page.tsx` |
| `/genome` | Genome Annotations | `app/genome/[...path]/page.tsx` |
| `/feature` | Genomic Features (Genes) | `app/feature/[...path]/page.tsx` |
| `/gapfill` | GapFilling Results | `app/gapfill/[...path]/page.tsx` |
| `/data` | Workspace File Browser | `app/data/[...path]/page.tsx` |
| `/media` | Media Editor / Viewer | `app/media/[...path]/page.tsx` |

**Parameter Naming**: For a folder named `[...path]`, the `params` prop in the page component MUST be accessed as `params.path`.

## Reference Data Routes

- **`biochem/`**: Biochemistry libraries (Compounds and Reactions).
- **`genomes/`**: Public genome repository.
- **`list-media/`**: Public media directory.

## Authenticated User Routes

- **`auth/`**: Login, signup, and session management.
- **`my-models/`**: User-specific metabolic models.
- **`plant/`**: Build model workflow.

## Global Layouts

- **`layout.tsx`**: Root layout including Headers, AuthProvider, and QueryClient.
- **`page.tsx`**: Main landing page.
