# ModelSEED-UI (Next.js 16)

ModelSEED-UI is the modern Next.js 16 + React 19 + MUI 7 interface for the ModelSEED platform. It provides biochemistry reference tables, public genomes/media, and authenticated user workflows (Build Model, My Models, My Media, My Jobs) interacting with the new `modelseed-api` backend while preserving legacy URL parity.



### What's Working ✅

- **Full Legacy Parity** Achieved!
- FBA job submission (with plant-specific media and reaction KO options)
- Gapfill job submission
- Model reconstruction (genome → model)
- My Models, My Media, My Jobs pages
- Complete Model detail tab coverage (Reactions, Compounds, Genes, Compartments, Biomass, Pathways, FBA)
- Biochemical reference data (reactions, compounds via Solr with detail drawers)
- Inline metadata editing (Name, Description persist to backend)

### Known Limitations (Backend)

- Organism/Taxonomy not saved during model reconstruction (backend fix needed)
- Reaction equations not returned in model data (API limitation)
- Gene functions not returned in model data (API limitation)
- RAST gapfill jobs may fail (backend issue)
- `modelseed.org/solr` CORS issue block direct execution in test runner (handled gracefully in UI)

> **⚠️ Note:** PATRIC and RAST are separate systems with different workspaces. A PATRIC user cannot access RAST workspace data and vice versa.

## Stack Overview

- Next.js 16 (App Router, Turbopack)
- React 19
- MUI 7
- TanStack Query 5
- TypeScript (strict)
- Backends:
  - PATRIC/RAST auth services
  - PATRIC Workspace (legacy JSON-RPC)
  - ModelSEED REST API (`modelseed-api`, Poplar)
  - Solr biochemistry index for reactions/compounds

Key configuration constants live in `lib/api/config.ts`:

- `MODELSEED_API_URL` – base URL for Poplar (currently `http://poplar.cels.anl.gov:8000` in development).
- `USE_MODELSEED_API` – when `true`, user data flows (My Models, My Media, jobs) use `modelseed-api`.
- `USE_NEW_PROXY` – when `true`, workspace calls route through the REST proxy at `${MODELSEED_API_URL}/api/workspace`.
- `SOLR_BASE` / `USE_NEW_BIOCHEM` – control whether biochem lookups use legacy Solr or the new biochem endpoints (by default, tables stay on Solr).

## Running the App Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

For a production build:

```bash
npm run build
npm start
```

## Authentication

Authentication is handled by `components/auth/AuthProvider.tsx` and `lib/api/auth.ts`:

- Users log in against RAST or PATRIC/BV-BRC.
- The resulting token is stored in `localStorage['auth']`.
- API clients (`lib/api/modelseed.ts`, `lib/api/workspace.ts`, `lib/api/biochem.ts`) attach the raw token as:

```text
Authorization: <raw-token>
```

There is a local-only developer bypass for testing:

- Username: `developer`
- Password: `developer`

This returns a fixed developer token without hitting remote auth services. Use this only for local development.

## Data Flows

- **Biochem tables** (compounds, reactions):
  - Served from Solr via `lib/api/biochem.ts`.
  - Tables and detail views under `app/(reference-data)/biochem/...`.

- **Workspace-backed reference data** (public plant models, genomes, reference media):
  - Use `workspaceLs` / `workspaceGet` from `lib/api/workspace.ts`.
  - When `USE_NEW_PROXY=true`, these calls post to `${MODELSEED_API_URL}/api/workspace/*`; otherwise they fall back to the legacy JSON-RPC Workspace service.

- **User Models, Media, Jobs**:
  - Use `lib/api/modelseed.ts` for:
    - `GET /api/models`, `GET /api/models/data`, export, delete, copy, gapfills, FBA.
    - `GET /api/media/public`, `GET /api/media/mine`.
    - `GET /api/jobs`, `POST /api/jobs/reconstruct`, `/gapfill`, `/fba`, `/manage`.
  - Front-end surfaces:
    - `app/(user-data)/my-models/page.tsx`
    - `app/(user-data)/myMedia/page.tsx`
    - `app/model/[...path]/page.tsx`
    - `app/(build-model)/plant/page.tsx`

- **Jobs and Build Model**:
  - Reconstruct jobs are created via `submitReconstructJobFromApi`.
  - FBA and gapfill jobs use `submitFbaJobFromApi` and `submitGapfillJobFromApi`.
  - `lib/api/jobTracker.ts` stores submitted job IDs so `My Models` and `Model Detail` can surface job status and cancellation controls.

For a deeper architectural view, see:

- `docs/ARCHITECTURE.md`
- `docs/WORKSPACE.md`
- `docs/AUTHENTICATION.md`

## Documentation Entry Points

- `INDEX.md` – High-level map of files and folders (Primary entry point for onboarding).
- `docs/README.md` – Developer manual index.
- `issues.md` - Verified current API limitations and bug tracker.
- `.gsd/ROADMAP.md` – Current phases and milestones.

### Note for AI Agents
When initializing a debugging or feature session, start by reading `INDEX.md` for the context protocol, then review `issues.md` to ensure you are not debugging a known backend limitation (such as 501 Not Implemented endpoints).

## Running Tests

### Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Start SSH tunnel to Poplar API (for authenticated tests):**
   ```bash
   ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
   ```

3. **Configure `.env.local`:**
   ```bash
   NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
   PATRIC_USERNAME=your_username
   PATRIC_PASSWORD=your_password
   ```

### Test Commands

```bash
# Unit tests
npm run test:run

# E2E tests (requires dev server + SSH tunnel)
npm run test:e2e

# API endpoint tests (requires SSH tunnel)
npm run test:api
```

See [`tests/README.md`](tests/README.md) for full documentation.

## Review Status (March 2026)

### Code Quality
- ✅ **Build**: Clean production build passes
- ✅ **Lint**: All errors fixed in application code
- ✅ **TypeScript**: Strict mode enabled, no type errors
- ✅ **Unit Tests**: 65 passing (7 test files)

### Test Coverage
| Area | Tests | Status |
|------|-------|--------|
| Job Tracker | 20+ | ✅ |
| Format Equation | 15+ | ✅ |
| ModelSEED API | 3 | ✅ |
| Workspace API | 2 | ✅ |
| E2E Auth Flows | 10+ | ✅ (requires tunnel) |

### Known Backend Issues
These issues are documented in `E2E-REPORT-FIX-STATUS.md`:

1. **Duplicate model rows** - API returns same model multiple times
2. **Equation column shows N/A** - Equations not in model data response
3. **Gene functions missing** - Not returned by model API
4. **Organism/Taxonomy not saved** - Reconstruct endpoint limitation

> These require backend (`modelseed-api`) fixes and cannot be resolved from the frontend.

### Files Cleaned Up
- Removed all unused imports/variables
- Fixed React Compiler setState-in-effect patterns
- Fixed TypeScript `any` type usages
- Added Suspense boundaries for Next.js 16 compatibility

## Timestamp Log

- Created: 2026-03-12 20:18:13 CDT
- Review: 2026-03-13 (Comprehensive code review)
