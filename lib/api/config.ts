// lib/api/config.ts
/**
 * Centralized API endpoint configuration.
 *
 * Toggle USE_NEW_PROXY to route Workspace calls through José's
 * unified proxy instead of the legacy direct endpoints.
 *
 * RAST / modelseed_support calls are ALWAYS routed to the legacy
 * endpoint regardless of this toggle (per Chris Henry's directive).
 */

/* ─── modelseed-api Base URL ─────────────────────────────────── */

/**
 * Base URL for the ModelSEED REST API (Poplar backend).
 * 
 * In development, set NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
 * when running the FastAPI server locally. In production, this should point
 * to the deployed modelseed-api instance.
 * 
 * @default 'http://poplar.cels.anl.gov:8000' (José's demo instance)
 */
export const MODELSEED_API_URL =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MODELSEED_API_URL) ||
    // Poplar demo instance provided by José for development/testing.
    'http://poplar.cels.anl.gov:8000';

/* ─── Feature Flags ──────────────────────────────────────────── */

/**
 * Feature flag: Enable new unified proxy for Workspace operations.
 * 
 * When true, Workspace calls route through the new REST proxy service at
 * MODELSEED_API_URL/api/workspace. Phase 20+ targets the new proxy by default.
 * Set NEXT_PUBLIC_USE_NEW_PROXY=false only when intentionally falling back to
 * the legacy JSON-RPC Workspace service.
 * 
 * @default true
 */
let useNewProxyDefault = true;
if (typeof process !== 'undefined') {
    const raw = process.env.NEXT_PUBLIC_USE_NEW_PROXY;
    if (raw === 'false') {
        useNewProxyDefault = false;
    } else if (raw === 'true') {
        useNewProxyDefault = true;
    }
}
export const USE_NEW_PROXY = useNewProxyDefault;

/**
 * Feature flag: Use modelseed-api for user data pages.
 * 
 * When true, user-data pages (My Models, My Media, related flows) communicate
 * with the modelseed-api backend instead of legacy JSON-RPC services. This is
 * controlled via NEXT_PUBLIC_USE_MODELSEED_API environment variable.
 * 
 * @default true (use modelseed-api when available)
 */
let useModelseedApiDefault = true;
if (typeof process !== 'undefined') {
    const raw = process.env.NEXT_PUBLIC_USE_MODELSEED_API;
    if (raw === 'false') {
        useModelseedApiDefault = false;
    } else if (raw === 'true') {
        useModelseedApiDefault = true;
    }
}
export const USE_MODELSEED_API = useModelseedApiDefault;

/* ─── Workspace Service ─────────────────────────────────────── */

/**
 * Legacy direct Workspace JSON-RPC endpoint.
 * Used when USE_NEW_PROXY=false (deprecated).
 */
export const WORKSPACE_URL_LEGACY = 'https://p3.theseed.org/services/Workspace';

/**
 * New unified proxy endpoint for Workspace operations.
 * Routes through modelseed-api for better error handling and compatibility.
 */
export const WORKSPACE_URL_PROXY = `${MODELSEED_API_URL}/api/workspace`;

/**
 * Resolved Workspace URL based on USE_NEW_PROXY feature flag.
 * Most code should use this constant rather than the specific variants.
 */
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
export const SOLR_BASE_PROXY = `${MODELSEED_API_URL}/api/solr/`;

/**
 * When `true`, Biochemistry calls are routed through the new modelseed-api.
 * Set to `false` (default) to keep using legacy Solr for the main tables,
 * as recommended by the backend team for now.
 */
let useNewBiochemDefault = false;
if (typeof process !== 'undefined') {
    const raw = process.env.NEXT_PUBLIC_USE_NEW_BIOCHEM;
    if (raw === 'true') useNewBiochemDefault = true;
}
export const USE_NEW_BIOCHEM = useNewBiochemDefault;

/** Resolved Solr base URL. */
export const SOLR_BASE = USE_NEW_BIOCHEM
    ? SOLR_BASE_PROXY
    : SOLR_BASE_LEGACY;

/* ─── modelseed_support (RAST Jobs) ─────────────────────────── */

/**
 * RAST job listings endpoint.
 * 
 * This ALWAYS points to the legacy modelseed_support server because it requires
 * physical access to the jobs directory on a specific machine. Do NOT route
 * through the new proxy. Per Chris Henry's directive, this endpoint is not
 * being migrated.
 */
export const MODELSEED_SUPPORT_URL = 'https://modelseed.org/services/ms_fba';

/* ─── ProbModelSEED ─────────────────────────────────────────── */

/**
 * Legacy ProbModelSEED service endpoint (being replaced by new proxy).
 */
export const PROBMODELSEED_URL_LEGACY = 'https://p3.theseed.org/services/ProbModelSEED';

/**
 * New proxy endpoint replacing ProbModelSEED operations.
 * Handles list_models, get_model, run_fba, etc.
 */
export const PROBMODELSEED_URL_PROXY = 'https://modelseed.org/api/model';

/**
 * Resolved ProbModelSEED URL based on USE_NEW_PROXY feature flag.
 */
export const PROBMODELSEED_URL = USE_NEW_PROXY
    ? PROBMODELSEED_URL_PROXY
    : PROBMODELSEED_URL_LEGACY;

/* ─── Compound Images ───────────────────────────────────────── */

/**
 * Base URL for pre-rendered compound structure images.
 * Images are PNG format, named by compound ID (e.g., cpd00001.png).
 */
export const CPD_IMG_BASE = 'https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/';


