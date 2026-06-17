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
 * Retrieve the authenticated workspace owner, VERBATIM.
 *
 * The owner is read from the token's `un=` field — PATRIC/BV-BRC encode the
 * fully-qualified owner there (e.g. `user@patricbrc.org`, `user@bvbrc`). It is
 * returned exactly as stored: never stripped, split on `@`, or re-suffixed with
 * a realm. This value is what workspace/output paths must use, so that users
 * with `@bvbrc` / `@patricbrc.org` suffixes resolve to the right workspace
 * (`/user@bvbrc/...`) instead of being rejected for "Insufficient permissions".
 *
 * Falls back to the stored `user_id` (itself derived from `un=` at login) if the
 * token is unavailable. Returns null in SSR context or when no auth is stored.
 *
 * @returns The workspace owner string (verbatim), or null
 *
 * @example
 * ```typescript
 * const owner = getStoredAuthUsername(); // e.g. "compchemist726@bvbrc"
 * if (owner) {
 *   const outputPath = `/${owner}/modelseed`;
 * }
 * ```
 */
export function getStoredAuthUsername(): string | null {
    if (typeof window === 'undefined') return null;

    // Most authoritative source: the token's `un=` field, used verbatim.
    const token = getStoredAuthToken();
    if (token) {
        const match = token.match(/un=([^|]+)/);
        const un = match?.[1]?.trim();
        if (un) return un;
    }

    // Fallback: the stored user_id (already the verbatim `un=` from login).
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { user_id?: string };
        return parsed?.user_id?.trim() || null;
    } catch {
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
