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

    it('normalizes rxn00001 per-source thermo evidence alongside its visible energy rows', async () => {
        const biochemApi = await loadBiochemApi();
        mockFetch({
            nested: true,
            doc: {
                id: 'rxn00001',
                thermodynamics: [
                    { doc_type: 'thermodynamics', source_name: 'Group contribution', energy: 4.18, error: 2.24, operator: '=', grade: 'gold', assessment: 'consistent', cross_source: 'agrees' },
                    { doc_type: 'thermodynamics', source_name: 'LLMs', operator: '>' },
                    { doc_type: 'thermodynamics', source_name: 'dGPredictor', energy: -3.78, error: 1.48, operator: '>' },
                    { doc_type: 'thermodynamics', source_name: 'eQuilibrator', energy: -4.03, error: 0.05, operator: '>' },
                ],
            },
        });

        const result = await biochemApi.getReactionById('rxn00001');

        expect(result.thermodynamics).toHaveLength(3);
        expect(result.llm_council_proposals).toEqual([{ source_name: 'LLMs', proposed_direction: '>' }]);
        expect(result.thermo_evidence).toEqual([{ grade: 'gold', assessment: 'consistent', cross_source: 'agrees', source: 'Group contribution' }]);
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

    it('requests and normalizes thermo_evidence alongside existing nested children', async () => {
        const biochemApi = await loadBiochemApi();
        const doc = {
            id: 'rxn00024',
            thermodynamics: [
                { doc_type: 'thermodynamics', source_name: 'Group contribution', energy: 4.18, error: 2.24 },
                { doc_type: 'thermodynamics', source_name: 'LLMs', operator: '>' },
                { doc_type: 'thermodynamics', source_name: 'dGPredictor', energy: -3.78, error: 1.48 },
                { doc_type: 'thermodynamics', source_name: 'eQuilibrator', energy: -4.03, error: 0.05 },
                { doc_type: 'thermo_evidence', thermo_evidence: { grade: 'bronze', assessment: 'unconfident', cross_source: 'outvoted', source: 'eQ' } },
            ],
        };
        const fetchMock = mockFetch({ nested: true, doc });

        const result = await biochemApi.getReactionById('rxn00024');

        const dataCall = fetchMock.mock.calls.find(([input]) => !String(input).includes('rows=0'));
        const dataUrl = String(dataCall?.[0]);
        expect(dataUrl).toContain(`fq=${encodeURIComponent('doc_type:reaction')}`);
        expect(dataUrl).toContain(`fl=${encodeURIComponent('*,[child childFilter=\"doc_type:thermodynamics OR doc_type:thermo_evidence OR doc_type:stoichiometry OR doc_type:thermo-evidence\" limit=200]')}`);
        expect(result.thermodynamics).toEqual([
            { source_name: 'Group contribution', energy: 4.18, error: 2.24 },
            { source_name: 'dGPredictor', energy: -3.78, error: 1.48 },
            { source_name: 'eQuilibrator', energy: -4.03, error: 0.05 },
        ]);
        expect(result.llm_council_proposals).toEqual([{ source_name: 'LLMs', proposed_direction: '>' }]);
        expect(result.thermo_evidence).toEqual([{ grade: 'bronze', assessment: 'unconfident', cross_source: 'outvoted', source: 'eQ' }]);
    });

    it('separates an LLM council direction proposal from energy evidence', async () => {
        const biochemApi = await loadBiochemApi();
        const doc = {
            id: 'rxn00001',
            thermodynamics: [
                { doc_type: 'thermodynamics', source_name: 'LLMs', operator: '>' },
                { doc_type: 'thermodynamics', source_name: 'good', energy: ['-1.5'] }, // error absent
                { doc_type: 'thermodynamics', source_name: 'LLMs' }, // malformed proposal -> dropped
                { doc_type: 'other', source_name: 'wrong-type', energy: -2, error: 0.2 }, // wrong doc_type -> dropped
            ],
        };
        mockFetch({ nested: true, doc });

        const result = await biochemApi.getReactionById('rxn00001');

        expect(result.thermodynamics).toEqual([
            { source_name: 'good', energy: -1.5, error: null },
        ]);
        expect(result.llm_council_proposals).toEqual([
            { source_name: 'LLMs', proposed_direction: '>' },
        ]);
    });

    it('requests and normalizes compound pKas without altering legacy pKa fields', async () => {
        const biochemApi = await loadBiochemApi();
        const fetchMock = mockFetch({
            nested: true,
            doc: {
                id: 'cpd00002',
                pka: ['\"4.2\"'],
                pkas: [
                    { source_name: 'Literature', pka_kind: 'macroscopic', pka_number: [7.6, 4.68] },
                    { source_name: 'Marvin', pka_kind: 'microscopic', pka_number: [0.89, 2.06, 2.68] },
                    { source_name: 'MolGpKa', pka_kind: 'microscopic', pka_number: [11.57, 'not-a-number', 0.98] },
                ],
            },
        });

        const result = await biochemApi.getCompoundById('cpd00002');
        const dataCall = fetchMock.mock.calls.find(([input]) => !String(input).includes('rows=0'));
        expect(String(dataCall?.[0])).toContain(encodeURIComponent('*,[child childFilter="doc_type:thermodynamics OR doc_type:pkas OR doc_type:pka" limit=200]'));
        expect(result.pkas).toEqual([
            { source_name: 'Literature', pka_kind: 'macroscopic', pka_number: [7.6, 4.68] },
            { source_name: 'Marvin', pka_kind: 'microscopic', pka_number: [0.89, 2.06, 2.68] },
            { source_name: 'MolGpKa', pka_kind: 'microscopic', pka_number: [11.57, 0.98] },
        ]);
        expect(result.pka).toEqual(['\"4.2\"']);
    });

    it('normalizeThermodynamics(null | undefined | {} | 42) all return []', async () => {
        const biochemApi = await loadBiochemApi();
        expect(biochemApi.normalizeThermodynamics(null)).toEqual([]);
        expect(biochemApi.normalizeThermodynamics(undefined)).toEqual([]);
        expect(biochemApi.normalizeThermodynamics({})).toEqual([]);
        expect(biochemApi.normalizeThermodynamics(42)).toEqual([]);
    });
});
