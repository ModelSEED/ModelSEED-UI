# Application Architecture & Tech Stack (`ARCHITECTURE.md`)

This document defines the **High-Level Design** and **Information Flow** for the Next.js 16 ModelSEED-UI application.

---

## 🏗️ High-Level Component Stack

ModelSEED-UI is a **Stateful, Client-First Single Page Application (SPA)** that uses Next.js as the routing framework.

- **Routing Engine**: [Next.js 16 (App Router)](https://nextjs.org/) — Handling catch-all biological paths.
- **UI Framework**: [MUI v7 (Beta)](https://mui.com/) — Providing a standardized, high-quality component set.
- **Data Engine**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query) — Managing the stateful caching of biological reactions, compounds, and workspace models.
- **State Store**: [Zustand](https://github.com/pmndrs/zustand) — Minimal, high-performance global store for UI state (sign-in, drawer, selected models).

---

## 🧬 Information Flow & Data Layer

The application interacts with multiple backend services to reconstruct biological models in the browser.

### 🌐 API Communication Logic
All API code is located in `lib/api/`.

1.  **JSON-RPC (Workspace API)**: Communicates with KBase’s Workspace service to fetch private and public models.
2.  **REST (Solr API)**: High-speed biochemistry searches (Reactions/Compounds).
3.  **Authentication (KBase Auth)**: Securely handles login tokens and sessions.

### 🔄 Data Fetching Lifecycle (React Query)
We use a **Search-First** approach to data fetching:

- **Step 1**: Component calls `useQuery()` with a unique `queryKey`.
- **Step 2**: The query logic in `lib/api/` executes the network request.
- **Step 3**: Data is cached in-memory and rendered.
- **Step 4**: Subsequent calls with the same key return the cached data instantly.

---

## 🛡️ Theme & Design System

The application uses a **Custom MUI v7 Theme** defined in `lib/theme.ts`.

- **Primary Colors**: Purple (`#7C4DFF`) and Cyan (`#00ACC1`).
- **Typography**: Optimized for data density (Inter/Roboto font choices).
- **Responsive Design**: Mobile-responsive layouts using MUI Grid and Box systems.

### 🛠️ Important Theme Components

- **`<Box>`**: Used for consistent spacing (`sx={{ p: 2, mb: 1, display: 'flex' }}`).
- **`<Container>`**: Centralizes the page content (typically set to `maxWidth="lg"` or `1400px`).
- **`<Divider>`**: Used to clearly separate biological data sections.

---

## ⚡ Developer Performance Guidelines

1.  **Server Components**: Whenever possible, use Server Components for SEO and faster initial data rendering.
2.  **Code Splitting**: Keep page-specific components inside their respective `app/` folders to ensure Next.js can split the JS bundle.
3.  **Selective Re-rendering**: Use the `useMemo` and `useCallback` hooks in complex DataGrid views to prevent sluggish table interactions.

---
*Refer to `SPEC.md` for the original project requirements.*
