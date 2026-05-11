# lib/api

> TypeScript API clients for ModelSEED ecosystem services

## Quick Navigation

| Need | File | Key Functions |
|------|------|---------------|
| **User authentication** | [`auth.ts`](#authts) | `loginPatric()`, `loginRast()`, `persistAuth()`, `getStoredAuth()`, `clearAuth()` |
| **Biochemistry data** | [`biochem.ts`](#biochemts) | `getReactions()`, `getCompounds()`, `getReactionById()`, `getCompoundById()` |
| **Models, jobs, media** | [`modelseed.ts`](#modelseedts) | `listUserModelsFromApi()`, `submitReconstructJobFromApi()`, `listRastGenomes()` |
| **Workspace storage** | [`workspace.ts`](#workspacets) | `workspaceLs()`, `workspaceGet()`, `workspaceCreate()`, `workspaceDelete()` |
| **Genome search** | [`patric.ts`](#patrists) | `searchPatricGenomes()` |
| **Job tracking** | [`jobTracker.ts`](#jobtracker) | `trackJob()`, `listTrackedJobs()`, `isTerminalJobStatus()` |
| **Auth headers** | [`requestAuth.ts`](#requestauthts) | `withRawTokenAuth()`, `getStoredAuthUsername()` |
| **Endpoint config** | [`config.ts`](#configts) | `MODELSEED_API_URL`, `WORKSPACE_URL`, feature flags |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (React components, Next.js pages)           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                      lib/api (This Layer)                │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌──────┐ │
│  │ auth.ts  │  │ biochem.ts│  │modelseed.ts│  │patric│ │
│  └──────────┘  └───────────┘  └────────────┘  └──────┘ │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │config.ts │  │workspace.ts│  │requestAuth.ts (shared)│ │
│  └──────────┘  └────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    External Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ BV-BRC/PATRIC│  │ ModelSEED    │  │ RAST Services  │ │
│  │ user.patric  │  │ Solr/REST    │  │ p3.theseed.org │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Authentication**: User credentials → `auth.ts` → PATRIC/RAST servers → token stored in localStorage
2. **API Calls**: Component → specific API module → `requestAuth.ts` (adds token) → external service
3. **Configuration**: Environment variables → `config.ts` → feature flags → routing decisions
4. **Job Tracking**: Job submission → `jobTracker.ts` → localStorage → polling/status display

---

## File Reference

### auth.ts

**Purpose**: PATRIC/RAST authentication services

| Function | Description |
|----------|-------------|
| `loginPatric(username, password)` | Authenticate against BV-BRC/PATRIC |
| `loginRast(username, password)` | Authenticate against RAST |
| `persistAuth(auth)` | Store auth token in localStorage |
| `getStoredAuth()` | Retrieve stored auth data |
| `clearAuth()` | Remove stored auth (logout) |

**Developer bypass**: Use username `developer` + password `developer` for local testing without network calls.

**Usage:**
```tsx
import { loginPatric, persistAuth, getStoredAuth } from '@/lib/api/auth';

// Login
const auth = await loginPatric('user', 'pass');
persistAuth(auth);

// Check current auth
const current = getStoredAuth();
if (current) {
  console.log('Logged in as:', current.user_id);
}
```

### biochem.ts

**Purpose**: Biochemistry data queries (reactions, compounds)

| Function | Description |
|----------|-------------|
| `getReactions(opts)` | Search reactions with filters |
| `getCompounds(opts)` | Search compounds with filters |
| `getReactionById(id)` | Get single reaction by ID |
| `getCompoundById(id)` | Get single compound by ID |
| `getCompoundsByIds(ids)` | Batch fetch multiple compounds |
| `findReactionsForCompound(cpdId)` | Find reactions using a compound |
| `getCompoundImageUrl(id)` | Get compound structure image URL |

**Routing**: Reactions/compounds pages are Solr-backed (configured collections + base URL from `config.ts`).

**Usage:**
```tsx
import { getReactions, getCompounds } from '@/lib/api/biochem';

// Simple search
const results = await getReactions({ query: 'ATP', limit: 25 });

// Advanced filtering
const filtered = await getReactions({
  filterModel: {
    items: [{ field: 'status', operator: 'equals', value: 'OK' }],
    logicOperator: 'and'
  }
});
```

### config.ts

**Purpose**: Centralized endpoint configuration and feature flags

| Constant | Default | Description |
|----------|---------|-------------|
| `DEPLOYMENT_MODE` | `staging` \| `production` \| `manual` (unset) | Deployment mode (`NEXT_PUBLIC_DEPLOYMENT_MODE`) |
| `MODELSEED_API_URL` | mode-derived (`https://<host>/PMS`) | ModelSEED REST API base |
| `USE_NEW_PROXY` | `true` | Route Workspace through REST proxy |
| `USE_MODELSEED_API` | `true` | Use modelseed-api for user data |

**Environment Variables:**
| Variable | Controls |
|----------|----------|
| `NEXT_PUBLIC_DEPLOYMENT_MODE` | Endpoint profile (`staging`, `production`, or unset/manual with required overrides) |
| `NEXT_PUBLIC_API_BASE_URL` | Override API base URL |
| `NEXT_PUBLIC_API_BASE_URL_STAGING` / `NEXT_PUBLIC_API_BASE_URL_PRODUCTION` | Mode defaults for API base URL |
| `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION` | Override Solr reactions core |
| `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION` | Override Solr compounds core |
| `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_STAGING` / `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_PRODUCTION` | Mode defaults for reactions core |
| `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_STAGING` / `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_PRODUCTION` | Mode defaults for compounds core |
| `NEXT_PUBLIC_USE_NEW_PROXY` | Toggle Workspace proxy |
| `NEXT_PUBLIC_USE_MODELSEED_API` | Toggle modelseed-api |

### jobTracker.ts

**Purpose**: Client-side job tracking via localStorage

| Function | Description |
|----------|-------------|
| `trackJob(job)` | Add/update a tracked job |
| `listTrackedJobs()` | Get all tracked jobs |
| `removeTrackedJob(jobId)` | Remove a tracked job |
| `extractTrackedJobId(payload)` | Extract job ID from API response |
| `isTerminalJobStatus(status)` | Check if job is complete/failed |
| `isActiveJobStatus(status)` | Check if job is still running |

**Job Types**: `reconstruct` | `gapfill` | `fba` | `merge`

**Usage:**
```tsx
import { trackJob, listTrackedJobs, isTerminalJobStatus } from '@/lib/api/jobTracker';

// Track new job
trackJob({
  id: 'job-12345',
  kind: 'reconstruct',
  label: 'E. coli model',
  submittedAt: new Date().toISOString()
});

// Check job status
const jobs = listTrackedJobs();
if (isTerminalJobStatus(job.status)) {
  console.log('Job finished');
}
```

### modelseed.ts

**Purpose**: ModelSEED REST API client (models, jobs, media, genomes)

| Function | Description |
|----------|-------------|
| `listUserModelsFromApi()` | Get all user's models |
| `getModelDataFromApi(ref)` | Get full model data |
| `deleteModelFromApi(ref)` | Delete a model |
| `exportModelFromApi(ref, format)` | Export model (sbml/json/tsv) |
| `submitReconstructJobFromApi(payload)` | Submit reconstruction job |
| `submitGapfillJobFromApi(payload)` | Submit gapfill job |
| `submitFbaJobFromApi(payload)` | Submit FBA job |
| `submitMergeJobFromApi(payload)` | Submit merge job |
| `listRastGenomes()` | Get RAST genome jobs |
| `listPublicMediaFromApi()` | Get public media |
| `listMyMediaFromApi()` | Get user's custom media |
| `manageModelGapfillsFromApi()` | Manage gapfill solutions |
| `editModelFromApi(payload)` | Edit model reactions |

**Usage:**
```tsx
import { listUserModelsFromApi, submitReconstructJobFromApi } from '@/lib/api/modelseed';

// List models
const models = await listUserModelsFromApi();

// Submit reconstruction
const response = await submitReconstructJobFromApi({
  genome: '511145.12',
  model_name: 'EcoliModel',
  template: 'GramNegative',
  gapfill: true
});
```

### patric.ts

**Purpose**: BV-BRC genome search with retry logic

| Function | Description |
|----------|-------------|
| `searchPatricGenomes(params)` | Search BV-BRC genome database |

**Features:**
- Automatic retry on `signingSubjectURL` backend errors
- RQL query building for BV-BRC API
- Pagination and sorting support

**Usage:**
```tsx
import { searchPatricGenomes } from '@/lib/api/patric';

const results = await searchPatricGenomes({
  query: 'Escherichia coli',
  limit: 25,
  offset: 0,
  sort: '+genome_name'
});

console.log(`Found ${results.total} genomes`);
results.rows.forEach(genome => {
  console.log(`${genome.genome_name} (${genome.genome_id})`);
});
```

### requestAuth.ts

**Purpose**: Shared auth header utilities

| Function | Description |
|----------|-------------|
| `withRawTokenAuth(headers, requireToken?)` | Add Authorization header to request |
| `getStoredAuthUsername()` | Get username with `@patricbrc.org` suffix |
| `getStoredAuthMethod()` | Get auth method (`PATRIC` or `RAST`) |

**Note**: Backend expects raw PATRIC/RAST token (no `Bearer` prefix).

**Usage:**
```tsx
import { withRawTokenAuth } from '@/lib/api/requestAuth';

const headers = withRawTokenAuth(
  { 'Content-Type': 'application/json' },
  true  // require token
);

const response = await fetch(url, { headers });
```

### workspace.ts

**Purpose**: Workspace storage API (JSON-RPC/REST proxy)

| Function | Description |
|----------|-------------|
| `workspaceLs(paths)` | List directory contents |
| `workspaceGet(objects)` | Fetch full object data |
| `workspaceCreate(body)` | Create new object |
| `workspaceDelete(body)` | Delete object(s) |
| `workspaceMetadata(body)` | Get object metadata |
| `workspaceUpdateMetadata(path, updates)` | Update object metadata |
| `workspacePermissions(body)` | Manage permissions |
| `workspaceDownloadUrl(body)` | Get download URL |
| `parseWorkspaceGetObject(payload, index?)` | Extract typed data from response |

**Note**: All operations route through REST proxy (`USE_NEW_PROXY=true`).

**Usage:**
```tsx
import { workspaceLs, workspaceGet, parseWorkspaceGetObject } from '@/lib/api/workspace';

// List models
const listings = await workspaceLs(['/user@patricbrc.org/models']);

// Get model data
const objects = await workspaceGet(['/user@patricbrc.org/models/MyModel']);
const modelData = parseWorkspaceGetObject(objects);

// Update metadata
await workspaceUpdateMetadata('/user@patricbrc.org/models/MyModel', {
  name: 'Updated Name',
  description: 'New description'
});
```

---

## Adding New API Clients

1. Create file in `lib/api/`
2. Define TypeScript interfaces for request/response types
3. Use `withRawTokenAuth()` for authenticated calls
4. Import endpoint URLs from `config.ts`
5. Add JSDoc with `@param`, `@returns`, `@throws`, `@example`
6. Add entry to this README

## Error Handling Pattern

All API functions follow this pattern:
```tsx
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return await response.json();
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
}
```

---

**Related:**
- Main lib README: [`../README.md`](../README.md)
- Data folder: [`../data/`](../data/)
- Utilities: [`../utils/`](../utils/)
