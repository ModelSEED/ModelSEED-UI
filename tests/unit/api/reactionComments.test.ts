import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('reaction comments API client', () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    beforeEach(() => {
        vi.clearAllMocks();
        const store: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => { store[key] = value; },
            removeItem: (key: string) => { delete store[key]; },
        });
    });

    it('posts reaction comment to the Next.js proxy with auth header when token exists', async () => {
        localStorage.setItem('auth', JSON.stringify({
            user_id: 'alice@patricbrc.org',
            token: 'test-token',
            method: 'PATRIC',
        }));

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ msg: 'ok' })),
        });

        const { submitReactionComment } = await import('@/lib/api/reactionComments');
        const response = await submitReactionComment({
            reactionId: 'rxn00001',
            isAlias: true,
            wrongStoichiometry: false,
            remarks: 'Alias is wrong',
            email: 'alice@example.org',
        });

        expect(response.message).toBe('ok');
        expect(mockFetch).toHaveBeenCalledWith(
            '/api/biochem/comments',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'X-ModelSEED-Auth': 'test-token',
                }),
            }),
        );
        const body = JSON.parse(String(mockFetch.mock.calls[0]?.[1]?.body ?? '{}')) as Record<string, unknown>;
        expect(body.reactionId).toBe('rxn00001');
        expect(body.username).toBe('alice@patricbrc.org');
        expect(body.isAlias).toBe(true);
    });

    it('throws a helpful error when the proxy returns a failure', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: () => Promise.resolve(JSON.stringify({ message: 'bad payload' })),
        });

        const { submitReactionComment } = await import('@/lib/api/reactionComments');
        await expect(
            submitReactionComment({
                reactionId: 'rxn00001',
                isAlias: false,
                wrongStoichiometry: false,
                remarks: '',
                email: '',
            }),
        ).rejects.toThrow('Failed to submit comment: bad payload');
    });
});
