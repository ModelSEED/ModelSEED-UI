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

- `DEPLOYMENT_MODE` – `NEXT_PUBLIC_DEPLOYMENT_MODE` (`staging|production|manual`). Unset defaults to `staging`; use `manual` for strict override mode.
- `MODELSEED_API_URL` – base URL for Poplar (currently `http://poplar.cels.anl.gov:8000` in development).
- `USE_MODELSEED_API` – when `true`, user data flows (My Models, My Media, jobs) use `modelseed-api`.
- `USE_NEW_PROXY` – when `true`, workspace calls route through the REST proxy at `${MODELSEED_API_URL}/api/workspace`.
- `NEXT_PUBLIC_SOLR_BASE_URL`, per-corpus `NEXT_PUBLIC_SOLR_*_BASE_URL` overrides, and `NEXT_PUBLIC_SOLR_*_COLLECTION` control Solr endpoints and core selection for biochem pages; see [Solr configuration](docs/DEPLOYMENT.md#solr-configuration).

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
   
   The ModelSEED API backend runs on Poplar and requires an SSH tunnel for local development:
   
   ```bash
   ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
   ```
   
   **Important**: Keep this terminal session open while developing. The tunnel forwards `localhost:8000` to the Poplar API server.
   
   Without the SSH tunnel:
   - Version page will show endpoints as "error"
   - Media tab (`/list-media`) will be empty due to timeout
   - All authenticated API features will be unavailable

3. **Configure `.env.local`:**
   ```bash
   # When using SSH tunnel
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   
   # For authenticated tests
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

## Troubleshooting

### Issue: Version page shows endpoints as "error"

**Cause**: SSH tunnel to Poplar API is not active.

**Solution**:
1. Start the SSH tunnel: `ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov`
2. Keep the terminal session open while developing
3. Verify connection: `curl http://localhost:8000/health` (should return 200)

### Issue: Media tab (`/list-media`) is empty

**Cause**: Backend API not responding (SSH tunnel not active).

**Solution**:
1. Check SSH tunnel is running (see above)
2. Verify environment variable in `.env.local`:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```
3. Restart the development server after changing `.env.local`
4. Test API connection: `curl http://localhost:8000/api/media/public`

### Issue: Different models/media between RAST and PATRIC accounts

**This is expected behavior, not a bug.**

RAST and PATRIC are separate systems with different workspace folders. A PATRIC user cannot access RAST workspace data and vice versa. The same username on both systems will have different data because they point to different underlying workspace directories.

### Issue: Authentication fails or times out

**Cause**: Network connectivity to PATRIC/RAST authentication servers or SSH tunnel issue.

**Solution**:
1. Check internet connectivity to `p3.theseed.org` and `rast.nmpdr.org`
2. Verify SSH tunnel is active for API calls
3. Try the developer bypass (local testing only):
   - Username: `developer`
   - Password: `developer`
   - Returns a fixed token without hitting remote auth services

### Issue: Build or type errors after updates

**Solution**:
```bash
# Clean build artifacts
rm -rf .next
rm -rf node_modules
npm install

# Run type check
npx tsc --noEmit

# Run linter
npm run lint
```

For more detailed troubleshooting and architecture documentation, see:
- [`docs/README.md`](docs/README.md) - Developer manual
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System architecture
- [`docs/WORKSPACE.md`](docs/WORKSPACE.md) - Workspace API details
- [`issues.md`](issues.md) - Known backend limitations

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
