import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * getStoredAuthUsername resolves the workspace OWNER used to build output/
 * workspace paths. It must return the token's un= value VERBATIM — never
 * stripping the realm (`@bvbrc`) or re-suffixing with `@patricbrc.org`.
 */
describe('getStoredAuthUsername — workspace owner (verbatim un=)', () => {
    beforeEach(() => {
        vi.resetModules();
        const store: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store[k] ?? null,
            setItem: (k: string, v: string) => { store[k] = v; },
            removeItem: (k: string) => { delete store[k]; },
        });
    });

    async function setAuthAndRead(auth: Record<string, unknown>) {
        localStorage.setItem('auth', JSON.stringify(auth));
        const { getStoredAuthUsername } = await import('@/lib/api/requestAuth');
        return getStoredAuthUsername();
    }

    it('returns the @bvbrc owner verbatim from the token un=', async () => {
        expect(
            await setAuthAndRead({
                user_id: 'compchemist726@bvbrc',
                token: 'tok|un=compchemist726@bvbrc|expiry=1',
                method: 'PATRIC',
            }),
        ).toBe('compchemist726@bvbrc');
    });

    it('returns an @patricbrc.org owner verbatim', async () => {
        expect(
            await setAuthAndRead({
                user_id: 'alice@patricbrc.org',
                token: 'tok|un=alice@patricbrc.org|expiry=1',
                method: 'PATRIC',
            }),
        ).toBe('alice@patricbrc.org');
    });

    it('does not append a realm to a bare un=', async () => {
        expect(
            await setAuthAndRead({
                user_id: 'bob',
                token: 'tok|un=bob|expiry=1',
                method: 'PATRIC',
            }),
        ).toBe('bob');
    });

    it('falls back to the stored user_id verbatim when the token has no un=', async () => {
        expect(
            await setAuthAndRead({
                user_id: 'carol@bvbrc',
                token: 'opaque-token-without-un',
                method: 'PATRIC',
            }),
        ).toBe('carol@bvbrc');
    });

    it('returns null when nothing is stored', async () => {
        const { getStoredAuthUsername } = await import('@/lib/api/requestAuth');
        expect(getStoredAuthUsername()).toBeNull();
    });
});
