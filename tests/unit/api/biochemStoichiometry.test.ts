import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSolrSchemaCache } from '@/lib/api/solrSchema';

async function loadBiochemApi() {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
    return import('@/lib/api/biochem');
}

function mockFetch(nested: { reactions?: boolean; compounds?: boolean }, doc?: Record<string, unknown>) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        const isProbe = url.includes('rows=0');
        const isCompound = url.includes('/compounds_staging/');
        const found = isCompound ? nested.compounds : nested.reactions;
        const body = isProbe
            ? { response: { numFound: found ? 1 : 0, start: 0, docs: [] } }
            : { response: { numFound: doc ? 1 : 0, start: 0, docs: doc ? [doc] : [] } };
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
}

function dataUrl(mock: ReturnType<typeof mockFetch>, index = -1): string {
    return String(mock.mock.calls.filter(([input]) => !String(input).includes('rows=0')).at(index)?.[0]);
}

describe('Solr stoichiometry support', () => {
    beforeEach(() => resetSolrSchemaCache());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        resetSolrSchemaCache();
    });

    it('normalizes nested children, optional values, and nest-path order', async () => {
        const api = await loadBiochemApi();
        const doc = { stoichiometry: [
            { doc_type: 'stoichiometry', compound: 'cpd3', coefficient: '1', compartment: '2', participant_name: 'Three', _nest_path_: '/stoichiometry#2' },
            { doc_type: 'stoichiometry', compound: 'cpd1', coefficient: ['-1.5'], compartment: 0, is_reactant: true, participant_charge: ['-2'], participant_formula: 'H2O', _nest_path_: '/stoichiometry#0' },
            { compound: 'cpd2', coefficient: 1, _nest_path_: '/stoichiometry#1' },
        ] };
        expect(api.normalizeStoichiometry(doc)).toEqual([
            { compound: 'cpd1', coefficient: -1.5, compartment: 0, name: 'cpd1', is_reactant: true, charge: -2, formula: 'H2O' },
            { compound: 'cpd2', coefficient: 1, compartment: 0, name: 'cpd2', is_reactant: false },
            { compound: 'cpd3', coefficient: 1, compartment: 2, name: 'Three', is_reactant: false },
        ]);
        expect(api.normalizeStoichiometry({ stoichiometry: [
            { compound: 'first', coefficient: 1 }, { compound: 'second', coefficient: -1 },
        ] }).map((p) => p.compound)).toEqual(['first', 'second']);
    });

    it('parses legacy strings and round-trips them', async () => {
        const api = await loadBiochemApi();
        const source = '-1.5:cpd00001:0:0:"Water, liquid";2:cpd00002:1:0:"ATP";bad:cpd:0:0:"bad"';
        const participants = api.normalizeStoichiometry({ stoichiometry: source });
        expect(participants).toEqual([
            { compound: 'cpd00001', coefficient: -1.5, compartment: 0, name: 'Water, liquid', is_reactant: true },
            { compound: 'cpd00002', coefficient: 2, compartment: 1, name: 'ATP', is_reactant: false },
        ]);
        expect(api.serializeStoichiometry(participants)).toBe('-1.5:cpd00001:0:0:"Water, liquid";2:cpd00002:1:0:"ATP"');
    });

    it('returns [] without throwing for absent, malformed, and garbage children', async () => {
        const api = await loadBiochemApi();
        for (const doc of [null, undefined, {}, 42, { stoichiometry: [] }, { stoichiometry: [null, 'bad', {}, { compound: '', coefficient: 1 }, { compound: 'ok', coefficient: 'abc' }] }]) {
            expect(() => api.normalizeStoichiometry(doc)).not.toThrow();
            expect(api.normalizeStoichiometry(doc)).toEqual([]);
        }
    });

    it('fetches nested reaction children and preserves thermodynamics and mapping fields', async () => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ reactions: true }, {
            id: 'rxn00001', has_atom_mapping: true, atom_mapping_data: ['map'],
            thermodynamics: [{ doc_type: 'thermodynamics', source_name: 'GC', energy: 4.18, error: 2.24 }],
            stoichiometry: [{ doc_type: 'stoichiometry', compound: 'cpd00001', coefficient: -1, compartment: 0, participant_name: 'H2O', _nest_path_: '/stoichiometry#0' }],
        });
        const result = await api.getReactionById('rxn00001');
        const url = dataUrl(fetchMock);
        expect(url).toContain(`fq=${encodeURIComponent('doc_type:reaction')}`);
        expect(url).toContain(encodeURIComponent('*,[child childFilter="doc_type:thermodynamics OR doc_type:stoichiometry" limit=200]'));
        expect(result.participants).toEqual([{ compound: 'cpd00001', coefficient: -1, compartment: 0, name: 'H2O', is_reactant: true }]);
        expect(result.stoichiometry).toBe('-1:cpd00001:0:0:"H2O"');
        expect(result.thermodynamics).toEqual([{ source_name: 'GC', energy: 4.18, error: 2.24 }]);
        expect(result.atom_mapping_data).toEqual(['map']);
        expect(result.has_atom_mapping).toBe(true);
    });

    it('keeps legacy URLs byte-identical and parses legacy participants', async () => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ reactions: false }, { id: 'rxn00001', stoichiometry: '-1:cpd00001:0:0:"H2O"' });
        const reaction = await api.getReactionById('rxn00001');
        expect(dataUrl(fetchMock)).toBe('https://staging.modelseed.org/solr/reactions_staging/select?wt=json&q=id:rxn00001');
        expect(reaction.stoichiometry).toBe('-1:cpd00001:0:0:"H2O"');
        expect(reaction.participants).toHaveLength(1);
        await api.getReactions({ filterModel: { items: [], quickFilterValues: ['cpd00001'] } });
        expect(dataUrl(fetchMock)).toBe(
            `https://staging.modelseed.org/solr/reactions_staging/select?wt=json&fl=name,id,definition,deltag,deltagerr,reversibility,stoichiometry,status,aliases,ec_numbers,is_obsolete,is_transport,ontology,pathways,notes&q=${encodeURIComponent('(id:*cpd00001* OR name:*cpd00001* OR status:*cpd00001* OR ec_numbers:*cpd00001* OR aliases:*cpd00001* OR pathways:*cpd00001* OR stoichiometry:*cpd00001* OR notes:*cpd00001*)')}&rows=25&sort=id asc`,
        );
        await api.findReactionsForCompound('cpd00002');
        expect(dataUrl(fetchMock)).toBe('https://staging.modelseed.org/solr/reactions_staging/select?wt=json&q=equation:*cpd00002*&fl=*&rows=25');
    });

    it('uses parent-only nested quick search, reaction joins, and compound batches', async () => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ reactions: true, compounds: true });
        await api.getReactions({ filterModel: { items: [], quickFilterValues: ['cpd00001'] } });
        expect(dataUrl(fetchMock)).toContain(`fq=${encodeURIComponent('doc_type:reaction')}`);
        expect(decodeURIComponent(dataUrl(fetchMock))).not.toContain('stoichiometry:');
        await api.findReactionsForCompound('cpd00002');
        expect(decodeURIComponent(dataUrl(fetchMock))).toContain('{!parent which="doc_type:reaction"}doc_type:stoichiometry AND compound:cpd00002');
        expect(dataUrl(fetchMock)).toContain(`fq=${encodeURIComponent('doc_type:reaction')}`);
        await api.findReactionsForCompound('cpd*');
        expect(decodeURIComponent(dataUrl(fetchMock))).toContain('q=equation:*cpd**');
        await api.getCompoundsByIds(['cpd00001']);
        expect(dataUrl(fetchMock)).toContain(`fq=${encodeURIComponent('doc_type:compound')}`);
    });

    it('leaves legacy compound batches unfiltered', async () => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ compounds: false });
        await api.getCompoundsByIds(['cpd00001']);
        expect(dataUrl(fetchMock)).not.toContain('fq=');
    });
});
