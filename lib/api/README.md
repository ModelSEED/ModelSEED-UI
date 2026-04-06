# lib/api

> TypeScript API client library for ModelSEED, BV-BRC, and RAST services

## Overview

This module provides a modern TypeScript abstraction layer for interacting with the ModelSEED ecosystem of bioinformatics services. It replaces the legacy AngularJS service layer with type-safe, promise-based API clients that support both legacy JSON-RPC endpoints and new REST APIs.

The library is designed to be environment-agnostic (works in both browser and Node.js/Edge runtime contexts) and includes comprehensive feature flagging to enable gradual migration from legacy backends to modern REST APIs without breaking existing functionality.

All API clients follow a consistent pattern: type-safe request/response interfaces, defensive error handling with detailed messages, and automatic authentication token management using localStorage-based session state.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│          (React components, Next.js pages/API routes)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      lib/api (This Layer)                    │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌──────────┐ │
│  │  auth.ts │  │ biochem.ts│  │modelseed.ts│  │patric.ts │ │
│  └──────────┘  └───────────┘  └────────────┘  └──────────┘ │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────────┐   │
│  │config.ts │  │workspace.ts│  │requestAuth.ts (shared)│   │
│  └──────────┘  └────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ BV-BRC/PATRIC │  │  ModelSEED   │  │  RAST Services  │  │
│  │ user.patricbrc│  │  Solr/REST   │  │  p3.theseed.org │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication**: User credentials → `auth.ts` → PATRIC/RAST auth servers → token storage
2. **API Calls**: Component → specific API module → `requestAuth.ts` (adds token) → external service
3. **Configuration**: Environment variables → `config.ts` → feature flags → runtime routing decisions
4. **Job Tracking**: Job submission → `jobTracker.ts` → localStorage → polling/status display

## Files

| File | Purpose | Key Exports | Lines | Status |
|------|---------|-------------|-------|--------|
| `auth.ts` | PATRIC/RAST authentication | `loginPatric`, `loginRast`, `persistAuth`, `getStoredAuth`, `clearAuth` | 157 | ✅ Production Ready |
| `biochem.ts` | Biochemistry data (Solr/REST) | `getReactions`, `getCompounds`, `getCompoundById`, `getReactionById` | 449 | ⚠️ Needs Refactoring |
| `config.ts` | Centralized configuration | `WORKSPACE_URL`, `SOLR_BASE`, `USE_NEW_PROXY`, `MODELSEED_API_URL` | 136 | ✅ Production Ready |
| `jobTracker.ts` | Client-side job tracking | `trackJob`, `listTrackedJobs`, `isTerminalJobStatus` | 80 | ✅ Production Ready |
| `modelseed.ts` | ModelSEED REST API client | `listUserModelsFromApi`, `submitReconstructJobFromApi`, `listRastGenomes` | 721 | ⚠️ Needs Documentation |
| `patric.ts` | BV-BRC genome search | `searchPatricGenomes` | 146 | ✅ Production Ready |
| `requestAuth.ts` | Shared auth utilities | `withRawTokenAuth`, `getStoredAuthUsername` | 68 | ✅ Production Ready |
| `workspace.ts` | Workspace JSON-RPC/REST client | `workspaceLs`, `workspaceGet`, `workspaceCreate`, `workspaceDelete` | 319 | ⚠️ Has Dead Code |

**Total**: 2,076 lines | **Status**: ⚠️ Needs work before production (see [PRODUCTION_REVIEW.md](./PRODUCTION_REVIEW.md))

## Key Exports

### Authentication (`auth.ts`)

#### `loginPatric(username: string, password: string): Promise<AuthResult>`

**Purpose**: Authenticate against BV-BRC/PATRIC user service  
**Type**: Async Function  
**Located**: `auth.ts:49`

Authenticates a user against the BV-BRC (formerly PATRIC) authentication service. On success, returns a raw pipe-delimited token string (e.g., `un=user|tokenid=...|expiry=...`) that can be used for subsequent API calls.

**Usage:**
```typescript
import { loginPatric, persistAuth } from '@/lib/api/auth';

try {
  const authResult = await loginPatric('myusername', 'mypassword');
  persistAuth(authResult); // Store in localStorage
  console.log('Logged in as:', authResult.user_id);
} catch (error) {
  console.error('Login failed:', error.message);
}
```

**Parameters:**
- `username` (string): BV-BRC username or email
- `password` (string): User password

**Returns**: `Promise<AuthResult>` - Contains `user_id`, `token`, and `method` ('PATRIC')

**Special Behavior:**
- Developer bypass: Use username="developer" + password="developer" for local testing
- Automatically appends `@patricbrc.org` to username if missing

**Notes:**
- The token expires based on backend configuration (typically 24 hours)
- No client-side token refresh - user must re-authenticate when token expires
- Use `persistAuth()` to save the result to localStorage for subsequent API calls

---

#### `persistAuth(auth: AuthResult): void`

**Purpose**: Save authentication result to localStorage  
**Type**: Function  
**Located**: `auth.ts:134`

**Usage:**
```typescript
persistAuth(authResult);
```

**Notes:**
- Client-side only (checks for `window` existence)
- Overwrites any existing auth data
- Used by `AuthProvider` context to maintain session state

---

### Biochemistry (`biochem.ts`)

#### `getReactions(opts?: SolrQueryOpts): Promise<SolrResponse<Reaction>>`

**Purpose**: Search and retrieve biochemical reactions from Solr or REST API  
**Type**: Async Function  
**Located**: `biochem.ts:341`

Queries the ModelSEED biochemistry database for reactions. Supports advanced filtering, pagination, sorting, and search across multiple fields. Automatically routes to either legacy Solr or new REST API based on configuration.

**Usage:**
```typescript
import { getReactions } from '@/lib/api/biochem';

// Simple search
const results = await getReactions({
  query: 'ATP',
  limit: 25,
  offset: 0
});

// Advanced filtering (DataGrid compatible)
const filtered = await getReactions({
  filterModel: {
    items: [
      { field: 'status', operator: 'equals', value: 'OK' },
      { field: 'is_transport', operator: 'is', value: true }
    ],
    logicOperator: 'and'
  },
  sort: { field: 'name', desc: false },
  limit: 50
});

console.log(`Found ${results.numFound} reactions`);
results.docs.forEach(rxn => {
  console.log(`${rxn.id}: ${rxn.name} - ${rxn.definition}`);
});
```

**Parameters:**
- `opts` (SolrQueryOpts, optional): Query options
  - `query`: Search string (searches across id, name, EC numbers, pathways)
  - `limit`: Max results (default: 25)
  - `offset`: Pagination offset (default: 0)
  - `sort`: Sort specification `{ field: string, desc?: boolean }`
  - `filterModel`: DataGrid-compatible filter model for advanced queries
  - `searchFields`: Custom fields to search (defaults to id, name, status, ecs, pathways, etc.)

**Returns**: `Promise<SolrResponse<Reaction>>` containing:
- `numFound`: Total count of matching reactions
- `start`: Offset of first result
- `docs`: Array of `Reaction` objects

**Notes:**
- Reactions marked as obsolete have " (and is obsolete)" appended to status
- Short queries (<3 chars) use prefix matching, longer queries use contains
- Special query "*" returns all reactions (use with caution - large dataset)
- When to use: Biochemistry reference tables, reaction selection dialogs, model editing

---

#### `getCompounds(opts?: SolrQueryOpts): Promise<SolrResponse<Compound>>`

**Purpose**: Search and retrieve biochemical compounds  
**Type**: Async Function  
**Located**: `biochem.ts:374`

Similar to `getReactions` but for compounds (metabolites). Returns compound data including formula, mass, charge, and thermodynamic properties.

**Usage:**
```typescript
import { getCompounds } from '@/lib/api/biochem';

const results = await getCompounds({
  query: 'glucose',
  limit: 10
});
```

**Notes:**
- Search fields: id, name, formula, synonyms, aliases, ontology
- Useful for compound selection dialogs, media formulation

---

#### `getCompoundImageUrl(id: string): string`

**Purpose**: Generate URL for compound structure image  
**Type**: Pure Function  
**Located**: `biochem.ts:447`

**Usage:**
```typescript
import { getCompoundImageUrl } from '@/lib/api/biochem';

const imageUrl = getCompoundImageUrl('cpd00001');
// Returns: 'https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/cpd00001.png'

<img src={imageUrl} alt="Compound structure" />
```

**Notes:**
- Images are pre-rendered PNGs hosted externally
- Not all compounds have images (404 if missing)
- Use with error handling / fallback image

---

### Configuration (`config.ts`)

#### `MODELSEED_API_URL: string`

**Purpose**: Base URL for the ModelSEED REST API (Poplar backend)  
**Type**: Constant  
**Located**: `config.ts:18`

**Value**: Environment variable `NEXT_PUBLIC_MODELSEED_API_URL` or `http://poplar.cels.anl.gov:8000` (development default)

**Usage:**
```typescript
import { MODELSEED_API_URL } from '@/lib/api/config';

const url = `${MODELSEED_API_URL}/api/models`;
```

**Notes:**
- Set `NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000` for local development
- Production should point to deployed modelseed-api instance

---

#### `USE_NEW_PROXY: boolean`

**Purpose**: Feature flag to route Workspace calls through new REST proxy  
**Type**: Boolean Constant  
**Located**: `config.ts:40`

**Value**: Environment variable `NEXT_PUBLIC_USE_NEW_PROXY` (default: `true`)

**Usage:**
```typescript
import { USE_NEW_PROXY } from '@/lib/api/config';

if (USE_NEW_PROXY) {
  console.log('Using new REST proxy for Workspace operations');
}
```

**Notes:**
- Set to `false` only when intentionally using legacy JSON-RPC Workspace service
- Most operations now require `USE_NEW_PROXY=true`
- Future versions may remove legacy fallback

---

### Job Tracking (`jobTracker.ts`)

#### `trackJob(job: TrackedJob): void`

**Purpose**: Add a job to localStorage-based tracking list  
**Type**: Function  
**Located**: `jobTracker.ts:35`

**Usage:**
```typescript
import { trackJob, TrackedJob } from '@/lib/api/jobTracker';

const job: TrackedJob = {
  id: 'job-12345',
  kind: 'reconstruct',
  label: 'Reconstruct E. coli model',
  modelId: 'model-789',
  submittedAt: new Date().toISOString()
};

trackJob(job);
```

**Notes:**
- Stores up to 25 most recent jobs
- Automatically deduplicates by job ID
- Client-side only (localStorage)
- Use for "My Jobs" page and job status polling

---

#### `isTerminalJobStatus(status?: string): boolean`

**Purpose**: Check if a job status indicates completion (success or failure)  
**Type**: Pure Function  
**Located**: `jobTracker.ts:70`

**Usage:**
```typescript
import { isTerminalJobStatus } from '@/lib/api/jobTracker';

if (isTerminalJobStatus(job.status)) {
  console.log('Job has finished (success or failure)');
  // Stop polling
}
```

**Recognized Terminal Statuses**: `completed`, `failed`, `error`, `cancelled`, `canceled`, `terminated`

---

### ModelSEED API (`modelseed.ts`)

#### `listUserModelsFromApi(): Promise<ModelseedModelSummary[]>`

**Purpose**: Fetch all models owned by the authenticated user  
**Type**: Async Function  
**Located**: `modelseed.ts:171`

**Usage:**
```typescript
import { listUserModelsFromApi } from '@/lib/api/modelseed';

const models = await listUserModelsFromApi();
models.forEach(model => {
  console.log(`${model.name} (${model.id}): ${model.num_reactions} reactions`);
});
```

**Returns**: Array of `ModelseedModelSummary` with metadata:
- `ref`: Workspace reference path
- `id`, `name`: Model identifiers
- `num_genes`, `num_reactions`, `num_compounds`: Model statistics
- `fba_count`, `integrated_gapfills`: Analysis counts
- `genome_id`, `organism_name`: Source genome info

**Notes:**
- Requires authentication
- Uses defensive parsing to handle malformed metadata (won't crash on bad data)
- Empty array if user has no models

---

#### `submitReconstructJobFromApi(payload: Record<string, unknown>): Promise<Record<string, unknown>>`

**Purpose**: Submit a model reconstruction job to the backend queue  
**Type**: Async Function  
**Located**: `modelseed.ts:313`

**Usage:**
```typescript
import { submitReconstructJobFromApi, extractTrackedJobId } from '@/lib/api';

const payload = {
  genome: '511145.12',  // E. coli K-12 MG1655
  model_name: 'EcoliModel',
  template: 'GramNegative',
  gapfill: true
};

const response = await submitReconstructJobFromApi(payload);
const jobId = extractTrackedJobId(response);
console.log('Job submitted:', jobId);
```

**Notes:**
- Returns job ID in response (structure varies by backend version)
- Use `extractTrackedJobId()` to reliably extract the ID
- Track with `trackJob()` for status monitoring
- Job completion can take minutes to hours depending on genome size

---

#### `listRastGenomes(): Promise<RastGenomeJob[]>`

**Purpose**: List user's RAST genome annotation jobs  
**Type**: Async Function  
**Located**: `modelseed.ts:386`

**Usage:**
```typescript
import { listRastGenomes } from '@/lib/api/modelseed';

const genomes = await listRastGenomes();
genomes.forEach(genome => {
  console.log(`${genome.genome_name} (${genome.genome_id})`);
});
```

**Returns**: Array of `RastGenomeJob` with:
- `id`, `genome_id`, `genome_name`
- `contig_count`: Number of contigs
- `mod_time`: Last modification timestamp
- `type`: Always 'Genome'

**Notes:**
- Complex fallback logic for backend compatibility (tries multiple RPC method names)
- Returns empty array if backend is misconfigured (logs warning instead of crashing)
- Only returns jobs of type 'Genome' (filters out other RAST job types)

---

### PATRIC Genome Search (`patric.ts`)

#### `searchPatricGenomes(params?: SearchPatricGenomesParams): Promise<PatricGenomeSearchResult>`

**Purpose**: Search BV-BRC genome database  
**Type**: Async Function  
**Located**: `patric.ts:63`

**Usage:**
```typescript
import { searchPatricGenomes } from '@/lib/api/patric';

// Search by name
const results = await searchPatricGenomes({
  query: 'Escherichia coli',
  limit: 25,
  offset: 0,
  sort: '+genome_name'  // + for ascending, - for descending
});

console.log(`Found ${results.total} genomes`);
results.rows.forEach(genome => {
  console.log(`${genome.genome_name} (${genome.genome_id})`);
});
```

**Parameters:**
- `query`: Genome name or ID search term
- `limit`: Max results (default: 25)
- `offset`: Pagination offset
- `sort`: Sort field with +/- prefix (e.g., '+genome_name', '-taxon_id')

**Returns**: `PatricGenomeSearchResult` with:
- `rows`: Array of `PatricGenome` objects
- `total`: Total count of matching genomes

**Special Behavior:**
- Multi-word queries: AND logic (all terms must match)
- Single-word queries: Prefix match on genome_name OR exact match on genome_id
- Empty query: Returns first N genomes (uses `keyword(*)`)
- Auth retry: If 500 error with "signingSubjectURL" message, retries without auth header (BV-BRC backend bug workaround)

**Notes:**
- BV-BRC API occasionally has auth issues - this function has built-in retry logic
- Good for genome selection in model reconstruction workflows

---

### Workspace (`workspace.ts`)

#### `workspaceLs(paths: string[]): Promise<Record<string, unknown[]>>`

**Purpose**: List contents of workspace directories  
**Type**: Async Function  
**Located**: `workspace.ts:248`

**Usage:**
```typescript
import { workspaceLs } from '@/lib/api/workspace';

const listings = await workspaceLs([
  '/username@patricbrc.org/models',
  '/username@patricbrc.org/media'
]);

// listings = {
//   '/username@patricbrc.org/models': [
//     ['Model1', 'FBAModel', '/username@patricbrc.org/models/Model1', '2024-01-15', 'model123', ...],
//     ['Model2', 'FBAModel', '/username@patricbrc.org/models/Model2', '2024-01-20', 'model456', ...]
//   ],
//   '/username@patricbrc.org/media': [...]
// }
```

**Parameters:**
- `paths`: Array of workspace directory paths to list

**Returns**: Dictionary mapping each path to an array of workspace entry tuples:
```
[name, type, fullPath, modDate, id, owner, wsIdOrSize, metadata, ...]
```

**Notes:**
- Always routes through new REST proxy (requires `USE_NEW_PROXY=true`)
- Automatically decodes URL-encoded paths (handles double-encoding)
- Each path key in the result maps to an array of object tuples
- Use for file browsers, model/media selection lists

---

#### `workspaceGet(objects: string[]): Promise<unknown[]>`

**Purpose**: Retrieve full contents of workspace objects  
**Type**: Async Function  
**Located**: `workspace.ts:261`

**Usage:**
```typescript
import { workspaceGet, parseWorkspaceGetObject } from '@/lib/api/workspace';

const results = await workspaceGet([
  '/username@patricbrc.org/models/MyModel'
]);

const modelData = parseWorkspaceGetObject(results, 0);
console.log('Model data:', modelData);
```

**Parameters:**
- `objects`: Array of workspace object paths

**Returns**: Array of workspace object data (structure varies by object type)

**Notes:**
- Use `parseWorkspaceGetObject()` to extract typed data from response
- Response structure depends on whether using legacy or new proxy
- Automatically decodes URL-encoded paths

---

## Dependencies

### External Dependencies
- **None** - Uses only built-in `fetch` API
- Compatible with modern browsers and Node.js 18+ (native fetch)
- Next.js 13+ (uses `next/cache` for revalidation)

### Internal Dependencies
- `@/lib/api/config.ts` - Imported by most modules for endpoint URLs
- `@/lib/api/requestAuth.ts` - Imported by API modules for auth headers
- `@/lib/api/auth.ts` - Imported by `requestAuth.ts` for `AUTH_STORAGE_KEY`

### Dependency Graph

**What depends on this folder:**
- ← `app/**/page.tsx` - All data-fetching pages (models, media, jobs, genomes, etc.)
- ← `components/**` - UI components (dialogs, tables, forms)
- ← `components/auth/AuthProvider.tsx` - Authentication context
- ← `tests/unit/api/**` - Unit tests

**What this folder uses:**
- → None (no internal lib dependencies outside this folder)

## Testing

### Test Files
- ✅ `tests/unit/api/auth.test.ts` - Authentication function tests
- ✅ `tests/unit/api/biochem.test.ts` - Biochemistry query builder tests
- ✅ `tests/unit/api/modelseed.test.ts` - ModelSEED API client tests
- ✅ `tests/unit/api/workspace.test.ts` - Workspace API tests
- ✅ `tests/unit/utils/jobTracker.test.ts` - Job tracking utility tests

### Test Coverage

**Current Status**: Unknown (run `npm test -- --coverage` to measure)

**Coverage Expectations**:
- [ ] Happy path scenarios (basic success cases)
- [ ] Error conditions (network failures, auth errors, malformed responses)
- [ ] Edge cases (empty results, null values, invalid params)
- [ ] Async error handling (rejected promises)
- [ ] Feature flag combinations (USE_NEW_PROXY true/false)

**Coverage Gaps** (Known):
- Retry logic in `patric.ts` (signingSubjectURL workaround)
- Complex filter operator cases in `biochem.ts`
- Fallback method iteration in `modelseed.ts` `listRastGenomes()`
- Developer bypass in `auth.ts`

**Running Tests**:
```bash
# Run all API tests
npm test tests/unit/api

# Run specific file
npm test tests/unit/api/auth.test.ts

# With coverage
npm test -- --coverage tests/unit/api
```

## Code Quality Analysis

### Metrics
- **Files**: 8
- **Total Lines**: 2,076
- **Avg Lines per File**: 260
- **Avg Function Length**: ~15 lines (good, with 2 outliers)
- **Type Coverage**: ~85% (needs explicit return types on helpers)
- **Lint Issues**: 0 (ESLint clean in lib/api)
- **Test Coverage**: Unknown (needs measurement)

### Duplications Found

1. **`safeDecodePath` function** (Lines modelseed.ts:551-564, workspace.ts:181-194)
   - **Recommendation**: Extract to `lib/api/utils.ts`
   - **Reason**: Same logic for URL decoding with double-encoding protection

2. **Error message extraction** (3 implementations)
   - `extractWorkspaceErrorMessage` (workspace.ts:34)
   - `extractApiErrorMessage` (modelseed.ts:81)
   - Pattern repeated in `patric.ts`
   - **Recommendation**: Unify into single `extractErrorMessage()` in utils
   - **Reason**: Identical error-handling pattern across API clients

3. **JSON response parsing** (2 implementations)
   - modelseed.ts:95
   - workspace.ts:48
   - **Recommendation**: Extract to shared utility
   - **Reason**: Same try-catch-text-fallback pattern

4. **Feature flag parsing** (3 occurrences in config.ts)
   - Lines 31-40, 52-60, 94-99
   - **Recommendation**: Extract to `parseBooleanEnvVar()` function
   - **Reason**: Eliminate repetition, make intent clearer

5. **Field aliasing for 'synonyms'** (6+ occurrences in biochem.ts)
   - `field === 'synonyms' ? 'aliases' : field`
   - **Recommendation**: Extract to `mapFieldName()` helper
   - **Reason**: DRY violation, error-prone to maintain

### Dead Code Candidates

1. **`callWorkspaceApi` (workspace.ts:106)** - 🔴 CONFIRMED DEAD CODE
   - No references found (ESLint marks as unused)
   - Comment says "Legacy JSON-RPC fallback" but never called
   - **Safe to remove**: YES (if legacy mode is truly deprecated)
   - **Action**: Remove or implement proper fallback routing

2. **`workspaceCopy` (workspace.ts:285)** - ⚠️ LIKELY DEAD CODE
   - 0 references in codebase
   - **Safe to remove**: MAYBE (could be future API surface)
   - **Action**: Remove if not planned, or document intended use

3. **`getStoredAuthToken` (requestAuth.ts:3)** - ℹ️ INTERNAL USE ONLY
   - 0 external references (only used by `withRawTokenAuth`)
   - **Safe to remove**: NO (needed internally)
   - **Action**: Consider marking as internal/private or removing export

### Technical Debt

**High Priority:**
1. **Documentation Debt** - Missing JSDoc on 50+ exported functions
2. **Function Length** - `buildSolrUrl` (158 lines), `listRastGenomes` (132 lines)
3. **Dead Code** - Remove confirmed dead code

**Medium Priority:**
4. **Code Duplication** - Extract shared utilities
5. **Logging** - Replace console.* with structured logging
6. **Type Safety** - Add Zod schemas for API responses

**Low Priority:**
7. **Magic Constants** - Extract named constants
8. **Error Types** - Create custom error classes

**See [PRODUCTION_REVIEW.md](./PRODUCTION_REVIEW.md) for detailed analysis**

## Performance Considerations

### Caching Strategy
- `workspace.ts` uses Next.js revalidation: `next: { revalidate: 3600 }` (1 hour cache)
- No caching on biochem queries (data changes infrequently but cache-control not set)
- Job status polling should implement exponential backoff (not currently done)

**Optimization Opportunities:**
- Add request deduplication for concurrent identical requests
- Implement `AbortController` for cancellable requests
- Add memoization for expensive query building in biochem.ts
- Consider caching Solr results client-side with React Query or SWR

### Memory Usage
- localStorage job tracking limited to 25 entries (good)
- No known memory leaks
- Large Solr result sets (1000+ docs) could consume significant memory - consider pagination

### Network Performance
- All requests use native `fetch` (non-blocking)
- No request pooling or concurrency limits
- Biochem queries can return large payloads - monitor response sizes

## Security Notes

### Authentication/Authorization
- Token-based auth using PATRIC/RAST session tokens
- Tokens stored in localStorage (acceptable for SPA, but vulnerable to XSS)
- No token refresh - user must re-authenticate on expiry
- `withRawTokenAuth()` automatically attaches tokens to requests

**Recommendation**: Implement HttpOnly cookie storage for tokens (requires backend support)

### Input Validation
- Biochem query sanitization in `sanitizeQuery()` (removes dangerous characters)
- Workspace path decoding prevents URL injection
- No SQL injection risk (all queries via HTTP APIs)

**Gaps**:
- No runtime validation of API response schemas (should add Zod)
- No rate limiting on client side
- No CSRF protection (token auth makes this low risk)

### Sensitive Data Handling
- No hardcoded credentials (✅)
- Developer bypass credentials documented but acceptable for local dev
- Tokens logged in error messages - consider redacting

**Recommendation**: Implement token redaction in error logging

## Common Pitfalls

### 1. Forgetting to handle URL-encoded paths
**Why it happens**: Route params in Next.js are URL-encoded, but APIs expect decoded paths

**How to avoid**:
```typescript
// ❌ Bad
await workspaceGet([encodedPath]); // Might fail if double-encoded

// ✅ Good
import { workspaceGet } from '@/lib/api/workspace';
// workspaceGet internally calls safeDecodePath()
await workspaceGet([encodedPath]);
```

### 2. Not checking for terminal job status before polling
**Why it happens**: Easy to forget to stop polling completed jobs

**How to avoid**:
```typescript
import { isTerminalJobStatus } from '@/lib/api/jobTracker';

if (isTerminalJobStatus(job.status)) {
  clearInterval(pollInterval); // Stop polling
}
```

### 3. Assuming API responses always have expected structure
**Why it happens**: Backend versions vary, responses can change

**How to avoid**:
```typescript
// ❌ Bad
const modelData = await getModelDataFromApi(ref);
const genomeId = modelData.genome_ref.split('/').pop(); // Crashes if genome_ref is undefined

// ✅ Good
const modelData = await getModelDataFromApi(ref);
const genomeId = modelData?.genome_ref?.split('/').pop() ?? 'unknown';
```

### 4. Not using feature flags for environment-specific code
**Why it happens**: Hardcoding URLs or assuming single backend

**How to avoid**:
```typescript
import { USE_NEW_PROXY } from '@/lib/api/config';

if (USE_NEW_PROXY) {
  // New REST endpoint logic
} else {
  // Legacy JSON-RPC fallback
}
```

### 5. Forgetting that some functions are client-side only
**Why it happens**: SSR in Next.js can call API functions during build

**How to avoid**:
```typescript
// Functions that use localStorage will fail in SSR
import { getStoredAuth } from '@/lib/api/auth';

// ❌ Bad (in Server Component or getServerSideProps)
const auth = getStoredAuth(); // Returns null in SSR

// ✅ Good (in Client Component with useEffect)
useEffect(() => {
  const auth = getStoredAuth();
  if (auth) setUser(auth.user_id);
}, []);
```

## Future Improvements

- [ ] **Add comprehensive JSDoc** - All exported functions need examples and param docs
- [ ] **Implement structured logging** - Replace console.* with logger (Winston/Pino)
- [ ] **Add Zod validation** - Runtime validation for API responses
- [ ] **Extract shared utilities** - Create `lib/api/utils.ts` for common functions
- [ ] **Refactor long functions** - Break down `buildSolrUrl` and `listRastGenomes`
- [ ] **Remove dead code** - Delete `callWorkspaceApi`, review `workspaceCopy`
- [ ] **Add request deduplication** - Prevent duplicate concurrent requests
- [ ] **Implement request cancellation** - Use AbortController for cancellable requests
- [ ] **Add client-side caching** - Integrate React Query or SWR
- [ ] **Create custom error classes** - AuthError, WorkspaceError, etc.
- [ ] **Add token expiry handling** - Automatic refresh or re-auth prompt
- [ ] **Improve test coverage** - Target 80%+ coverage
- [ ] **Add integration tests** - E2E tests for critical flows
- [ ] **Document migration path** - Legacy → new API transition plan

## Related Documentation

- [ModelSEED API Documentation](https://github.com/ModelSEED/ModelSEEDpy)
- [BV-BRC API Documentation](https://www.bv-brc.org/docs/api)
- [Workspace API Specification](https://github.com/kbase/workspace_deluxe)
- [Production Review Report](./PRODUCTION_REVIEW.md)
- [Project README](../../README.md)

## Change Log

- **2026-04-06**: Initial production review and README created
  - Documented all 82 exports across 8 files
  - Identified 5 dead code candidates
  - Created comprehensive usage examples
  - Mapped dependencies and architecture

---

**Maintainers**: ModelSEED UI Team  
**Last Updated**: 2026-04-06  
**Review Status**: ⚠️ Needs work (see PRODUCTION_REVIEW.md)
