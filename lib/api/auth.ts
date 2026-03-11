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

const DEV_TOKEN: AuthResult = {
    user_id: 'developer',
    token: 'dev|un=developer|tokenid=dev-local-testing|expiry=9999999999',
    method: 'PATRIC',
};

function isDeveloperBypass(username: string, password: string): boolean {
    return username === 'developer' && password === 'developer';
}

/* ─── PATRIC Login ──────────────────────────────────────────── */

/**
 * Authenticate against the BV-BRC / PATRIC user service.
 *
 * The endpoint returns a raw pipe-delimited token string on success
 * (e.g. "un=user|tokenid=...|expiry=...") or a JSON error on failure.
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

    // Extract user_id from un=<user> segment
    const userIdMatch = token.match(/un=([^|]+)/);
    const user_id = userIdMatch ? userIdMatch[1] : username;

    return { user_id, token: token.trim(), method: 'PATRIC' };
}

/* ─── RAST Login ────────────────────────────────────────────── */

/**
 * Authenticate against the RAST Sessions/Login endpoint.
 *
 * Returns a JSON object with { user_id, token, name } on success,
 * or a JSON error on failure.
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

/** Persist auth result to localStorage (client-side only). */
export function persistAuth(auth: AuthResult): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    }
}

/** Retrieve stored auth result from localStorage (client-side only). */
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

/** Remove auth data from localStorage. */
export function clearAuth(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }
}
