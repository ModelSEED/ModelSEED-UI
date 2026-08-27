# Deployment Configuration

This document describes every environment variable consumed by the ModelSEED UI,
how they are resolved at runtime, and how to configure them for different environments.

---

## Quick Start

```bash
cp .env.example .env.local
# Edit .env.local to match your environment, then:
npm run dev
```

---

## Deployment Mode

The `NEXT_PUBLIC_DEPLOYMENT_MODE` variable selects which set of endpoint defaults
the application uses. It is the **primary switch** that controls all URL resolution.

| Value        | Behavior |
| :----------- | :------- |
| `staging`    | All endpoints resolve to `staging.modelseed.org` subdomains. **Default when unset.** |
| `production` | All endpoints resolve to `modelseed.org` subdomains. |
| `manual`     | Disables automatic resolution. Every URL override must be set explicitly. The app will throw at startup if any required override is missing. |

**Default:** `staging` (when the variable is unset or empty)

**Required:** No. The app defaults to `staging` automatically. Only set this to `production` or `manual` if you need a different behavior. Invalid non-empty values will cause a startup error.

**Important:** When switching between staging and production, you do not need to
touch any of the individual URL variables. The mode defaults in `.env.example`
(and the hardcoded fallbacks in `lib/api/config.ts`) handle everything.

---

## Resolution Algorithm (for all URL variables)

Every URL-type variable follows a strict three-tier resolution order:

```
1. Override (highest precedence)
   e.g. NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

2. Mode-specific default
   e.g. NEXT_PUBLIC_API_BASE_URL_STAGING=https://staging.modelseed.org/PMS

3. Hardcoded fallback in lib/api/config.ts
   e.g. ${MODELSEED_SITE_BASE_URL}/PMS
```

The app checks tier 1 first. If it is empty, tier 2 is consulted. If that is also
empty (or the variable is not set), the code in `lib/api/config.ts` applies a
computed fallback derived from the site base URL.

**You only need to set the override tier (`NEXT_PUBLIC_X`) when you want to
deviate from the deployment mode defaults.** For standard staging or production
deployments, leave all override variables **blank** and rely on the mode defaults.

---

## Environment Variable Reference

### `NEXT_PUBLIC_DEPLOYMENT_MODE`

Controls which mode-default set is active.

- **Values:** `staging` | `production` | `manual`
- **Default:** `staging`
- **Required:** No. Defaults to `staging` when unset.

---

### Base URLs (no trailing slash)

#### `NEXT_PUBLIC_SITE_BASE_URL` -- Required in manual mode, otherwise optional

The base origin for the ModelSEED website. All other URL fallbacks derive from this.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `staging=https://staging.modelseed.org` / `production=https://modelseed.org`
- **Hardcoded fallback:** `SITE_DEFAULTS` in `lib/api/config.ts` (`staging=https://staging.modelseed.org` / `production=https://modelseed.org`)

#### `NEXT_PUBLIC_API_BASE_URL` -- Required in manual mode, otherwise optional

Base URL for the modelseed-api (Poplar) service.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `staging=https://staging.modelseed.org/PMS` / `production=https://modelseed.org/PMS`
- **Fallback:** `{MODELSEED_SITE_BASE_URL}/PMS`
- **Common local setup:** `http://localhost:8000` (via Poplar SSH tunnel)

#### `NEXT_PUBLIC_REST_BASE_URL` -- Required in manual mode, otherwise optional

Base URL for the legacy ModelSEED REST v0 API.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `staging=https://staging.modelseed.org/api/v0` / `production=https://modelseed.org/api/v0`
- **Fallback:** `{MODELSEED_SITE_BASE_URL}/api/v0`

#### `NEXT_PUBLIC_STATUS_API_URL` -- Required in manual mode, otherwise optional

Status endpoint used by the `/about/version` page for build and service checks.

- **Override:** Required in manual mode; when set explicitly, use `{MODELSEED_SITE_BASE_URL}/PMS/api/health`
- **Mode defaults:** `staging=https://staging.modelseed.org/PMS/api/health` / `production=https://modelseed.org/PMS/api/health`
- **Fallback:** `{MODELSEED_SITE_BASE_URL}/PMS/api/health`

---

### Solr Configuration

#### `NEXT_PUBLIC_SOLR_BASE_URL` -- Required in manual mode, otherwise optional

Shared base URL for the Solr search backend. Trailing slash is normalized at runtime.

Solr is not deployed per-site. A single instance at `modelseed.org/solr` hosts both
core sets -- `reactions`/`compounds`/`structures` and their `*_staging` twins -- so
staging and production share this base URL and differ only in the collection names.
`staging.modelseed.org/solr` is an older, separate deployment still on the pre-Solr-9
flat schema (no nested child documents, no `atom_mapping`); it is not a valid target
for this build.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `NEXT_PUBLIC_SOLR_BASE_URL_STAGING=https://modelseed.org/solr/` / `NEXT_PUBLIC_SOLR_BASE_URL_PRODUCTION=https://modelseed.org/solr/`
- **Fallback:** `https://modelseed.org/solr/`

#### `NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL` -- Optional in every mode

Base URL for only the reactions corpus. When unset, it inherits the shared Solr base URL.

- **Override:** `NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL`
- **Mode defaults:** `NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_STAGING` / `NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_PRODUCTION`
- **Fallback:** `NEXT_PUBLIC_SOLR_BASE_URL` resolution; mode-suffixed values are ignored in manual mode

#### `NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL` -- Optional in every mode

Base URL for only the compounds corpus. When unset, it inherits the shared Solr base URL.

- **Override:** `NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL`
- **Mode defaults:** `NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_STAGING` / `NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_PRODUCTION`
- **Fallback:** `NEXT_PUBLIC_SOLR_BASE_URL` resolution; mode-suffixed values are ignored in manual mode

#### `NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL` -- Optional in every mode

Base URL for only the structures corpus. When unset, it inherits the shared Solr base URL.

- **Override:** `NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL`
- **Mode defaults:** `NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_STAGING` / `NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_PRODUCTION`
- **Fallback:** `NEXT_PUBLIC_SOLR_BASE_URL` resolution; mode-suffixed values are ignored in manual mode

#### `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION` -- Required in manual mode, otherwise optional

Solr core name for the reactions collection.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_STAGING=reactions_staging` / `NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_PRODUCTION=reactions`
- **Fallback:** `reactions_staging` (staging) / `reactions` (production)

#### `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION` -- Required in manual mode, otherwise optional

Solr core name for the compounds collection.

- **Override:** Required in manual mode, optional otherwise
- **Mode defaults:** `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_STAGING=compounds_staging` / `NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_PRODUCTION=compounds`
- **Fallback:** `compounds_staging` (staging) / `compounds` (production)

#### `NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION` -- Optional in manual mode

Solr core name for the structures collection. It remains optional in manual mode to keep pre-existing manual-mode deployments working.

- **Override:** Optional in every mode
- **Mode defaults:** `NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_STAGING=structures_staging` / `NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_PRODUCTION=structures`
- **Fallback:** `structures_staging` (staging) / `structures` (production); `structures` in manual mode

#### `NEXT_PUBLIC_SOLR_NESTED_SCHEMA` -- Optional

Controls whether reactions and compounds use Solr-9 nested-document queries.

- **When unset:** Auto-detects by a one-time probe per collection.
- **Values:** `true` / `1` forces Solr-9 nested-document queries (parent documents only); `false` / `0` forces legacy flat behavior.
- **Failure behavior:** A non-OK response or failed probe falls back to legacy flat queries.

#### `SOLR_PROXY_UPSTREAM` -- Server-only, optional

Server-only (no `NEXT_PUBLIC_` prefix) and never sent to the browser. When set, `next.config.ts` registers the rewrite `/solr/:path*` to `${SOLR_PROXY_UPSTREAM}/:path*`; when unset or empty, no proxy route exists. This makes a relative base such as `/solr/` work.

- **Internal hosts:** `http://poplar:8983/solr` is an internal host for development/internal deployments only and must never be used as a public production value.

---

### Feature Flags (optional)

#### `NEXT_PUBLIC_USE_MODELSEED_API`

Enables the modelseed-api (Poplar) proxy for workspace operations. When `false`,
the legacy Workspace URL (`https://p3.theseed.org/services/Workspace`) is used.

- **Values:** `true` | `false`
- **Default:** `true`

#### `NEXT_PUBLIC_USE_NEW_PROXY`

Enables the new proxy layer for backend services. When `false`, certain services
(ProbModelSEED, Workspace) fall back to their legacy endpoints.

- **Values:** `true` | `false`
- **Default:** `true`

---

### ProbModelSEED URL (optional)

#### `NEXT_PUBLIC_PROBMODELSEED_URL`

Override for the ProbModelSEED API endpoint. No trailing slash.

- **When `NEXT_PUBLIC_USE_NEW_PROXY=true` and this is empty:** Resolves to `{SITE_BASE_URL}/api/model`
- **When `NEXT_PUBLIC_USE_NEW_PROXY=false`:** This is ignored; the legacy URL is used instead.

---

### RDKit.js URL (optional)

#### `NEXT_PUBLIC_RDKIT_BASE_URL`

Override for self-hosted RDKit.js assets. No trailing slash.

- **When empty:** RDKit.js loads from the unpkg CDN (`https://unpkg.com/@rdkit/rdkit@{VERSION}/dist`).
- **When set:** Must point to a directory containing `RDKit_minimal.js` and `RDKit_minimal.wasm`.
  Example for self-hosting via the `/public` directory: `/rdkit`

**Note:** Next.js serves files under `public/` at the site root, so `public/rdkit` maps to the URL `/rdkit`, not `/public/rdkit`.

---

### Build Metadata (displayed on /about/version)

These values are injected at build time by CI/CD and do not affect runtime behavior.
They are safe to leave blank for local development.

| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_GIT_VERSION` | Semantic version string |
| `NEXT_PUBLIC_GIT_BRANCH` | Git branch name |
| `NEXT_PUBLIC_GIT_COMMIT` | Git commit SHA |
| `NEXT_PUBLIC_DEPLOY_DATE` | Deployment date string |

---

### Test Credentials (optional)

#### `PATRIC_TOKEN`

PATRIC authentication token for integration testing. Obtain from
<https://p3.theseed.org/user/authenticate>.

Not required for application functionality.

---

## Scenarios

### Standard Staging Deployment

Set only the deployment mode. Everything else resolves automatically:

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=staging
```

### Standard Production Deployment

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=production
```

### Local Development (Poplar Tunnel)

Start a tunnel, then override the API base URL:

```bash
ssh -L 8000:localhost:8000 YOUR_USERNAME@poplar.cels.anl.gov
```

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=staging
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Complete Custom (Manual Mode)

Set every URL explicitly:

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=manual
NEXT_PUBLIC_SITE_BASE_URL=https://my-custom-host.example.com
NEXT_PUBLIC_API_BASE_URL=https://my-custom-host.example.com/PMS
NEXT_PUBLIC_REST_BASE_URL=https://my-custom-host.example.com/api/v0
NEXT_PUBLIC_STATUS_API_URL=https://my-custom-host.example.com/PMS/api/health
NEXT_PUBLIC_SOLR_BASE_URL=https://my-custom-host.example.com/solr/
NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION=reactions
NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION=compounds
```

### Pointing Biochemistry at a Different Solr (legacy, Solr 9, or temporary)

**Legacy / do nothing.** Leave every Solr override empty. The shared mode default applies, and the nested-schema probe falls back to legacy; this is the zero-configuration state.

```env
# Leave all NEXT_PUBLIC_SOLR_* and SOLR_PROXY_UPSTREAM values empty
```

**New Solr 9, whole site.** Set the shared base (or its active mode variant) and collection names for the new instance.

```env
NEXT_PUBLIC_SOLR_BASE_URL=https://solr.example.org/solr/
NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION=reactions
NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION=compounds
NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION=structures
```

**One corpus only / temporary instance.** Set only the base for the corpus being moved; the other corpora continue using the shared legacy base.

```env
NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL=https://solr.example.org/solr/
NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION=structures
```

**Internal upstream via the built-in proxy.** Set the server-only upstream to an internal URL and use `/solr/` as the shared or per-corpus base.

```env
SOLR_PROXY_UPSTREAM=http://internal-host:8983/solr
NEXT_PUBLIC_SOLR_BASE_URL=/solr/
```

`NEXT_PUBLIC_*` values are inlined at build time, so restart a dev server and rebuild a deployed application for changes to take effect; `SOLR_PROXY_UPSTREAM` is read when the Next.js configuration loads, so it also requires a restart.

---

## Runtime Configuration Code

All URL resolution logic lives in:

- **`lib/api/config.ts`** -- Defines `resolveModeValue()`, `resolveDeploymentMode()`,
  and exports all resolved URL constants (`MODELSEED_SITE_BASE_URL`,
  `MODELSEED_API_URL`, `MODELSEED_REST_URL`, `SOLR_BASE_LEGACY`, etc.).
- **`lib/rdkit.ts`** -- Handles `NEXT_PUBLIC_RDKIT_BASE_URL` with an unpkg fallback.

---

## Switching Between Environments

To change the target environment after the app is running:

1. Update `NEXT_PUBLIC_DEPLOYMENT_MODE` in `.env.local`
2. Restart the dev server (`npm run dev`) or rebuild (`npm run build`)
3. Verify on the `/about/version` page that the correct endpoints are shown

**Note:** `.env.local` changes require a full server restart. HMR does not pick up
environment variable changes.