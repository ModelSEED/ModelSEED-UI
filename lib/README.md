# Library Directory (`/lib`)

The `/lib` folder contains the **Core Business Logic**, **API Clients**, and **Theming** for the ModelSEED-UI application.

## 📁 Key Folders & Files

| Folder/File | Description |
|-----------|-------------|
| [`api/`](./api/README.md) | **API Client**: Interfaces for the **Solr biochemistry index** and the **KBase Workspace service**. |
| [`data/`](./data/README.md) | **Seed Data**: Static biological libraries used as defaults. |
| `theme.ts` | **Design System**: Defines the purple/cyan palette and MUI v7 component overrides. |
| `store/` | **Zustand State**: Global stores for UI states (sidebar, preferences). |

## 🌐 API Interaction
- **`biochem.ts`**: The main interface to the **Solr biochemistry index**. Handles high-performance searching and retrieval of reactions and compounds.
- **`workspace.ts`**: Provides a high-level wrapper and data-normalization logic for the **KBase Workspace API**, the system that powers both public reference models and private user data.
- **`auth.ts`**: Implements the logic for communicating with the **KBase / ModelSEED authentication services**, including token handling and secure session data.

## 🧬 Biological Utilities
- **`formatting.ts`**: Contains helper functions for parsing chemical identifiers, creating human-readable scientific strings, and converting data types between the legacy and modern formats.

--- 
*Refer to `STACK.md` in the `.gsd/` folder for more architectural details.*
