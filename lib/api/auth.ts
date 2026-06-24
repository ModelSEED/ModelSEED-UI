// lib/api/auth.ts
/**
 * Authentication utilities for PATRIC and RAST login services.
 *
 * Replicates the legacy AngularJS auth.js service using standard
 * fetch API calls. Both endpoints accept x-www-form-urlencoded
 * payloads and return user tokens for downstream API authorization.
 *
 * A developer bypass is provided for local testing without network
 * calls: use username "developer" and password "developer".
 */

/* ─── Constants ─────────────────────────────────────────────── */

const PATRIC_AUTH_URL = 'https://user.patricbrc.org/authenticate';
const RAST_AUTH_URL = 'https://p3.theseed.org/Sessions/Login';

/** localStorage key — matches the legacy AngularJS key for compat. */
export const AUTH_STORAGE_KEY = 'auth';

/* ─── Types ─────────────────────────────────────────────────── */

export interface AuthResult {
    user_id: string;
    token: string;
    method: 'PATRIC' | 'RAST';
}

/* ─── Developer Bypass ──────────────────────────────────────── */

/** Maximum timestamp value for token expiry (far future date). */
const DEV_TOKEN_EXPIRY = 9999999999;

const DEV_TOKEN: AuthResult = {
    user_id: 'developer',
    token: `dev|un=developer|tokenid=dev-local-testing|expiry=${DEV_TOKEN_EXPIRY}`,
    method: 'PATRIC',
};

/**
 * Check if credentials match the developer bypass for local testing.
 * 
 * @param username - Username to check
 * @param password - Password to check
 * @returns True if both username and password are 'developer'
 */
function isDeveloperBypass(username: string, password: string): boolean {
    return username === 'developer' && password === 'developer';
}

/* ─── PATRIC Login ──────────────────────────────────────────── */

/**
 * Authenticate against the BV-BRC / PATRIC user service.
 *
 * The endpoint returns a raw pipe-delimited token string on success
 * (e.g. "un=user|tokenid=...|expiry=...") or a JSON error on failure.
 * 
 * @param username - BV-BRC username or email address
 * @param password - User password
 * @returns Promise resolving to AuthResult with user_id, token, and method
 * @throws {Error} When authentication fails or network request fails
 * 
 * @example
 * ```typescript
 * const auth = await loginPatric('user@example.com', 'password123');
 * console.log('Logged in as:', auth.user_id);
 * persistAuth(auth); // Store for later use
 * ```
 */
export async function loginPatric(
    username: string,
    password: string,
): Promise<AuthResult> {
    if (isDeveloperBypass(username, password)) {
        return { ...DEV_TOKEN, method: 'PATRIC' };
    }

    const body = new URLSearchParams({ username, password });

    const response = await fetch(PATRIC_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const message =
            errBody?.message ?? `PATRIC login failed (HTTP ${response.status})`;
        throw new Error(message);
    }

    // PATRIC returns a raw token string on 200
    const token = await response.text();

    // Extract user_id from the un=<user> segment and use it VERBATIM.
    // PATRIC/BV-BRC encode the fully-qualified workspace owner here
    // (e.g. `user@patricbrc.org`, `user@bvbrc`). Never strip the realm or
    // append one — workspace paths must match `un=` exactly, otherwise users
    // with `@bvbrc`/`@patricbrc.org` suffixes get "Insufficient permissions".
    const userIdMatch = token.match(/un=([^|]+)/);
    const user_id = userIdMatch ? userIdMatch[1].trim() : username;

    return { user_id, token: token.trim(), method: 'PATRIC' };
}

/* ─── RAST Login ────────────────────────────────────────────── */

/**
 * Authenticate against the RAST Sessions/Login endpoint.
 *
 * Returns a JSON object with { user_id, token, name } on success,
 * or a JSON error on failure.
 * 
 * @param username - RAST username
 * @param password - User password
 * @returns Promise resolving to AuthResult with user_id, token, and method
 * @throws {Error} When authentication fails or network request fails
 * 
 * @example
 * ```typescript
 * const auth = await loginRast('rastuser', 'password123');
 * console.log('Logged in as:', auth.user_id);
 * persistAuth(auth);
 * ```
 */
export async function loginRast(
    username: string,
    password: string,
): Promise<AuthResult> {
    if (isDeveloperBypass(username, password)) {
        return { ...DEV_TOKEN, method: 'RAST' };
    }

    const body = new URLSearchParams({
        user_id: username,
        password,
        status: '1',
        cookie: '1',
        fields: 'name,user_id,token',
    });

    const response = await fetch(RAST_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const message =
            errBody?.error ?? `RAST login failed (HTTP ${response.status})`;
        throw new Error(message);
    }

    const data = await response.json();

    return {
        user_id: data.user_id,
        token: data.token,
        method: 'RAST',
    };
}

/* ─── Storage Helpers ───────────────────────────────────────── */

/**
 * Persist authentication result to localStorage for session management.
 * 
 * Stores the auth token and user info in localStorage under the AUTH_STORAGE_KEY.
 * This function is client-side only and safely handles SSR contexts.
 * 
 * @param auth - Authentication result from loginPatric or loginRast
 * 
 * @example
 * ```typescript
 * const auth = await loginPatric('user', 'pass');
 * persistAuth(auth); // Stores in localStorage
 * ```
 */
export function persistAuth(auth: AuthResult): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    }
}

/**
 * Retrieve stored authentication result from localStorage.
 * 
 * Returns the previously persisted auth data, or null if no auth is stored
 * or if called in SSR context. Handles parse errors gracefully.
 * 
 * @returns AuthResult if found and valid, null otherwise
 * 
 * @example
 * ```typescript
 * const auth = getStoredAuth();
 * if (auth) {
 *   console.log('User is logged in as:', auth.user_id);
 * } else {
 *   console.log('User is not logged in');
 * }
 * ```
 */
export function getStoredAuth(): AuthResult | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AuthResult;
    } catch {
        return null;
    }
}

/**
 * Remove authentication data from localStorage (logout).
 * 
 * Clears the stored auth token and user info. Safe to call in SSR context.
 * 
 * @example
 * ```typescript
 * clearAuth(); // User is now logged out
 * ```
 */
export function clearAuth(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }
}
