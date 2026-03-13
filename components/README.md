# Components Directory (`/components`)

This directory contains the building blocks of the ModelSEED-UI interface. We follow the principle of **Atomic Design**, organized around **MUI v7**.

## Folder Structure

| Folder | Description |
|-------|-------------|
| [`auth/`](./auth/README.md) | **Authentication**: `AuthProvider`, `RequireAuth`, and sign-in modals. |
| [`layout/`](./layout/README.md) | **Shell**: `Header.tsx`, `AppHeader.tsx`, and other global layout wrappers. |
| [`ui/`](./ui/README.md) | **UI Primitives**: Reusable buttons, cards, and scientific formatters. |

## Scientific UI Components
- **`ChemicalEquation`**: A resilient regex-based component in `components/ui/` that correctly formats chemical formulas, distinguishing between formula subscripts (e.g., `C6`) and stoichiometric counts (e.g., `(2)`).
- **`GridHighlightText`**: Highlights search terms inside the DataGrid cells, making large scientific tables scannable.
- **`ReactionCommentModal`**: Handles user feedback on specific biochemistry reactions.

## Authentication Components
- **`AuthProvider`**: Manages the global KBase/ModelSEED session (Zustand + React Context).
- **`RequireAuth`**: Use this to wrap any component or page that should only be accessible to logged-in users.

## Themed Components
All components inherit the customized **ModelSEED Purple & Cyan** theme defined in `lib/theme.ts`.

--- 

## Timestamp Log
- Updated: 2026-03-11 00:00:00 CDT
- Updated: 2026-03-12 20:18:13 CDT - Removed emojis from headings; no behavioral changes.
