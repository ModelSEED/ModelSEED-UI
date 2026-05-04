import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import * as biochemApi from '@/lib/api/biochem';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

describe('Biochem API Integration Tests', () => {
  let isApiAvailable = true;

  beforeAll(async () => {
    try {
      const res = await biochemApi.getReactions({ limit: 1 });
      expect(res.docs).toBeDefined();
    } catch (e: unknown) {
      console.warn('Biochem API is unavailable, skipping tests:', getErrorMessage(e));
      isApiAvailable = false;
    }
  });

  it('should perform a basic compound search', async () => {
    if (!isApiAvailable) return;

    const result = await biochemApi.getCompounds({ limit: 5 });
    expect(result).toBeDefined();
    expect(Array.isArray(result.docs)).toBe(true);
    expect(result.docs.length).toBeLessThanOrEqual(5);
  });

  it('should fetch a specific reaction by ID', async () => {
    if (!isApiAvailable) return;

    const result = await biochemApi.getReactionById('rxn00001');
    expect(result).toBeDefined();
    expect(result.id).toBe('rxn00001');
  });

  it('should fetch compounds for reaction rendering with structure fields', async () => {
    if (!isApiAvailable) return;

    const result = await biochemApi.getCompoundsForReaction(['cpd00001', 'cpd00002', 'cpd00008']);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBeGreaterThan(0);

    const atp = result.get('cpd00002');
    if (atp) {
      expect(atp.name).toBeDefined();
      expect('smiles' in atp).toBe(true);
    }
  });
});

describe('filterDocsByGridModel (shared local column filters)', () => {
  it('filters rows using MUI string operators', async () => {
    const { filterDocsByGridModel } = await import('@/lib/api/biochem');
    const docs = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
    ] as Record<string, unknown>[];
    const out = filterDocsByGridModel(docs, [
      { field: 'name', operator: 'contains', value: 'lph' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('1');
  });
});

describe('getCompounds Solr query shape', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('quick search must not reference ontology (undefined field on compounds_staging)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: { numFound: 0, start: 0, docs: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await biochemApi.getCompounds({
      limit: 25,
      offset: 0,
      filterModel: { items: [], quickFilterValues: ['cpd05323'] },
    });

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? '');
    const u = new URL(calledUrl);
    const qRaw = u.searchParams.get('q');
    expect(qRaw).toBeTruthy();
    const q = decodeURIComponent(qRaw ?? '');
    expect(q).not.toMatch(/\bontology\b/i);
    expect(q).toContain('cpd05323');
    expect(q).toMatch(/formula|aliases|name|id/);
  });
});
