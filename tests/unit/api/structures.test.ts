import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadStructuresApi() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
  return import('@/lib/api/structures');
}

function solrResponse(docs: unknown, status = 200): Response {
  return new Response(JSON.stringify(docs), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('getStructuresByIds', () => {
  it('does not fetch for empty or blank ids', async () => {
    const api = await loadStructuresApi();
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(api.getStructuresByIds([])).resolves.toEqual(new Map());
    await expect(api.getStructuresByIds(['', '  '])).resolves.toEqual(new Map());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('trims and de-duplicates ids in its Solr query', async () => {
    const api = await loadStructuresApi();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      solrResponse({ response: { docs: [] } }),
    );

    await api.getStructuresByIds([' cpd00001 ', 'cpd00001', 'cpd00002']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('q=(id:cpd00001 OR id:cpd00002)');
    expect(url).toContain('rows=2');
    expect(url).toContain('fl=id,smiles,inchi,inchikey,svg');
  });

  it.each([
    ['HTTP 404', () => Promise.resolve(solrResponse({}, 404))],
    ['a rejected fetch', () => Promise.reject(new Error('network failure'))],
    ['a non-JSON body', () => Promise.resolve(new Response('not json', { status: 200 }))],
    ['an empty JSON body', () => Promise.resolve(solrResponse({}))],
  ])('returns an empty map for %s', async (_case, response) => {
    const api = await loadStructuresApi();
    vi.spyOn(globalThis, 'fetch').mockImplementation(response);

    await expect(api.getStructuresByIds(['cpd00001'])).resolves.toEqual(new Map());
  });

  it('preserves raw InChI separately and validates optional string fields', async () => {
    const api = await loadStructuresApi();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(solrResponse({
      response: {
        docs: [
          { id: 'cpd00001', inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N' },
          { id: 'cpd00002', inchi: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N', svg: 'not markup' },
          {
            id: 'cpd00003',
            smiles: ' O ',
            inchi: ' InChI=1S/H2O/h1H2 ',
            inchikey: ' XLYOFNOQVPJJNP-UHFFFAOYSA-N ',
            svg: " <?xml version='1.0'?><svg viewBox='0 0 1 1'></svg> ",
          },
          { id: 'unrequested', inchi: 'InChI=1S/H2O/h1H2' },
        ],
      },
    }));

    const structures = await api.getStructuresByIds(['cpd00001', 'cpd00002', 'cpd00003']);

    expect(structures.get('cpd00001')).toEqual({
      id: 'cpd00001',
      inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N',
    });
    expect(structures.get('cpd00002')).toEqual({ id: 'cpd00002' });
    expect(structures.get('cpd00003')).toEqual({
      id: 'cpd00003',
      smiles: 'O',
      inchi: 'InChI=1S/H2O/h1H2',
      inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N',
      svg: "<?xml version='1.0'?><svg viewBox='0 0 1 1'></svg>",
    });
    expect(structures.has('unrequested')).toBe(false);
  });

  it('chunks 250 ids into three requests and merges results', async () => {
    const api = await loadStructuresApi();
    const ids = Array.from({ length: 250 }, (_, index) => `cpd${index}`);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const query = new URL(String(url)).searchParams.get('q') ?? '';
      const id = query.match(/id:(cpd\d+)/)?.[1];
      return Promise.resolve(solrResponse({ response: { docs: id ? [{ id, inchi: 'InChI=1S/H2O/h1H2' }] : [] } }));
    });

    const structures = await api.getStructuresByIds(ids);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(structures.size).toBe(3);
    expect(structures.get('cpd0')?.inchi).toBe('InChI=1S/H2O/h1H2');
  });
});
