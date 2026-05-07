# Library Directory (`/lib`)

This directory houses the shared business logic, API clients, static data configurations, and utility operations for ModelSEED UI.

## Structure

| Directory | Purpose |
|-----------|---------|
| [`api/`](./api/) | External service client integrations (ModelSEED, workspace parsing, BV-BRC). |
| [`data/`](./data/) | Static data mapping. |
| [`utils/`](./utils/) | Helper functions (e.g. data export utilities). |

| Root File | Purpose |
|-----------|---------|
| `theme.ts` | Material UI (MUI v7) configuration theme logic. |

## API Logic (`lib/api/`)

This directory acts as the core interface layer to all external backend systems.

| Domain | File | Purpose |
|------|------|---------------|
| Auth | [`auth.ts`](./api/auth.ts) | PATRIC/RAST authentication workflows and storage. |
| Biochem | [`biochem.ts`](./api/biochem.ts) | References biochemical tables and endpoints. |
| ModelSEED | [`modelseed.ts`](./api/modelseed.ts) | Interacts with `modelseed-api` for jobs, models, and media endpoints. |
| Workspace | [`workspace.ts`](./api/workspace.ts) | File manager and PATRIC workspace data mapping. |
| PATRIC | [`patric.ts`](./api/patric.ts) | Genome integration operations. |
| State | [`jobTracker.ts`](./api/jobTracker.ts) | Tracking workflow and backend job execution states. |
| Config | [`config.ts`](./api/config.ts) | Environment management and feature flags mapped from `.env.local`. |

## Utilities (`lib/utils/`)

General utilities for UI integration logic:
- `exportCsv.ts`: Parsing arrays and exporting grids to standard CSV/TSV web APIs.

## Theme Configuration

The `theme.ts` provides strict hex codes mapping the foundational user interface layout colors according to standard design language operations.

## Network Services 

Integrates with the following primary endpoint configurations across `config.ts`:
- ModelSEED API 
- Workspace (PATRIC endpoints)
- Solr (Reference structures)
- BV-BRC (Genome databases)
