# Components Directory (`/components`)

This directory contains the reusable building blocks of the ModelSEED-UI interface, primarily organized around MUI v7.

## Core Structure

| Folder | Description |
|-------|-------------|
| [`auth/`](./auth/README.md) | Authentication components, session management, and login flows. |
| [`layout/`](./layout/README.md) | Application shell wrappers such as headers and footers. |
| [`ui/`](./ui/README.md) | Standard reusable UI elements, data grids, and scientific formatters. |

## Notable Components

- **`ChemicalEquation`**: Formats chemical equations logically, handling subscripts formatting for standard outputs.
- **`GridHighlightText`**: Search term highlighter for robust table filtering visualization.
- **`AuthProvider`**: Manages global session state via Zustand context wrapping logic.
- **`RequireAuth`**: Routing guard component for protected views.

## Theming

All components inherit from the global MUI design theme defined in `lib/theme.ts`. Custom styling is managed via `sx` properties for consistency.
