# Library Directory (`/lib`)

The `/lib` folder contains the **Core Business Logic**, **API Clients**, and **Theming** for the ModelSEED-UI application.

## Key Folders and Files

| Folder/File | Description |
|-----------|-------------|
| [`api/`](./api/README.md) | API clients: interfaces for the Solr biochemistry index, Workspace, and `modelseed-api`. |
| [`data/`](./data/README.md) | **Seed Data**: Static biological libraries used as defaults. |
| `theme.ts` | **Design System**: Defines the purple/cyan palette and MUI v7 component overrides. |
| `store/` | **Zustand State**: Global stores for UI states (sidebar, preferences). |

## API Interaction
- **`modelseed.ts`**: REST client for `MODELSEED_API_URL` (models, jobs, media, workspace proxy).
- **`workspace.ts`**: High-level wrapper and data-normalization logic for the Workspace API, with JSON-RPC and REST proxy modes keyed by `USE_NEW_PROXY`.
- **`biochem.ts`**: Main interface to the Solr biochemistry index. Handles high-performance searching and retrieval of reactions and compounds.
- **`auth.ts`**: Logic for communicating with the RAST/PATRIC authentication services, including token handling and secure session data.

## Biological Utilities
- **`formatting.ts`**: Contains helper functions for parsing chemical identifiers, creating human-readable scientific strings, and converting data types between the legacy and modern formats.

--- 
*Refer to `STACK.md` in the `.gsd/` folder for more architectural details.*

## Timestamp Log
- Updated: 2026-03-12 20:18:13 CDT - Documented `modelseed-api` and workspace proxy usage; removed emojis from headings.
