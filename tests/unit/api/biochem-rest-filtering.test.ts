import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('biochem REST path local filter/sort/pagination', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_MODELSEED_API_URL = 'http://localhost:8000';
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
});
