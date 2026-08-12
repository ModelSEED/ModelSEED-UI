import { describe, it, expect, afterEach, vi } from 'vitest';

async function loadSolrSchema() {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
    return import('@/lib/api/solrSchema');
}

function mockFetchOnce(numFound: number, status = 200) {
    // Use a factory so each call gets a fresh Response (bodies can only be read once).
    return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
            new Response(JSON.stringify({ response: { numFound, start: 0, docs: [] } }), {
                status,
                headers: { 'Content-Type': 'application/json' },
            }),
        ),
    );
}

describe('parentDocTypeFilter', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('returns doc_type:reaction for reactions', async () => {
        const { parentDocTypeFilter } = await loadSolrSchema();
        expect(parentDocTypeFilter('reactions')).toBe('doc_type:reaction');
    });

    it('returns doc_type:compound for compounds', async () => {
        const { parentDocTypeFilter } = await loadSolrSchema();
        expect(parentDocTypeFilter('compounds')).toBe('doc_type:compound');
    });
});

describe('hasNestedSchema override', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('returns true immediately from the override without a network call', async () => {
        vi.resetModules();
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
        vi.stubEnv('NEXT_PUBLIC_SOLR_NESTED_SCHEMA', 'true');
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        const { hasNestedSchema } = await import('@/lib/api/solrSchema');

        await expect(hasNestedSchema('reactions')).resolves.toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns false immediately from the override without a network call', async () => {
        vi.resetModules();
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
        vi.stubEnv('NEXT_PUBLIC_SOLR_NESTED_SCHEMA', 'false');
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        const { hasNestedSchema } = await import('@/lib/api/solrSchema');

        await expect(hasNestedSchema('compounds')).resolves.toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('hasNestedSchema probe', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('resolves true when the probe finds parent docs', async () => {
        const { hasNestedSchema } = await loadSolrSchema();
        mockFetchOnce(1);

        await expect(hasNestedSchema('reactions')).resolves.toBe(true);
    });

    it('resolves false when the probe finds no docs', async () => {
        const { hasNestedSchema } = await loadSolrSchema();
        mockFetchOnce(0);

        await expect(hasNestedSchema('reactions')).resolves.toBe(false);
    });

    it('resolves false (never rejects) on an HTTP error response', async () => {
        const { hasNestedSchema } = await loadSolrSchema();
        mockFetchOnce(1, 500);

        await expect(hasNestedSchema('compounds')).resolves.toBe(false);
    });

    it('resolves false (never rejects) when fetch throws', async () => {
        const { hasNestedSchema } = await loadSolrSchema();
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

        await expect(hasNestedSchema('compounds')).resolves.toBe(false);
    });

    it('probes each collection only once and shares the result across concurrent callers', async () => {
        const { hasNestedSchema } = await loadSolrSchema();
        const fetchMock = mockFetchOnce(1);

        const [a, b] = await Promise.all([hasNestedSchema('reactions'), hasNestedSchema('reactions')]);
        expect(a).toBe(true);
        expect(b).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // A subsequent call reuses the cached result; still only one fetch total.
        await hasNestedSchema('reactions');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('probes reactions and compounds independently', async () => {
        const { hasNestedSchema } = await loadSolrSchema();
        const fetchMock = mockFetchOnce(1);

        await hasNestedSchema('reactions');
        await hasNestedSchema('compounds');

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

describe('resetSolrSchemaCache', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('forces a fresh probe on the next call', async () => {
        const { hasNestedSchema, resetSolrSchemaCache } = await loadSolrSchema();
        const fetchMock = mockFetchOnce(1);

        await hasNestedSchema('reactions');
        expect(fetchMock).toHaveBeenCalledTimes(1);

        resetSolrSchemaCache();
        await hasNestedSchema('reactions');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
