// lib/api/requestAuth.ts
/**
 * Shared authentication utilities for attaching tokens to HTTP requests.
 * 
 * Provides helpers to retrieve stored auth tokens and inject them into
 * request headers for authenticated API calls.
 */

import { AUTH_STORAGE_KEY } from './auth';

/**
 * Retrieve the stored authentication token from localStorage.
 * 
 * Internal helper used by withRawTokenAuth(). Returns null in SSR context
 * or if no auth token is stored.
 * 
 * @returns Auth token string, or null if not available
 * @internal
 */
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

/**
 * Add authentication token to request headers.
 * 
 * Retrieves the stored auth token and adds it to the provided headers object
 * as an "Authorization" header. The backend expects the raw PATRIC/RAST token
 * string (not "Bearer" prefixed).
 * 
 * @param headers - Existing headers object (default: empty object)
 * @param requireToken - If true, throws error when no token is available (default: false)
 * @returns Headers object with Authorization header added if token exists
 * @throws {Error} When requireToken is true and no token is available
 * 
 * @example
 * ```typescript
 * const headers = withRawTokenAuth({ 'Content-Type': 'application/json' }, true);
 * const response = await fetch(url, { headers });
 * ```
 */
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

/**
 * Retrieve the stored username from authentication data.
 * 
 * Extracts user_id from stored auth and ensures PATRIC usernames include
 * the @patricbrc.org suffix required for workspace paths. Returns null
 * in SSR context or if no auth is stored.
 * 
 * @returns Username string with @patricbrc.org suffix for PATRIC auth, or null
 * 
 * @example
 * ```typescript
 * const username = getStoredAuthUsername();
 * if (username) {
 *   const userWorkspacePath = `/${username}/models`;
 * }
 * ```
 */
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
        // Fallback: extract username from token directly if JSON parse fails
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

/**
 * Retrieve the stored authentication method (PATRIC or RAST).
 * 
 * Returns which authentication service was used for the current session.
 * Useful for displaying auth status or routing to appropriate endpoints.
 * 
 * @returns 'PATRIC' or 'RAST' if authenticated, null otherwise
 * 
 * @example
 * ```typescript
 * const method = getStoredAuthMethod();
 * console.log(`Authenticated via ${method}`);
 * ```
 */
export function getStoredAuthMethod(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { method?: string };
        return parsed?.method ?? null;
    } catch {
        return null;
    }
}
