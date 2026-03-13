import { AUTH_STORAGE_KEY } from './auth';

export function getStoredAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { token?: string };
        return parsed?.token ?? null;
    } catch {
        return null;
    }
}

export function withRawTokenAuth(
    headers: Record<string, string> = {},
    requireToken = false,
): Record<string, string> {
    const token = getStoredAuthToken();
    if (requireToken && !token) {
        throw new Error('No auth token available');
    }
    if (!token) return headers;
    return {
        ...headers,
        // Backend currently expects the raw PATRIC/RAST token string.
        Authorization: token,
    };
}
