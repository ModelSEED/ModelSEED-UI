# Routing & Legacy Parity Strategy (`ROUTING.md`)

> **🤖 AI Agent Quick-Start**
> If you are creating a new route that previously existed in the AngularJS app, you **must** ensure the final URL structure matches perfectly. Use Next.js Route Groups `(group-name)` to organize code without affecting the URL.

This document defines the **URL Management Strategy** for ModelSEED-UI.

---

## 🔗 The Problem: Deep Nesting in Workspace Data
In the legacy ModelSEED UI, biological data objects like Models, FBA results, and Genomes were located at paths exactly matching their KBase Workspace location. These paths could be highly dynamic and deeply nested:

- **Legacy URL example**: `modelseed.org/model/user/my_models/folder_A/the_model_name`

## 🚏 The Solution: Catch-all Dynamic Routes
We use the **Next.js 16 Catch-all Routing** pattern (`[...path]`) to capture these dynamic segments and pass them as an array to a single page component.

### Route Mapping Matrix

| Legacy URL Pattern | New Next.js Page Location | Current Status |
| :--- | :--- | :--- |
| `/model/*` | `app/model/[...path]/page.tsx` | ✅ Functional |
| `/fba/*` | `app/fba/[...path]/page.tsx` | ✅ Functional |
| `/gapfill/*` | `app/gapfill/[...path]/page.tsx` | ✅ Functional |
| `/genome/*` | `app/genome/[...path]/page.tsx` | ✅ Functional |
| `/feature/*` | `app/feature/[...path]/page.tsx` | ✅ Functional |
| `/biochem/reactions/:id` | `app/(reference-data)/biochem/reactions/[id]/page.tsx` | ✅ Functional |
| `/data/*` | `app/data/[...path]/page.tsx` | ⚠️ Placeholder (Phase 30) |
| `/compare` | `app/compare/page.tsx` (Unbuilt) | ❌ Missing (Phase 30) |
| `/run/fba` | `app/run/fba/page.tsx` (Unbuilt) | ❌ Missing |

---

## 🛠️ Developer Implementation Protocol

When adding to or modifying catch-all routes:

1. **Folder Naming**: The dynamic folder MUST be named `[...path]`. Do not use `[slug]` or `[id]`.
2. **Accessing Parameters**: The `params` prop MUST be accessed via the standard Next.js 15+ async `use(params)` pattern:

```tsx
'use client';

import { use } from 'react';

export default function WorkspaceObjectPage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const fullWorkspacePath = '/' + resolvedParams.path.join('/');
    
    // Pass `fullWorkspacePath` to your useQuery hook
}
```

> [!CAUTION]
> **Workspace Paths start with `/`**. The `join('/')` method above does not prepend a slash. Always prepend the `/` before passing the path to the workspace API.

3. **Route Groups**: If you need a shared layout (like the User Data sidebar), wrap the folder in parentheses. Example: `app/(user-data)/my-models/page.tsx`. This keeps the URL as `/my-models`.
