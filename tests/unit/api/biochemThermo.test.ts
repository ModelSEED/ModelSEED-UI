import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetSolrSchemaCache } from '@/lib/api/solrSchema';

async function loadBiochemApi() {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
    return import('@/lib/api/biochem');
}

/** Builds a fetch mock that answers the nested-schema probe and the id lookup differently by URL shape. */
function mockFetch(opts: { nested: boolean; doc?: Record<string, unknown> }) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        const isProbe = url.includes('rows=0');
        const body = isProbe
            ? { response: { numFound: opts.nested ? 1 : 0, start: 0, docs: [] } }
            : { response: { numFound: opts.doc ? 1 : 0, start: 0, docs: opts.doc ? [opts.doc] : [] } };
        return Promise.resolve(
            new Response(JSON.stringify(body), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
    });
}

describe('getReactionById / getCompoundById thermodynamics', () => {
    beforeEach(() => {
        resetSolrSchemaCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        resetSolrSchemaCache();
    });

    it('normalizes 3 nested thermodynamics children for a reaction, preserving order and operator', async () => {
        const biochemApi = await loadBiochemApi();
        const doc = {
            id: 'rxn00001',
            thermodynamics: [
                { doc_type: 'thermodynamics', source_name: 'eQuilibrator', energy: -10.5, error: 1.2, operator: '=' },
                { doc_type: 'thermodynamics', source_name: 'Alberty', energy: -9.1, error: 0.5, operator: '>' },
                { doc_type: 'thermodynamics', source_name: 'Jankowski', energy: -11.0, error: 2.0, operator: '<' },
            ],
        };
        mockFetch({ nested: true, doc });

        const result = await biochemApi.getReactionById('rxn00001');

        expect(result.thermodynamics).toEqual([
            { source_name: 'eQuilibrator', energy: -10.5, error: 1.2, operator: '=' },
            { source_name: 'Alberty', energy: -9.1, error: 0.5, operator: '>' },
            { source_name: 'Jankowski', energy: -11.0, error: 2.0, operator: '<' },
        ]);
    });

    it('normalizes children found under legacy _childDocuments_ for a compound', async () => {
        const biochemApi = await loadBiochemApi();
        const doc = {
            id: 'cpd00001',
            _childDocuments_: [
                { doc_type: 'thermodynamics', source_name: 'eQuilibrator', energy: -5, error: 0.1 },
            ],
        };
        mockFetch({ nested: true, doc });

        const result = await biochemApi.getCompoundById('cpd00001');

        expect(result.thermodynamics).toEqual([
            { source_name: 'eQuilibrator', energy: -5, error: 0.1 },
        ]);
    });

    it('returns thermodynamics: [] and an unmodified URL on the legacy schema', async () => {
        const biochemApi = await loadBiochemApi();
        const doc = { id: 'rxn00001' };
        const fetchMock = mockFetch({ nested: false, doc });

        const result = await biochemApi.getReactionById('rxn00001');

        expect(result.thermodynamics).toEqual([]);
        const dataCall = fetchMock.mock.calls.find(([input]) => !String(input).includes('rows=0'));
        const dataUrl = String(dataCall?.[0]);
        expect(dataUrl).not.toContain('fq=');
        expect(dataUrl).not.toContain('fl=');
    });

    it('adds the encoded parent doc_type filter and [child] transformer on the nested schema', async () => {
        const biochemApi = await loadBiochemApi();
        const doc = { id: 'rxn00001', thermodynamics: [] };
        const fetchMock = mockFetch({ nested: true, doc });

        await biochemApi.getReactionById('rxn00001');

        const dataCall = fetchMock.mock.calls.find(([input]) => !String(input).includes('rows=0'));
        const dataUrl = String(dataCall?.[0]);
        expect(dataUrl).toContain(`fq=${encodeURIComponent('doc_type:reaction')}`);
        expect(dataUrl).toContain(`fl=${encodeURIComponent('*,[child childFilter=doc_type:thermodynamics]')}`);
    });

    it('drops malformed children and coerces array-wrapped/absent numeric values', async () => {
        const biochemApi = await loadBiochemApi();
        const doc = {
            id: 'rxn00001',
            thermodynamics: [
                { doc_type: 'thermodynamics', energy: -1, error: 0.1 }, // missing source_name -> dropped
                { doc_type: 'thermodynamics', source_name: 'good', energy: ['-1.5'] }, // error absent
                { doc_type: 'other', source_name: 'wrong-type', energy: -2, error: 0.2 }, // wrong doc_type -> dropped
            ],
        };
        mockFetch({ nested: true, doc });

        const result = await biochemApi.getReactionById('rxn00001');

        expect(result.thermodynamics).toEqual([
            { source_name: 'good', energy: -1.5, error: null },
        ]);
    });

    it('normalizeThermodynamics(null | undefined | {} | 42) all return []', async () => {
        const biochemApi = await loadBiochemApi();
        expect(biochemApi.normalizeThermodynamics(null)).toEqual([]);
        expect(biochemApi.normalizeThermodynamics(undefined)).toEqual([]);
        expect(biochemApi.normalizeThermodynamics({})).toEqual([]);
        expect(biochemApi.normalizeThermodynamics(42)).toEqual([]);
    });
});
