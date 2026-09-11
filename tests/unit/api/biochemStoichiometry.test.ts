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
        expect(api.normalizeStoichiometry({ stoichiometry: [
            { doc_type: ['stoichiometry'], compound: ['cpd05331'], coefficient: ['-1'], compartment: ['0'], participant_name: ['Glucoraphanin'] },
            { doc_type: ['stoichiometry'], compound: ['cpd00001'], coefficient: ['1'], participant_name: ['', 'Water'] },
            { doc_type: ['stoichiometry'], compound: ['cpd00002'], coefficient: ['1'], participant_name: [] },
            { doc_type: ['not-stoichiometry'], compound: ['excluded'], coefficient: ['1'] },
        ] })).toEqual([
            { compound: 'cpd05331', coefficient: -1, compartment: 0, name: 'Glucoraphanin', is_reactant: true },
            { compound: 'cpd00001', coefficient: 1, compartment: 0, name: 'Water', is_reactant: false },
            { compound: 'cpd00002', coefficient: 1, compartment: 0, name: 'cpd00002', is_reactant: false },
        ]);
    });

    it('preserves nested participant aliases from scalar and array fields while legacy data remains valid', async () => {
        const api = await loadBiochemApi();
        expect(api.normalizeStoichiometry({ stoichiometry: [
            { compound: 'cpd1', coefficient: -1, participant_name: 'One', participant_aliases: 'Name: First;Database: A1' },
            { compound: 'cpd2', coefficient: 1, participant_name: 'Two', participant_aliases: ['Name: Second', ['Database: B2;B3|Registry: C4']] },
        ] })).toEqual([
            { compound: 'cpd1', coefficient: -1, compartment: 0, name: 'One', is_reactant: true, aliases: ['Name: First', 'Database: A1'] },
            { compound: 'cpd2', coefficient: 1, compartment: 0, name: 'Two', is_reactant: false, aliases: ['Name: Second', 'Database: B2', 'B3', 'Registry: C4'] },
        ]);
        expect(api.normalizeStoichiometry({ stoichiometry: '-1:cpd1:0:0:"One"' })[0].aliases).toBeUndefined();
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
        expect(url).toContain(encodeURIComponent('*,[child childFilter="doc_type:thermodynamics OR doc_type:thermo_evidence OR doc_type:stoichiometry OR doc_type:thermo-evidence" limit=200]'));
        expect(result.participants).toEqual([{ compound: 'cpd00001', coefficient: -1, compartment: 0, name: 'H2O', is_reactant: true }]);
        expect(result.stoichiometry).toBe('-1:cpd00001:0:0:"H2O"');
        expect(result.thermodynamics).toEqual([{ source_name: 'GC', energy: 4.18, error: 2.24 }]);
        expect(result.atom_mapping_data).toEqual(['map']);
        expect(result.has_atom_mapping).toBe(true);
    });

    it('projects and normalizes production nested children for Equation rendering', async () => {
        const nestedApi = await loadBiochemApi();
        const nestedFetch = mockFetch({ reactions: true }, {
            id: 'rxn27060', definition: 'Glucoraphanin + H2O <=> Glucose',
            stoichiometry: [{
                id: 'rxn27060_stoichiometry_0', doc_type: ['stoichiometry'],
                compound: ['cpd05331'], coefficient: ['-1'], compartment: ['0'],
                participant_name: ['Glucoraphanin'], participant_aliases: ['Name: Glucosinolate;GRA'],
                _nest_path_: ['/stoichiometry#0'],
            }],
        });
        const nested = await nestedApi.getReactions();
        const nestedUrl = new URL(dataUrl(nestedFetch));
        expect(nestedUrl.searchParams.get('fl')).toBe([
            'name', 'id', 'definition', 'deltag', 'deltagerr', 'reversibility',
            'stoichiometry', 'status', 'aliases', 'ec_numbers', 'is_obsolete',
            'is_transport', 'ontology', 'pathways', 'notes',
            'compound', 'coefficient', 'compartment', 'is_reactant', 'participant_name',
            'participant_aliases', 'aliases', 'doc_type', '_nest_path_',
            '[child childFilter=doc_type:stoichiometry limit=200]',
        ].join(','));
        expect(nested.docs[0].participants).toEqual([{
            compound: 'cpd05331', coefficient: -1, compartment: 0, name: 'Glucoraphanin',
            aliases: ['Name: Glucosinolate', 'GRA'], is_reactant: true,
        }]);

        resetSolrSchemaCache();
        const legacyApi = await loadBiochemApi();
        mockFetch({ reactions: false }, { id: 'rxn00002', stoichiometry: '-1:cpd05331:0:0:"Glucoraphanin"' });
        const legacy = await legacyApi.getReactions();
        expect(legacy.docs[0].participants).toEqual([{ compound: 'cpd05331', coefficient: -1, compartment: 0, name: 'Glucoraphanin', is_reactant: true }]);
    });

    it('keeps legacy URLs byte-identical and parses legacy participants', async () => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ reactions: false }, { id: 'rxn00001', stoichiometry: '-1:cpd00001:0:0:"H2O"' });
        const reaction = await api.getReactionById('rxn00001');
        expect(dataUrl(fetchMock)).toBe('https://modelseed.org/solr/reactions_staging/select?wt=json&q=id:rxn00001');
        expect(reaction.stoichiometry).toBe('-1:cpd00001:0:0:"H2O"');
        expect(reaction.participants).toHaveLength(1);
        await api.getReactions({ filterModel: { items: [], quickFilterValues: ['cpd05331'] } });
        const legacyListUrl = new URL(dataUrl(fetchMock));
        expect(legacyListUrl.searchParams.get('fl')).toBe('name,id,definition,deltag,deltagerr,reversibility,stoichiometry,status,aliases,ec_numbers,is_obsolete,is_transport,ontology,pathways,notes');
        expect(legacyListUrl.searchParams.get('q')).toBe('(id:*cpd05331* OR name:*cpd05331* OR definition:*cpd05331* OR status:*cpd05331* OR ec_numbers:*cpd05331* OR aliases:*cpd05331* OR pathways:*cpd05331* OR stoichiometry:*cpd05331* OR notes:*cpd05331*)');
        expect(legacyListUrl.searchParams.get('sort')).toBe('id asc');
        await api.getReactions({ filterModel: { items: [], quickFilterValues: ['Glucoraphanin'] } });
        expect(new URL(dataUrl(fetchMock)).searchParams.get('q')).toContain('definition:*Glucoraphanin*');
        await api.findReactionsForCompound('cpd00002');
        expect(new URL(dataUrl(fetchMock)).searchParams.get('q')).toBe('equation:*cpd00002*');
    });

    it('uses parent-scoped nested Equation quick search, reaction joins, and compound batches', async () => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ reactions: true, compounds: true });
        await api.getReactions({
            filterModel: {
                items: [],
                quickFilterValues: ['Glucoraphanin', 'cpd05331'],
                quickFilterLogicOperator: 'and',
            },
        });
        const nestedUrl = new URL(dataUrl(fetchMock));
        const nestedQuery = nestedUrl.searchParams.get('q') ?? '';
        expect(nestedUrl.searchParams.getAll('fq')).toContain('doc_type:reaction');
        expect(nestedQuery).toContain('id:*Glucoraphanin*');
        expect(nestedQuery).toContain('name:*Glucoraphanin*');
        expect(nestedQuery).toContain('definition:*Glucoraphanin*');
        expect(nestedQuery).not.toContain('stoichiometry:*');
        expect(nestedQuery).toContain('({!parent which="doc_type:reaction" v="doc_type:stoichiometry AND (compound:*Glucoraphanin* OR participant_name:*Glucoraphanin*)"})');
        expect(nestedQuery).toContain('({!parent which="doc_type:reaction" v="doc_type:stoichiometry AND (compound:*cpd05331* OR participant_name:*cpd05331*)"})');
        expect(nestedQuery).toContain(') AND (');
        await api.findReactionsForCompound('cpd00002');
        expect(new URL(dataUrl(fetchMock)).searchParams.get('q')).toContain('{!parent which="doc_type:reaction" v="doc_type:stoichiometry AND compound:cpd00002"}');
        expect(dataUrl(fetchMock)).toContain(`fq=${encodeURIComponent('doc_type:reaction')}`);
        await api.findReactionsForCompound('cpd*');
        expect(new URL(dataUrl(fetchMock)).searchParams.get('q')).toContain('compound:*cpd\\**');
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


describe('reaction request regression matrix', () => {
    beforeEach(() => resetSolrSchemaCache());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        resetSolrSchemaCache();
    });

    // Matrix: legacy/nested quick terms, Equation child joins, escaped input, filters, paging and URL fields.
    it.each([
        { nested: false, terms: ['rxn', 'ATP'], logic: 'and' as const, expected: 'stoichiometry:*ATP*', absent: 'doc_type:reaction' },
        { nested: true, terms: ['rxn', 'ATP'], logic: 'or' as const, expected: 'participant_name:*ATP*', absent: 'stoichiometry:*' },
        { nested: false, terms: ['A+B / C'], logic: 'and' as const, expected: 'definition:*A\\+B*\\/*C*', absent: 'doc_type:reaction' },
        { nested: true, terms: ['ab'], logic: 'and' as const, expected: 'definition:ab*', absent: 'stoichiometry:*' },
    ])('builds safe $nested-schema quick search for $terms', async ({ nested, terms, logic, expected, absent }) => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ reactions: nested });
        await api.getReactions({
            limit: 7,
            offset: 3,
            sort: { field: 'name', desc: true },
            filterModel: { items: [], quickFilterValues: terms, quickFilterLogicOperator: logic },
        });
        const url = new URL(dataUrl(fetchMock));
        const q = url.searchParams.get('q') ?? '';
        expect(q).toContain(expected);
        expect(q).not.toContain(absent);
        expect(url.searchParams.get('rows')).toBe('7');
        expect(url.searchParams.get('start')).toBe('3');
        expect(url.searchParams.get('sort')).toBe('name desc');
        expect(url.searchParams.get('fl')).toContain('definition');
        expect(url.searchParams.getAll('fq')).toEqual(nested ? ['doc_type:reaction'] : []);
    });

    it('keeps blank and intentional wildcard direct queries broad without exposing raw syntax', async () => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ reactions: false });
        await api.getReactions({ query: '*' });
        expect(new URL(dataUrl(fetchMock)).searchParams.get('q')).toBe('*');
        await api.getReactions({ filterModel: { items: [], quickFilterValues: ['   '] } });
        expect(new URL(dataUrl(fetchMock)).searchParams.get('q')).toBe('*');
    });

    it('combines Equation aliases, filters, query columns, direct query and encoded URL values', async () => {
        const api = await loadBiochemApi();
        const fetchMock = mockFetch({ reactions: false });
        await api.getReactions({
            query: 'Equation',
            queryColumn: { synonyms: 'alpha beta' },
            filterModel: {
                items: [
                    { field: 'definition', operator: 'contains', value: 'cpd00002' },
                    { field: 'status', operator: 'startsWith', value: 'ok' },
                    { field: 'name', operator: 'endsWith', value: 'ase' },
                    { field: 'is_transport', operator: 'equals', value: true },
                    { field: 'deltag', operator: '>=', value: -4 },
                ],
                logicOperator: 'or',
            },
        });
        const url = new URL(dataUrl(fetchMock));
        const q = url.searchParams.get('q') ?? '';
        expect(q).toContain('definition:*Equation*');
        expect(q).toContain('definition:*cpd00002*');
        expect(q).toContain('status:ok*');
        expect(q).toContain('name:*ase');
        expect(q).toContain('is_transport:true OR deltag:[-4 TO *]');
        expect(q).toContain('aliases:*alpha*beta*');
    });

    it('escapes and encodes compound lookups in both schemas', async () => {
        const legacy = await loadBiochemApi();
        const legacyFetch = mockFetch({ reactions: false });
        await legacy.findReactionsForCompound('cpd* OR id:rxn', { limit: 2, offset: 1, sort: { field: 'name' } });
        const legacyUrl = new URL(dataUrl(legacyFetch));
        expect(legacyUrl.searchParams.get('q')).toBe('equation:*cpd\\**OR*id\\:rxn*');
        expect(legacyUrl.searchParams.get('fl')).toBe('*');
        expect(legacyUrl.searchParams.get('sort')).toBe('name asc');

        resetSolrSchemaCache();
        const nested = await loadBiochemApi();
        const nestedFetch = mockFetch({ reactions: true });
        await nested.findReactionsForCompound('cpd00002');
        const nestedUrl = new URL(dataUrl(nestedFetch));
        expect(nestedUrl.searchParams.get('q')).toBe('{!parent which="doc_type:reaction" v="doc_type:stoichiometry AND compound:cpd00002"}');
        expect(nestedUrl.searchParams.getAll('fq')).toEqual(['doc_type:reaction']);
    });

    it('normalizes malformed successful Solr responses without masking HTTP failures', async () => {
        const api = await loadBiochemApi();
        vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => Promise.resolve(
            new Response(JSON.stringify(String(input).includes('rows=0') ? { response: { numFound: 0, docs: [] } } : { response: {} }), { status: 200 }),
        ));
        await expect(api.getReactions()).resolves.toMatchObject({ numFound: 0, start: 0, docs: [] });
    });

    it('preserves HTTP failures while normalizing only successful malformed bodies', async () => {
        const api = await loadBiochemApi();
        vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => Promise.resolve(
            new Response('unavailable', { status: String(input).includes('rows=0') ? 200 : 503 }),
        ));
        await expect(api.getReactions()).rejects.toThrow('Solr request failed: 503');
    });
});
