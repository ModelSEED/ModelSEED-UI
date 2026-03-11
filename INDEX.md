# ModelSEED-UI Documentation Index

Welcome to the ModelSEED-UI developer documentation. This project is a modern Next.js 16 reconstruction of the legacy ModelSEED AngularJS application, optimized for scientific data visualization and metabolic modeling.

---

## 🏗️ Architecture Overview

The application is built on the **Next.js 16 App Router**, utilizing a modern React ecosystem to handle high-volume scientific data from KBase and ModelSEED.

- **Framework**: [Next.js 16](https://nextjs.org/) (leveraging Server Components and optimized Client-side hydration).
- **UI Components**: [MUI v7 (Beta)](https://mui.com/) with a specialized scientific design system.
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query) for stateful caching and optimized API interactions.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) for minimal, performant global UI state.
- **Styling**: A combination of CSS Modules and MUI's `sx` system, themed with the signature **ModelSEED Purple & Cyan** palette.

---

## 📁 Project Directory Map

| Directory | Description |
|-----------|-------------|
| [`app/`](./app/README.md) | **Routing Root**: Contains all page definitions, layouts, and route handlers. |
| [`components/`](./components/README.md) | **UI components**: Reusable layouts, auth guards, and scientific data viewers. |
| [`lib/`](./lib/README.md) | **Internal Library**: API clients, biological utilities, and the project theme. |
| [`public/`](./public/README.md) | **Static Assets**: Logos, icons, and biological reference images. |
| [`.gsd/`](./.gsd/README.md) | **GSD Tracking**: Roadmap, state management, and architectural decisions. |
| [`types/`](./types/README.md) | **TypeScript**: Global type definitions for Compounds, Reactions, and Workspace objects. |

---

## 🔗 The Routing Strategy: Legacy Parity

One of the project's primary objectives is **Absolute URL Parity** with the legacy ModelSEED UI. This prevents over a decade of scientific citations from breaking.

### 🌉 Catch-all Routing (`[...path]`)
Biodata in ModelSEED (Models, FBA, Genomes) is identified by its **KBase Workspace Path**, which is naturally deeply nested. We handle this using Next.js catch-all routes:

- **Folder Structure**: `app/model/[...path]/page.tsx`
- **Captured URL**: `/model/user_id/my_work/my_model_name`
- **Result**: The code receives an array `path: ['user_id', 'my_work', 'my_model_name']`.

### 🗺️ Core Routing Locations

| Page Path | Purpose | State |
|-----------|---------|-------|
| `/biochem` | The global reference biochemistry library (Reactions/Compounds). | Active |
| `/model` | The main detail view for Metabolic Models. | Functional |
| `/fba` | View results of Flux Balance Analysis. | Placeholder (Phase 14) |
| `/genome` | View Genomic sequences and annotations. | Placeholder |
| `/data` | Browser for the KBase Workspace (Files/Objects). | Placeholder |

---

## � Key Component Patterns

### 🧬 Scientific Visualizers
We implement specialized components to handle biological data that standard libraries often miss:
- **`ChemicalEquation`**: Uses a complex regex engine to correctly subscript formulas while ignoring stoichiometric coefficients (e.g., `(2) H2O` → `(2) H₂O`).
- **`GridHighlightText`**: Automatically highlights filtered keywords within DataGrid cells for faster searching.

### 🛡️ Authentication Architecture
Authentication is managed via a shared **`AuthProvider`** in `components/auth/`.
- **Zustand Store**: Keeps the user's name and token globally available.
- **Protective Envelopes**: Pages requiring login are wrapped in the `<RequireAuth>` component, which displays a sign-in wall if the session is absent.

---

## 📑 Page Layouts & Tabs

Most high-level data views (like the Model or Genome pages) use a **Tabbed Navigation** pattern to keep complex data reachable.

### Model Page Tabs
The model view (`/model`) demonstrates our standardized tab structure:
1. **Reactions**: Functional list of metabolic transformations.
2. **Compounds**: List of all metabolites.
3. **Genes**: Genomic associations.
4. **Biomass**: The objective function for FBA.
5. **Pathways**: Higher-level metabolic groupings.

These tabs utilize MUI's `<Tabs>` component for consistent interaction across the entire suite of tools.

---

## 🛠️ Development Workflow

We follow a strict **GSD (Get Shit Done)** methodology to maintain production-grade quality:

1. **Strategic Planning**: Decompose requirements into Phases in `ROADMAP.md`.
2. **Execution State**: Track active work in `STATE.md`.
3. **Architectural Memory**: Log major design decisions in `DECISIONS.md`.
4. **Empirical Proof**: Every feature must be verified against the specification before being marked complete.

### 🧪 Getting Started
To start development, ensure you have the required environmental variables and run:
```bash
npm install
npm run dev
```

---
*Created by the Advanced Agentic Coding team. Last Updated: 2026-03-11*
