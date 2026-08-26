// lib/api/config.ts
/**
 * Centralized API endpoint configuration.
 *
 * RAST / modelseed_support calls remain on legacy endpoints (per backend directive).
 *
 * IMPORTANT: Next.js only inlines process.env.NEXT_PUBLIC_* when the key is
 * statically referenced. We use a static map with explicit property access
 * to ensure proper inlining at build time.
 */

const PUBLIC_ENV = {
    NEXT_PUBLIC_DEPLOYMENT_MODE: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE,
    NEXT_PUBLIC_SITE_BASE_URL: process.env.NEXT_PUBLIC_SITE_BASE_URL,
    NEXT_PUBLIC_SITE_BASE_URL_STAGING: process.env.NEXT_PUBLIC_SITE_BASE_URL_STAGING,
    NEXT_PUBLIC_SITE_BASE_URL_PRODUCTION: process.env.NEXT_PUBLIC_SITE_BASE_URL_PRODUCTION,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_API_BASE_URL_STAGING: process.env.NEXT_PUBLIC_API_BASE_URL_STAGING,
    NEXT_PUBLIC_API_BASE_URL_PRODUCTION: process.env.NEXT_PUBLIC_API_BASE_URL_PRODUCTION,
    NEXT_PUBLIC_REST_BASE_URL: process.env.NEXT_PUBLIC_REST_BASE_URL,
    NEXT_PUBLIC_REST_BASE_URL_STAGING: process.env.NEXT_PUBLIC_REST_BASE_URL_STAGING,
    NEXT_PUBLIC_REST_BASE_URL_PRODUCTION: process.env.NEXT_PUBLIC_REST_BASE_URL_PRODUCTION,
    NEXT_PUBLIC_STATUS_API_URL: process.env.NEXT_PUBLIC_STATUS_API_URL,
    NEXT_PUBLIC_STATUS_API_URL_STAGING: process.env.NEXT_PUBLIC_STATUS_API_URL_STAGING,
    NEXT_PUBLIC_STATUS_API_URL_PRODUCTION: process.env.NEXT_PUBLIC_STATUS_API_URL_PRODUCTION,
    NEXT_PUBLIC_SOLR_BASE_URL: process.env.NEXT_PUBLIC_SOLR_BASE_URL,
    NEXT_PUBLIC_SOLR_BASE_URL_STAGING: process.env.NEXT_PUBLIC_SOLR_BASE_URL_STAGING,
    NEXT_PUBLIC_SOLR_BASE_URL_PRODUCTION: process.env.NEXT_PUBLIC_SOLR_BASE_URL_PRODUCTION,
    NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL: process.env.NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL,
    NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_STAGING: process.env.NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_STAGING,
    NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_PRODUCTION: process.env.NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_PRODUCTION,
    NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION: process.env.NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION,
    NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_STAGING: process.env.NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_STAGING,
    NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_PRODUCTION: process.env.NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_PRODUCTION,
    NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL: process.env.NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL,
    NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_STAGING: process.env.NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_STAGING,
    NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_PRODUCTION: process.env.NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_PRODUCTION,
    NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION: process.env.NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION,
    NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_STAGING: process.env.NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_STAGING,
    NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_PRODUCTION: process.env.NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_PRODUCTION,
    NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL: process.env.NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL,
    NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_STAGING: process.env.NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_STAGING,
    NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_PRODUCTION: process.env.NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_PRODUCTION,
    NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION: process.env.NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION,
    NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_STAGING: process.env.NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_STAGING,
    NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_PRODUCTION: process.env.NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_PRODUCTION,
    NEXT_PUBLIC_USE_MODELSEED_API: process.env.NEXT_PUBLIC_USE_MODELSEED_API,
    NEXT_PUBLIC_USE_NEW_PROXY: process.env.NEXT_PUBLIC_USE_NEW_PROXY,
    NEXT_PUBLIC_PROBMODELSEED_URL: process.env.NEXT_PUBLIC_PROBMODELSEED_URL,
    NEXT_PUBLIC_SOLR_NESTED_SCHEMA: process.env.NEXT_PUBLIC_SOLR_NESTED_SCHEMA,
} as const;

type PublicEnvKey = keyof typeof PUBLIC_ENV;

function readEnv(name: PublicEnvKey): string | undefined {
    if (typeof process === 'undefined') return undefined;
    return PUBLIC_ENV[name];
}

function readEnvSafe(name: string): string | undefined {
    if (typeof process === 'undefined') return undefined;
    if (name in PUBLIC_ENV) {
        return PUBLIC_ENV[name as PublicEnvKey];
    }
    return process.env[name];
}

function toNonEmpty(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function stripTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}

function ensureTrailingSlash(value: string): string {
    return `${stripTrailingSlash(value)}/`;
}

const DEPLOYMENT_MODE_VAR = 'NEXT_PUBLIC_DEPLOYMENT_MODE';

export type DeploymentMode = 'staging' | 'production' | 'manual';

function resolveDeploymentMode(raw: string | undefined): DeploymentMode {
    const normalized = raw?.trim().toLowerCase();
    if (normalized === 'staging' || normalized === 'production') {
        return normalized;
    }
    if (normalized === 'manual') {
        return normalized;
    }
    if (!normalized) {
        // Default to staging for build convenience when unset
        return 'staging';
    }
    throw new Error(
        `Invalid ${DEPLOYMENT_MODE_VAR} value "${raw}". Use staging, production, or manual.`,
    );
}

function throwManualModeError(overrideVar: string, description: string): never {
    throw new Error(
        `Missing required environment variable ${overrideVar}. ` +
        `Set ${DEPLOYMENT_MODE_VAR}=staging|production for default endpoints, ` +
        `or set ${overrideVar} (${description}) for manual mode.`,
    );
}

function resolveModeValue(params: {
    overrideVar: string;
    stagingDefaultVar: string;
    productionDefaultVar: string;
    stagingFallback: string | (() => string);
    productionFallback: string | (() => string);
    manualDescription: string;
}): string {
    const overrideValue = toNonEmpty(readEnvSafe(params.overrideVar));
    if (overrideValue) return overrideValue;

    if (DEPLOYMENT_MODE === 'manual') {
        return throwManualModeError(params.overrideVar, params.manualDescription);
    }

    const modeDefaultVar = DEPLOYMENT_MODE === 'staging'
        ? params.stagingDefaultVar
        : params.productionDefaultVar;
    const modeDefaultValue = toNonEmpty(readEnvSafe(modeDefaultVar));
    if (modeDefaultValue) return modeDefaultValue;

    const fallback = DEPLOYMENT_MODE === 'staging'
        ? params.stagingFallback
        : params.productionFallback;
    return typeof fallback === 'function' ? fallback() : fallback;
}

const SITE_DEFAULTS = {
    staging: 'https://staging.modelseed.org',
    production: 'https://modelseed.org',
} as const;

/**
 * Canonical deployment mode selector.
 * - staging | production | manual
 * - unset => staging (build-safe default)
 * - manual => strict override mode (explicit endpoint vars required)
 */
export const DEPLOYMENT_MODE = resolveDeploymentMode(readEnv(DEPLOYMENT_MODE_VAR));

/**
 * Backward-compatible constant name for existing imports.
 * This is not an env var alias.
 */
export const DEPLOY_ENV = DEPLOYMENT_MODE === 'manual' ? '' : DEPLOYMENT_MODE;

export const DEPLOY_ENV_LABEL = DEPLOYMENT_MODE;

/**
 * Base ModelSEED site host (no trailing slash).
 */
export const MODELSEED_SITE_BASE_URL = stripTrailingSlash(
    resolveModeValue({
        overrideVar: 'NEXT_PUBLIC_SITE_BASE_URL',
        stagingDefaultVar: 'NEXT_PUBLIC_SITE_BASE_URL_STAGING',
        productionDefaultVar: 'NEXT_PUBLIC_SITE_BASE_URL_PRODUCTION',
        stagingFallback: SITE_DEFAULTS.staging,
        productionFallback: SITE_DEFAULTS.production,
        manualDescription: 'site base host, e.g. https://staging.modelseed.org',
    }),
);

/**
 * Base URL for modelseed-api (no trailing slash).
 */
export const MODELSEED_API_URL = stripTrailingSlash(
    resolveModeValue({
        overrideVar: 'NEXT_PUBLIC_API_BASE_URL',
        stagingDefaultVar: 'NEXT_PUBLIC_API_BASE_URL_STAGING',
        productionDefaultVar: 'NEXT_PUBLIC_API_BASE_URL_PRODUCTION',
        stagingFallback: () => `${MODELSEED_SITE_BASE_URL}/PMS`,
        productionFallback: () => `${MODELSEED_SITE_BASE_URL}/PMS`,
        manualDescription: 'modelseed-api base URL, e.g. http://localhost:8000',
    }),
);

/**
 * Base URL for legacy ModelSEED REST v0 endpoints (no trailing slash).
 */
export const MODELSEED_REST_URL = stripTrailingSlash(
    resolveModeValue({
        overrideVar: 'NEXT_PUBLIC_REST_BASE_URL',
        stagingDefaultVar: 'NEXT_PUBLIC_REST_BASE_URL_STAGING',
        productionDefaultVar: 'NEXT_PUBLIC_REST_BASE_URL_PRODUCTION',
        stagingFallback: () => `${MODELSEED_SITE_BASE_URL}/api/v0`,
        productionFallback: () => `${MODELSEED_SITE_BASE_URL}/api/v0`,
        manualDescription: 'legacy REST base URL for /api/v0 endpoints',
    }),
);

/**
 * Public API status endpoint used by /about/version checks (no trailing slash).
 */
export const MODELSEED_API_TEST_URL = stripTrailingSlash(
    resolveModeValue({
        overrideVar: 'NEXT_PUBLIC_STATUS_API_URL',
        stagingDefaultVar: 'NEXT_PUBLIC_STATUS_API_URL_STAGING',
        productionDefaultVar: 'NEXT_PUBLIC_STATUS_API_URL_PRODUCTION',
        stagingFallback: () => `${MODELSEED_SITE_BASE_URL}/PMS/api/health`,
        productionFallback: () => `${MODELSEED_SITE_BASE_URL}/PMS/api/health`,
        manualDescription: 'status check endpoint used by /about/version',
    }),
);

function readBooleanEnv(name: string, fallback: boolean): boolean {
    const raw = readEnvSafe(name);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return fallback;
}

/* ─── Feature Flags ──────────────────────────────────────────── */

/**
 * Workspace routing toggle.
 */
export const USE_NEW_PROXY = readBooleanEnv('NEXT_PUBLIC_USE_NEW_PROXY', true);

/**
 * User-data backend toggle.
 */
export const USE_MODELSEED_API = readBooleanEnv('NEXT_PUBLIC_USE_MODELSEED_API', true);

/* ─── Workspace Service ─────────────────────────────────────── */

export const WORKSPACE_URL_LEGACY = 'https://p3.theseed.org/services/Workspace';
export const WORKSPACE_URL_PROXY = `${MODELSEED_API_URL}/api/workspace`;
export const WORKSPACE_URL = USE_NEW_PROXY ? WORKSPACE_URL_PROXY : WORKSPACE_URL_LEGACY;

/* ─── Biochemistry (Solr) Service ───────────────────────────── */

/**
 * Biochemistry pages are Solr-backed by design.
 */
export const BIOCHEM_BACKEND = 'solr' as const;

export const SOLR_BASE_LEGACY = ensureTrailingSlash(
    resolveModeValue({
        overrideVar: 'NEXT_PUBLIC_SOLR_BASE_URL',
        stagingDefaultVar: 'NEXT_PUBLIC_SOLR_BASE_URL_STAGING',
        productionDefaultVar: 'NEXT_PUBLIC_SOLR_BASE_URL_PRODUCTION',
        stagingFallback: () => `${MODELSEED_SITE_BASE_URL}/solr`,
        productionFallback: () => `${MODELSEED_SITE_BASE_URL}/solr`,
        manualDescription: 'Solr base URL, e.g. https://staging.modelseed.org/solr',
    }),
);

/**
 * Kept for callers expecting SOLR_BASE in config.
 */
export const SOLR_BASE = SOLR_BASE_LEGACY;

export type SolrCorpus = 'reactions' | 'compounds' | 'structures';

function resolveSolrCollection(params: {
    overrideVar: string;
    stagingDefaultVar: string;
    productionDefaultVar: string;
    stagingFallback: string;
    productionFallback: string;
    description: string;
    manualFallback?: string;
}): string {
    const overrideValue = toNonEmpty(readEnvSafe(params.overrideVar));
    if (overrideValue) return overrideValue;

    if (DEPLOYMENT_MODE === 'manual') {
        if (params.manualFallback) return params.manualFallback;
        return throwManualModeError(params.overrideVar, params.description);
    }

    const defaultVar = DEPLOYMENT_MODE === 'staging'
        ? params.stagingDefaultVar
        : params.productionDefaultVar;
    const modeDefault = toNonEmpty(readEnvSafe(defaultVar));
    if (modeDefault) return modeDefault;

    return DEPLOYMENT_MODE === 'staging'
        ? params.stagingFallback
        : params.productionFallback;
}

export const SOLR_REACTIONS_COLLECTION = resolveSolrCollection({
    overrideVar: 'NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION',
    stagingDefaultVar: 'NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_STAGING',
    productionDefaultVar: 'NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_PRODUCTION',
    stagingFallback: 'reactions_staging',
    productionFallback: 'reactions',
    description: 'Solr reactions core name (e.g. reactions_staging or reactions)',
});

export const SOLR_COMPOUNDS_COLLECTION = resolveSolrCollection({
    overrideVar: 'NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION',
    stagingDefaultVar: 'NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_STAGING',
    productionDefaultVar: 'NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION_PRODUCTION',
    stagingFallback: 'compounds_staging',
    productionFallback: 'compounds',
    description: 'Solr compounds core name (e.g. compounds_staging or compounds)',
});

export const SOLR_STRUCTURES_COLLECTION = resolveSolrCollection({
    overrideVar: 'NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION',
    stagingDefaultVar: 'NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_STAGING',
    productionDefaultVar: 'NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION_PRODUCTION',
    stagingFallback: 'structures_staging',
    productionFallback: 'structures',
    description: 'Solr structures core name (e.g. structures_staging or structures)',
    manualFallback: 'structures',
});

function resolveSolrCorpusBase(corpus: SolrCorpus): string {
    const envPrefix = `NEXT_PUBLIC_SOLR_${corpus.toUpperCase()}_BASE_URL`;
    const override = toNonEmpty(readEnvSafe(envPrefix));
    if (override) return ensureTrailingSlash(override);

    if (DEPLOYMENT_MODE !== 'manual') {
        const modeDefault = toNonEmpty(readEnvSafe(`${envPrefix}_${DEPLOYMENT_MODE.toUpperCase()}`));
        if (modeDefault) return ensureTrailingSlash(modeDefault);
    }

    // Preserve the shared legacy base when no corpus-specific base is configured.
    return SOLR_BASE_LEGACY;
}

export const SOLR_REACTIONS_BASE = resolveSolrCorpusBase('reactions');
export const SOLR_COMPOUNDS_BASE = resolveSolrCorpusBase('compounds');
export const SOLR_STRUCTURES_BASE = resolveSolrCorpusBase('structures');

export function getSolrCorpusBase(corpus: SolrCorpus): string {
    switch (corpus) {
        case 'reactions': return SOLR_REACTIONS_BASE;
        case 'compounds': return SOLR_COMPOUNDS_BASE;
        case 'structures': return SOLR_STRUCTURES_BASE;
    }
}

export function getSolrCollection(collection: SolrCorpus): string {
    switch (collection) {
        case 'reactions': return SOLR_REACTIONS_COLLECTION;
        case 'compounds': return SOLR_COMPOUNDS_COLLECTION;
        case 'structures': return SOLR_STRUCTURES_COLLECTION;
    }
}

export function solrCorpusEndpoint(corpus: SolrCorpus): string {
    return `${getSolrCorpusBase(corpus)}${getSolrCollection(corpus)}`;
}

function readTriStateBooleanEnv(name: string): boolean | null {
    const raw = readEnvSafe(name);
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return null;
}

/**
 * Manual override for whether the Solr biochem collections use the Solr-9
 * nested-document schema. `null` means unset/unparseable, in which case
 * callers should auto-detect (see `lib/api/solrSchema.ts`).
 */
export const SOLR_NESTED_SCHEMA_OVERRIDE = readTriStateBooleanEnv('NEXT_PUBLIC_SOLR_NESTED_SCHEMA');

/* ─── modelseed_support (RAST Jobs) ─────────────────────────── */

export const MODELSEED_SUPPORT_URL = 'https://modelseed.org/services/ms_fba';

/* ─── ProbModelSEED ─────────────────────────────────────────── */

export const PROBMODELSEED_URL_LEGACY = 'https://p3.theseed.org/services/ProbModelSEED';

export const PROBMODELSEED_URL_PROXY = stripTrailingSlash(
    toNonEmpty(readEnv('NEXT_PUBLIC_PROBMODELSEED_URL'))
    ?? `${MODELSEED_SITE_BASE_URL}/api/model`,
);

export const PROBMODELSEED_URL = USE_NEW_PROXY
    ? PROBMODELSEED_URL_PROXY
    : PROBMODELSEED_URL_LEGACY;

/* ─── Compound Images ───────────────────────────────────────── */

export const CPD_IMG_BASE = 'https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/';
