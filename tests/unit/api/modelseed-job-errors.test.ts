import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function setAuthToken(): void {
    localStorage.setItem('auth', JSON.stringify({
        user_id: 'testuser',
        method: 'PATRIC',
        token: 'test-token',
    }));
}

describe('modelseed-api job-submit error parsing (path 1)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.resetModules();
        vi.stubEnv('NEXT_PUBLIC_USE_MODELSEED_API', 'true');
        vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:8000');
        localStorage.clear();
        setAuthToken();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('throws ModelseedApiError with structured detail on FastAPI 404', async () => {
        const errorBody = {
            detail: {
                code: 'GENOME_NOT_FOUND',
                message: "Genome '9999999.9' could not be fetched from BV-BRC.",
                hint: "Check the genome ID is correct (BV-BRC format, e.g. '83332.12').",
                field: 'genome',
                retryable: false,
            },
        };
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(errorBody), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const api = await import('@/lib/api/modelseed');
        await expect(
            api.submitReconstructJobFromApi({ genome: '9999999.9', template_type: 'gn' }),
        ).rejects.toBeInstanceOf(api.ModelseedApiError);

        // Re-issue to capture the error instance and inspect its detail.
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            new Response(JSON.stringify(errorBody), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        try {
            await api.submitReconstructJobFromApi({ genome: '9999999.9' });
            throw new Error('expected throw');
        } catch (err) {
            const e = err as InstanceType<typeof api.ModelseedApiError>;
            expect(e.status).toBe(404);
            expect(e.detail?.code).toBe('GENOME_NOT_FOUND');
            expect(e.detail?.field).toBe('genome');
            expect(e.detail?.retryable).toBe(false);
            // Message should embed the human description for legacy callers.
            expect(e.message).toContain('Genome');
            expect(e.message).toContain('(404)');
        }
    });

    it('falls back gracefully when 4xx body has no structured detail', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ detail: 'plain string error' }), {
                status: 422,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const api = await import('@/lib/api/modelseed');
        try {
            await api.submitGapfillJobFromApi({ model: '/x', media: 'Complete', template_type: 'gn' });
            throw new Error('expected throw');
        } catch (err) {
            const e = err as InstanceType<typeof api.ModelseedApiError>;
            expect(e.status).toBe(422);
            expect(e.detail).toBeUndefined();
            expect(e.message).toContain('plain string error');
        }
    });

    it('preserves status when body is empty (e.g. 5xx with no body)', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('', { status: 502 }),
        );

        const api = await import('@/lib/api/modelseed');
        try {
            await api.submitFbaJobFromApi({ model: '/x', media: 'Complete' });
            throw new Error('expected throw');
        } catch (err) {
            const e = err as InstanceType<typeof api.ModelseedApiError>;
            expect(e.status).toBe(502);
            expect(e.detail).toBeUndefined();
        }
    });

    it('exposes TOKEN_EXPIRED via detail.code on a 401', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    detail: {
                        code: 'TOKEN_EXPIRED',
                        message: 'Your PATRIC token has expired.',
                        hint: 'Sign in again to continue.',
                        field: null,
                        retryable: false,
                    },
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } },
            ),
        );

        const api = await import('@/lib/api/modelseed');
        try {
            await api.submitMergeJobFromApi({ models: [], output_file: 'x', output_path: '/x' });
            throw new Error('expected throw');
        } catch (err) {
            const e = err as InstanceType<typeof api.ModelseedApiError>;
            expect(e.status).toBe(401);
            expect(e.detail?.code).toBe('TOKEN_EXPIRED');
        }
    });
});
