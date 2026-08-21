import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadConfig() {
    vi.resetModules();
    return import('@/lib/api/config');
}

function clearEndpointOverrides(): void {
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_REST_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_STATUS_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_STAGING', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_BASE_URL_PRODUCTION', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_STAGING', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_COMPOUNDS_BASE_URL_PRODUCTION', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_STAGING', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_PRODUCTION', '');
    vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION', '');
}

describe('api config deployment resolution', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('throws in manual mode when required override vars are missing', async () => {
        clearEndpointOverrides();
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'manual');
        await expect(loadConfig()).rejects.toThrow(/NEXT_PUBLIC_SITE_BASE_URL/);
    });

    it('supports manual mode when explicit overrides are provided', async () => {
        clearEndpointOverrides();
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'manual');
        vi.stubEnv('NEXT_PUBLIC_SITE_BASE_URL', 'https://custom.modelseed.org');
        vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://custom.modelseed.org/PMS');
        vi.stubEnv('NEXT_PUBLIC_REST_BASE_URL', 'https://custom.modelseed.org/api/v0');
        vi.stubEnv('NEXT_PUBLIC_STATUS_API_URL', 'https://custom.modelseed.org/PMS/api/health');
        vi.stubEnv('NEXT_PUBLIC_SOLR_BASE_URL', 'https://custom.modelseed.org/solr');
        vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION', 'reactions_custom');
        vi.stubEnv('NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION', 'compounds_custom');
        const config = await loadConfig();
        expect(config.DEPLOYMENT_MODE).toBe('manual');
        expect(config.MODELSEED_API_URL).toBe('https://custom.modelseed.org/PMS');
        expect(config.MODELSEED_API_TEST_URL).toBe('https://custom.modelseed.org/PMS/api/health');
        expect(config.SOLR_BASE).toBe('https://custom.modelseed.org/solr/');
    });

    it('defaults to staging mode when NEXT_PUBLIC_DEPLOYMENT_MODE is unset', async () => {
        clearEndpointOverrides();
        const config = await loadConfig();
        expect(config.DEPLOYMENT_MODE).toBe('staging');
        expect(config.MODELSEED_SITE_BASE_URL).toBe('https://staging.modelseed.org');
        expect(config.MODELSEED_API_TEST_URL).toBe('https://staging.modelseed.org/PMS/api/health');
        expect(config.SOLR_REACTIONS_COLLECTION).toBe('reactions_staging');
    });

    it('uses production defaults when NEXT_PUBLIC_DEPLOYMENT_MODE=production', async () => {
        clearEndpointOverrides();
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'production');
        const config = await loadConfig();
        expect(config.DEPLOYMENT_MODE).toBe('production');
        expect(config.MODELSEED_API_URL).toBe('https://modelseed.org/PMS');
        expect(config.MODELSEED_API_TEST_URL).toBe('https://modelseed.org/PMS/api/health');
        expect(config.SOLR_REACTIONS_COLLECTION).toBe('reactions');
        expect(config.SOLR_COMPOUNDS_COLLECTION).toBe('compounds');
    });

    it('keeps explicit API URL override as highest precedence', async () => {
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
        vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://modelseed.org/PMS/');
        const config = await loadConfig();
        expect(config.MODELSEED_API_URL).toBe('https://modelseed.org/PMS');
    });

    it('uses explicit Solr collection names from override env', async () => {
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
        vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION', 'reactions_manual');
        vi.stubEnv('NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION', 'compounds_manual');
        const config = await loadConfig();
        expect(config.SOLR_REACTIONS_COLLECTION).toBe('reactions_manual');
        expect(config.SOLR_COMPOUNDS_COLLECTION).toBe('compounds_manual');
    });

    it('uses mode-specific default env values when provided', async () => {
        clearEndpointOverrides();
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
        vi.stubEnv('NEXT_PUBLIC_API_BASE_URL_STAGING', 'https://custom-staging.modelseed.org/PMS');
        vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION_STAGING', 'reactions_custom_staging');
        const config = await loadConfig();
        expect(config.MODELSEED_API_URL).toBe('https://custom-staging.modelseed.org/PMS');
        expect(config.SOLR_REACTIONS_COLLECTION).toBe('reactions_custom_staging');
    });

    it('uses an explicit structures base override over the shared base', async () => {
        clearEndpointOverrides();
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
        vi.stubEnv('NEXT_PUBLIC_SOLR_BASE_URL', 'https://shared.example/solr');
        vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL', 'https://structures.example/solr/');
        const config = await loadConfig();
        expect(config.SOLR_STRUCTURES_BASE).toBe('https://structures.example/solr/');
        expect(config.SOLR_BASE_LEGACY).toBe('https://shared.example/solr/');
    });

    it('uses a mode-specific corpus base when no explicit override is set', async () => {
        clearEndpointOverrides();
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
        vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL_STAGING', 'https://structures-staging.example/solr');
        const config = await loadConfig();
        expect(config.SOLR_STRUCTURES_BASE).toBe('https://structures-staging.example/solr/');
    });

    it('falls back to the legacy base for all corpora when none are configured', async () => {
        clearEndpointOverrides();
        const config = await loadConfig();
        expect(config.SOLR_REACTIONS_BASE).toBe(config.SOLR_BASE_LEGACY);
        expect(config.SOLR_COMPOUNDS_BASE).toBe(config.SOLR_BASE_LEGACY);
        expect(config.SOLR_STRUCTURES_BASE).toBe(config.SOLR_BASE_LEGACY);
    });

    it('does not change reactions or compounds when structures base is configured', async () => {
        clearEndpointOverrides();
        vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL', 'https://structures.example/solr');
        const config = await loadConfig();
        expect(config.SOLR_REACTIONS_BASE).toBe(config.SOLR_BASE_LEGACY);
        expect(config.SOLR_COMPOUNDS_BASE).toBe(config.SOLR_BASE_LEGACY);
    });

    it('concatenates a structures corpus endpoint with exactly one slash', async () => {
        clearEndpointOverrides();
        vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_BASE_URL', 'https://structures.example/solr///');
        vi.stubEnv('NEXT_PUBLIC_SOLR_STRUCTURES_COLLECTION', 'structures_custom');
        const config = await loadConfig();
        expect(config.solrCorpusEndpoint('structures')).toBe('https://structures.example/solr/structures_custom');
    });
});
