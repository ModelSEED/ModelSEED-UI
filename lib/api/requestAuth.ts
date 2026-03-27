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

export function getStoredAuthUsername(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { user_id?: string; method?: string };
        const userId = parsed?.user_id;
        if (!userId) return null;
        // PATRIC usernames need @patricbrc.org suffix for workspace paths
        if (parsed.method === 'PATRIC' && !userId.includes('@')) {
            return `${userId}@patricbrc.org`;
        }
        return userId;
    } catch {
        // Fallback: extract from token directly
        const token = getStoredAuthToken();
        if (!token) return null;
        const parts = token.split('|');
        for (const part of parts) {
            if (part.startsWith('un=')) {
                const value = part.slice(3).trim();
                return value ? `${value}@patricbrc.org` : null;
            }
        }
        return null;
    }
}
