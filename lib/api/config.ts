// lib/api/config.ts
/**
 * Centralized API endpoint configuration.
 *
 * Toggle USE_NEW_PROXY to route Workspace and Biochemistry calls
 * through José's unified proxy instead of the legacy direct endpoints.
 *
 * RAST / modelseed_support calls are ALWAYS routed to the legacy
 * endpoint regardless of this toggle (per Chris Henry's directive).
 */

/* ─── Feature Flag ───────────────────────────────────────────── */

/**
 * When `true`, Workspace and Biochemistry calls are routed through
 * the new unified proxy service. Set to `false` (default) to keep
 * using the legacy direct endpoints while the proxy is in development.
 */
export const USE_NEW_PROXY = false;

/* ─── Workspace Service ─────────────────────────────────────── */

/** Legacy direct Workspace JSON-RPC endpoint. */
export const WORKSPACE_URL_LEGACY = 'https://p3.theseed.org/services/Workspace';

/**
 * New unified proxy endpoint for Workspace operations.
 * Update this URL once José deploys the production proxy.
 */
export const WORKSPACE_URL_PROXY = 'https://modelseed.org/api/workspace';

/** Resolved Workspace URL based on feature flag. */
export const WORKSPACE_URL = USE_NEW_PROXY
    ? WORKSPACE_URL_PROXY
    : WORKSPACE_URL_LEGACY;

/* ─── Biochemistry (Solr) Service ───────────────────────────── */

/** Legacy direct Solr endpoint for biochemistry queries. */
export const SOLR_BASE_LEGACY = 'https://modelseed.org/solr/';

/**
 * New proxy endpoint for biochemistry queries.
 * Update this URL once the new service supports biochem lookups.
 */
export const SOLR_BASE_PROXY = 'https://modelseed.org/api/solr/';

/** Resolved Solr base URL based on feature flag. */
export const SOLR_BASE = USE_NEW_PROXY
    ? SOLR_BASE_PROXY
    : SOLR_BASE_LEGACY;

/* ─── modelseed_support (RAST Jobs) ─────────────────────────── */

/**
 * RAST job listings endpoint.
 * This ALWAYS points to the legacy modelseed_support server because
 * it requires physical access to the jobs directory on a specific machine.
 * Do NOT route through the new proxy.
 */
export const MODELSEED_SUPPORT_URL = 'https://modelseed.org/services/ms_fba';

/* ─── ProbModelSEED ─────────────────────────────────────────── */

/** Legacy ProbModelSEED service endpoint (being replaced by new proxy). */
export const PROBMODELSEED_URL_LEGACY = 'https://p3.theseed.org/services/ProbModelSEED';

/**
 * New proxy endpoint replacing ProbModelSEED operations
 * (list_models, get_model, run_fba, etc.).
 */
export const PROBMODELSEED_URL_PROXY = 'https://modelseed.org/api/model';

/** Resolved ProbModelSEED URL based on feature flag. */
export const PROBMODELSEED_URL = USE_NEW_PROXY
    ? PROBMODELSEED_URL_PROXY
    : PROBMODELSEED_URL_LEGACY;

/* ─── Compound Images ───────────────────────────────────────── */

export const CPD_IMG_BASE = 'https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/';
