import { beforeEach, describe, expect, it, vi } from 'vitest';

function setAuthToken(): void {
    localStorage.setItem('auth', JSON.stringify({
        user_id: 'testuser',
        method: 'PATRIC',
        token: 'test-token',
    }));
}

describe('modelseed API client wrappers', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.resetModules();
        process.env.NEXT_PUBLIC_USE_MODELSEED_API = 'true';
        process.env.NEXT_PUBLIC_MODELSEED_API_URL = 'http://localhost:8000';
        localStorage.clear();
        setAuthToken();
    });

    it('calls fba detail endpoint with ref and fba_id', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ objectiveValue: 0.93, FBAReactionVariables: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const api = await import('@/lib/api/modelseed');
        await api.getModelFbaDataFromApi('/jplfaria@patricbrc.org/modelseed/511145.12', 'fba.0');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
        expect(url).toBe(
            'http://localhost:8000/api/models/fba/data?ref=%2Fjplfaria%40patricbrc.org%2Fmodelseed%2F511145.12&fba_id=fba.0',
        );
    });

    it('decodes already-encoded params before building query string', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ objectiveValue: 0.93, FBAReactionVariables: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const api = await import('@/lib/api/modelseed');
        await api.getModelFbaDataFromApi('%2Fjplfaria%40patricbrc.org%2Fmodelseed%2F511145.12', 'fba%2E0');

        const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
        expect(url).toBe(
            'http://localhost:8000/api/models/fba/data?ref=%2Fjplfaria%40patricbrc.org%2Fmodelseed%2F511145.12&fba_id=fba.0',
        );
    });

    it('returns null when fba detail endpoint responds with 404', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ detail: 'not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const api = await import('@/lib/api/modelseed');
        await expect(
            api.getModelFbaDataFromApi('/jplfaria@patricbrc.org/modelseed/511145.12', 'fba.404'),
        ).resolves.toBeNull();
    });
});
