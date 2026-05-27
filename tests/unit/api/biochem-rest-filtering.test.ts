import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('biochem REST path local filter/sort/pagination', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8000';
  });

  it('applies DataGrid filter operators in REST mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'rxn00001', name: 'ATP reaction', status: 'OK' },
        { id: 'rxn00002', name: 'NAD reaction', status: 'DRAFT' },
        { id: 'rxn01000', name: 'ATP synthase', status: 'OK' },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const biochem = await import('@/lib/api/biochem');
    const res = await biochem.getReactionsFromModelseedApi({
      limit: 25,
      filterModel: {
        items: [{ field: 'status', operator: 'equals', value: 'OK' }],
        logicOperator: 'and',
        quickFilterValues: [],
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.docs.map((d) => d.id)).toEqual(['rxn00001', 'rxn01000']);
    expect(res.numFound).toBe(2);
  });

  it('applies sort and pagination after REST fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'rxn00003', name: 'C', status: 'OK' },
        { id: 'rxn00001', name: 'A', status: 'OK' },
        { id: 'rxn00002', name: 'B', status: 'OK' },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const biochem = await import('@/lib/api/biochem');
    const res = await biochem.getReactionsFromModelseedApi({
      limit: 1,
      offset: 1,
      sort: { field: 'id', desc: false },
      filterModel: { items: [], quickFilterValues: [] },
    });

    expect(res.numFound).toBe(3);
    expect(res.start).toBe(1);
    expect(res.docs).toHaveLength(1);
    expect(res.docs[0]?.id).toBe('rxn00002');
  });

  it('requests widened biochem batches when refining quick-search client-side', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'cpd05323', name: 'Glucoiberin', formula: '', aliases: [] },
        { id: 'cpd09999', name: 'noise', formula: '', aliases: [] },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const biochem = await import('@/lib/api/biochem');
    await biochem.getCompoundsFromModelseedApi({
      limit: 25,
      offset: 0,
      filterModel: {
        items: [],
        logicOperator: 'and',
        quickFilterValues: ['glucoiberin'],
        quickFilterLogicOperator: 'and',
      },
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain('limit=5000');

    fetchMock.mockClear();
    await biochem.getCompoundsFromModelseedApi({
      limit: 25,
      offset: 25,
      sort: undefined,
      filterModel: {
        items: [],
        logicOperator: 'and',
        quickFilterValues: ['cpd'],
        quickFilterLogicOperator: 'and',
      },
    });
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain('limit=5000');
  });

  it('ignores ontology column filters on compound REST payloads (Solr has no ontology field)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'cpd00001', name: 'ATP', formula: '', aliases: [] }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const biochem = await import('@/lib/api/biochem');
    const res = await biochem.getCompoundsFromModelseedApi({
      limit: 10,
      filterModel: {
        items: [{ field: 'ontology', operator: 'contains', value: 'nope-miss' }],
        quickFilterValues: [],
      },
    });
    expect(res.docs).toHaveLength(1);
  });

  it('refines quick search across compound fields locally (OR across searchFields)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'cpd11111', name: 'zzz', formula: '', aliases: [] },
        { id: 'cpd05323', name: 'Glucoiberin', formula: '', aliases: [] },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const biochem = await import('@/lib/api/biochem');
    const res = await biochem.getCompoundsFromModelseedApi({
      limit: 10,
      filterModel: {
        items: [],
        quickFilterValues: ['glucoiberin'],
      },
    });
    expect(res.docs.map((d) => d.id)).toEqual(['cpd05323']);
    expect(res.numFound).toBe(1);
  });
});
