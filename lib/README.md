# Library (`/lib`)

> Shared business logic, API clients, theming, and static data for ModelSEED UI

## Quick Navigation

| Directory | What's Inside | Lines |
|-----------|--------------|-------|
| [`api/`](./api/) | External service clients (ModelSEED, BV-BRC, Workspace, Auth) | ~3,100 |
| [`data/`](./data/) | Static datasets (publications, team roster) | ~2,100 |
| [`utils/`](./utils/) | Helper functions (CSV/TSV export) | ~200 |

| Root File | Purpose |
|-----------|---------|
| [`theme.ts`](./theme.ts) | MUI v7 theme configuration |

---

## API Clients (`lib/api/`)

TypeScript interfaces to all external services. If you're adding a new API call or modifying existing ones, start here.

### Entry Points

| Need | File | Key Functions |
|------|------|---------------|
| **User login** | [`auth.ts`](./api/auth.ts) | `loginPatric()`, `loginRast()`, `persistAuth()`, `getStoredAuth()`, `clearAuth()` |
| **Biochemistry data** | [`biochem.ts`](./api/biochem.ts) | `getReactions()`, `getCompounds()`, `getReactionById()`, `getCompoundById()`, `getCompoundsByIds()` |
| **Models, jobs, media** | [`modelseed.ts`](./api/modelseed.ts) | `listUserModelsFromApi()`, `submitReconstructJobFromApi()`, `listRastGenomes()`, `listPublicMediaFromApi()` |
| **Workspace storage** | [`workspace.ts`](./api/workspace.ts) | `workspaceLs()`, `workspaceGet()`, `workspaceCreate()`, `workspaceDelete()`, `workspaceUpdateMetadata()` |
| **Genome search** | [`patric.ts`](./api/patric.ts) | `searchPatricGenomes()` |
| **Job tracking** | [`jobTracker.ts`](./api/jobTracker.ts) | `trackJob()`, `listTrackedJobs()`, `isTerminalJobStatus()`, `extractTrackedJobId()` |
| **Auth headers** | [`requestAuth.ts`](./api/requestAuth.ts) | `withRawTokenAuth()`, `getStoredAuthUsername()`, `getStoredAuthMethod()` |
| **Endpoint config** | [`config.ts`](./api/config.ts) | `MODELSEED_API_URL`, `WORKSPACE_URL`, `SOLR_BASE`, `USE_NEW_PROXY` |

### Architecture

```
App Components
    ↓
lib/api/* (typed clients)
    ↓
requestAuth.ts (injects Authorization header)
    ↓
External Services
```

### Feature Flags

| Flag | Default | What It Controls |
|------|---------|-----------------|
| `NEXT_PUBLIC_USE_NEW_PROXY` | `true` | Route Workspace through REST proxy |
| `NEXT_PUBLIC_USE_MODELSEED_API` | `true` | Use modelseed-api for models/jobs/media |
| `NEXT_PUBLIC_USE_NEW_BIOCHEM` | `false` | Route biochemistry through REST (vs legacy Solr) |

Set these in `.env.local` to override defaults.

### Common Patterns

**Auth flow:**
```tsx
import { loginPatric, persistAuth } from '@/lib/api/auth';

const auth = await loginPatric(username, password);
persistAuth(auth);
```

**Fetch user models:**
```tsx
import { listUserModelsFromApi } from '@/lib/api/modelseed';

const models = await listUserModelsFromApi();
```

**Search biochemistry:**
```tsx
import { getReactions } from '@/lib/api/biochem';

const results = await getReactions({ query: 'ATP', limit: 25 });
```

**Workspace operations:**
```tsx
import { workspaceLs, workspaceGet, parseWorkspaceGetObject } from '@/lib/api/workspace';

const listings = await workspaceLs(['/user@patricbrc.org/models']);
const objects = await workspaceGet(['/user@patricbrc.org/models/MyModel']);
const modelData = parseWorkspaceGetObject(objects);
```

### Adding a New API Client

1. Create file in `lib/api/`
2. Define TypeScript interfaces for request/response types
3. Use `withRawTokenAuth()` for authenticated calls
4. Import endpoint URLs from `config.ts`
5. Add JSDoc with `@param`, `@returns`, `@throws`, `@example`

---

## Static Data (`lib/data/`)

Hardcoded datasets for display pages. No runtime queries.

| File | Content | Used By |
|------|---------|---------|
| [`publications.ts`](./data/publications.ts) | ~100 ModelSEED publications | About page citations |
| [`team.ts`](./data/team.ts) | Team member profiles | About page team roster |

**Team images:** `/public/img/team/`

---

## Utilities (`lib/utils/`)

Reusable helper functions.

| File | Purpose | Key Exports |
|------|---------|-------------|
| [`exportCsv.ts`](./utils/exportCsv.ts) | CSV/TSV export with browser download | `exportToCsv()`, `exportToTsv()`, `objectsToCsv()`, `downloadCsv()` |

```tsx
import { exportToCsv } from '@/lib/utils/exportCsv';

exportToCsv(reactions, {
  filename: 'model-reactions',
  columns: ['id', 'name', 'equation'],
  columnLabels: { id: 'Reaction ID' }
});
```

---

## Theme (`theme.ts`)

MUI v7 theme matching legacy ModelSEED design:

| Token | Value |
|-------|-------|
| Primary | `#30BCCF` (teal) |
| Secondary | `rgba(95, 98, 168, 0.91)` (purple) |
| Error | `#DA265D` (red) |
| Success | `#38BD5C` (green) |

```tsx
import theme from '@/lib/theme';

<ThemeProvider theme={theme}>{children}</ThemeProvider>
```

---

## External Services

| Service | Base URL | Purpose |
|---------|----------|---------|
| ModelSEED API | `http://poplar.cels.anl.gov:8000` | Models, jobs, media |
| Workspace | `p3.theseed.org` | User storage |
| Solr | `modelseed.org/solr/` | Biochemistry index |
| BV-BRC | `www.patricbrc.org/api/genome/` | Genome search |
| PATRIC Auth | `user.patricbrc.org/authenticate` | Login |
| RAST Auth | `p3.theseed.org/Sessions/Login` | Login |
| RAST Jobs | `modelseed.org/services/ms_fba` | Genome jobs |

---

**Full docs:**
- [`api/README.md`](./api/README.md) — Detailed API client reference
- [`data/README.md`](./data/README.md) — Static data structure
- [`utils/README.md`](./utils/README.md) — Utility functions
