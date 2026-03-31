# Library Directory (`/lib`)

The `/lib` folder contains the **Core Business Logic**, **API Clients**, and **Theming** for the ModelSEED-UI application.

## Key Folders and Files

| Folder/File | Description |
|-----------|-------------|
| `api/` | API clients: strict type-safe interfaces for the Solr biochemistry index, Workspace JSON-RPC, Poplar proxy, and `modelseed-api`. |
| `data/` | **Seed Data**: Static biological libraries used as defaults or fallback states. |
| `theme.ts` | **Design System**: Defines the project palette and MUI v7 component overrides. Avoid injecting raw CSS or standard inline styling. |
| `store/` | **Zustand State**: Global stores for UI states (e.g. sidebar toggles, application-wide user preferences). |

## API Interaction Hierarchy
- **`modelseed.ts`**: REST client for `MODELSEED_API_URL`. Used for User Models, FBA Jobs, Gapfills, and Media endpoints.
- **`workspace.ts`**: High-level wrapper and data-normalization logic for the Workspace API, with JSON-RPC and REST proxy modes keyed by the `USE_NEW_PROXY` flag.
- **`biochem.ts`**: Main interface to the Solr biochemistry index. Handles high-performance searching, deduplication, and retrieval of biochemical reactions and compounds.
- **`auth.ts`**: Handles authentication handshakes against the RAST/PATRIC authentication services, processes token parsing, and manages secure session data in `localStorage`.

## Biological Utilities
- **`formatting.ts`**: Contains pure helper functions critical for formatting chemical identifiers, constructing strictly accurate human-readable scientific strings, and translating payload shapes between the heavily nested legacy architectures and the modern backend responses.

## Sub-directory Documentation
- For exhaustive guidelines on the API bindings, see `api/README.md`.
- For seed data composition, see `data/README.md`.

--- 
*Refer to the `.gsd/ROADMAP.md` and `docs/ARCHITECTURE.md` documents for wider architectural dependencies.*

## Timestamp Log
- Updated: 2026-03-31 16:00:00 CDT - Completed 100% legacy functional parity. Added `workspaceUpdateMetadata` using REST proxy in `workspace.ts`. Removed `any` typings to conform to strict TS constraints. All API wrapper components integrated cleanly into UI workflows.
