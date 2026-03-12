# Routing & Legacy Parity Strategy (`ROUTING.md`)

This document defines the **URL Management Strategy** for the ModelSEED-UI. A primary goal is **1:1 URL parity** with the legacy AngularJS application.

## The Problem: Deep Nesting in Workspace Data
In the legacy ModelSEED UI, biological data objects like Models, FBA results, and Genomes were located at paths matching their KBase Workspace location. These paths could be highly dynamic and deeply nested:

- **Legacy URL example**: `modelseed.org/model/user/my_models/folder_A/the_model_name`

## The Solution: Catch-all Dynamic Routes
We use the **Next.js 16 Catch-all Routing** pattern (`[...path]`) to capture these dynamic segments and pass them as an array to a single page component.

### Route Mapping Table

| Legacy URL Pattern | New Next.js Page Location | Implementation Type |
| :--- | :--- | :--- |
| `/model/*` | `app/model/[...path]/page.tsx` | Functional (Full Data + Tabs) |
| `/fba/*` | `app/fba/[...path]/page.tsx` | Placeholder (Phase 14 Target) |
| `/genome/*` | `app/genome/[...path]/page.tsx` | Layout Placeholder |
| `/feature/*` | `app/feature/[...path]/page.tsx` | Placeholder |
| `/gapfill/*` | `app/gapfill/[...path]/page.tsx` | Placeholder |
| `/data/*` | `app/data/[...path]/page.tsx` | Folder Browser Placeholder |

### Developer Implementation Details

When adding to or modifying these catch-all routes:

1.  **Naming Convention**: The folder MUST be named `[...path]`.
2.  **Accessing Parameters**: The `params` prop in the page component MUST be accessed as `params.path`.
    ```tsx
    // Correct Implementation
    export default function MyPage({ params }: { params: Promise<{ path: string[] }> }) {
        const resolvedParams = use(params);
        const fullPath = resolvedParams.path.join('/');
        // ... now use fullPath to fetch from Workspace API
    }
    ```
    > [!CAUTION]
    > **Do NOT use `slug`** or any other keyword unless the folder name is explicitly changed to match.

3.  **Root-Level Routes**: Non-dynamic pages like `/biochem`, `/about`, and `/auth` are defined as standard static routes or with single dynamic segments like `[id]` for specific biochemistry reactions.

---
*Maintained by the Advanced Agentic Coding team as part of Phase 13.*
