import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

async function loadBiochemApi() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
  return import('@/lib/api/biochem');
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

describe('Biochem API Integration Tests', () => {
  let isApiAvailable = true;
  let biochemApi: Awaited<ReturnType<typeof loadBiochemApi>>;

  beforeAll(async () => {
    biochemApi = await loadBiochemApi();
    // Race the live probe against an internal timeout so the catch path runs
    // (marking isApiAvailable = false) before the vitest hookTimeout aborts the
    // hook itself. Otherwise CI fails on slow networks even though the suite is
    // designed to skip gracefully when the API is unreachable.
    try {
      const res = await Promise.race([
        biochemApi.getReactions({ limit: 1 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Biochem API probe timed out after 7s')), 7000),
        ),
      ]);
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
    const biochemApi = await loadBiochemApi();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: { numFound: 0, start: 0, docs: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await biochemApi.getCompounds({
      limit: 25,
      offset: 0,
      filterModel: { items: [], quickFilterValues: ['cpd05323'] },
    });

    expect(fetchMock).toHaveBeenCalled();
    // The Solr-9 nested-schema probe (a separate `select?...&fq=doc_type:...` request)
    // runs before the real list query, so assert on the *last* fetch call.
    const calledUrl = String(fetchMock.mock.calls.at(-1)?.[0] ?? '');
    const u = new URL(calledUrl);
    const qRaw = u.searchParams.get('q');
    expect(qRaw).toBeTruthy();
    const q = decodeURIComponent(qRaw ?? '');
    expect(q).not.toMatch(/\bontology\b/i);
    expect(q).toContain('cpd05323');
    expect(q).toMatch(/formula|aliases|name|id/);
  });
});

describe('getReactions Solr case-variant filters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expands lowercase equals filters with case variants', async () => {
    const biochemApi = await loadBiochemApi();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: { numFound: 0, start: 0, docs: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await biochemApi.getReactions({
      limit: 25,
      offset: 0,
      filterModel: {
        items: [{ field: 'status', operator: 'equals', value: 'ok' }],
        logicOperator: 'and',
        quickFilterValues: [],
      },
    });

    expect(fetchMock).toHaveBeenCalled();
    // The Solr-9 nested-schema probe runs before the real list query.
    const calledUrl = String(fetchMock.mock.calls.at(-1)?.[0] ?? '');
    const q = decodeURIComponent(new URL(calledUrl).searchParams.get('q') ?? '');
    expect(q).toContain('status:"ok"');
    expect(q).toContain('status:"OK"');
  });
});

describe('Solr collection routing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses production collections when NEXT_PUBLIC_DEPLOYMENT_MODE=production', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'production');
    vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION', 'reactions');
    vi.stubEnv('NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION', 'compounds');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: { numFound: 0, start: 0, docs: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const api = await import('@/lib/api/biochem');
    await api.getReactions({ limit: 1 });

    // The Solr-9 nested-schema probe runs before the real list query.
    const calledUrl = String(fetchMock.mock.calls.at(-1)?.[0] ?? '');
    expect(calledUrl).toContain('/reactions/select');
    expect(calledUrl).not.toContain('/reactions_staging/select');
  });

  it('uses explicit Solr collection overrides when provided', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'production');
    vi.stubEnv('NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION', 'reactions_custom');
    vi.stubEnv('NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION', 'compounds');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: { numFound: 0, start: 0, docs: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const api = await import('@/lib/api/biochem');
    await api.getReactions({ limit: 1 });

    // The Solr-9 nested-schema probe runs before the real list query.
    const calledUrl = String(fetchMock.mock.calls.at(-1)?.[0] ?? '');
    expect(calledUrl).toContain('/reactions_custom/select');
  });
});

describe('getReactions/getCompounds nested-schema parent-doc filter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('adds no fq when the nested-schema probe finds no parent docs (legacy schema)', async () => {
    const biochemApi = await loadBiochemApi();
    const { resetSolrSchemaCache } = await import('@/lib/api/solrSchema');
    resetSolrSchemaCache();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: { numFound: 0, start: 0, docs: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await biochemApi.getReactions({ limit: 5 });

    // One probe call plus the real list query.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const listUrl = String(fetchMock.mock.calls.at(-1)?.[0] ?? '');
    expect(listUrl).not.toContain('fq=');
  });

  it('adds a doc_type:reaction fq when the nested-schema probe finds parent docs', async () => {
    const biochemApi = await loadBiochemApi();
    const { resetSolrSchemaCache } = await import('@/lib/api/solrSchema');
    resetSolrSchemaCache();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: { numFound: 1, start: 0, docs: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await biochemApi.getReactions({ limit: 5 });

    const listUrl = String(fetchMock.mock.calls.at(-1)?.[0] ?? '');
    expect(listUrl).toContain(`fq=${encodeURIComponent('doc_type:reaction')}`);
  });

  it('adds a doc_type:compound fq when the nested-schema probe finds parent docs', async () => {
    const biochemApi = await loadBiochemApi();
    const { resetSolrSchemaCache } = await import('@/lib/api/solrSchema');
    resetSolrSchemaCache();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: { numFound: 1, start: 0, docs: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await biochemApi.getCompounds({ limit: 5 });

    const listUrl = String(fetchMock.mock.calls.at(-1)?.[0] ?? '');
    expect(listUrl).toContain(`fq=${encodeURIComponent('doc_type:compound')}`);
  });
});
