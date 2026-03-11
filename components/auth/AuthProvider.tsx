'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
    loginPatric,
    loginRast,
    persistAuth,
    getStoredAuth,
    clearAuth,
    type AuthResult,
} from '@/lib/api/auth';

/* ─── Context Shape ─────────────────────────────────────────── */

interface AuthContextValue {
    /** Whether the user has an active session. */
    isAuthenticated: boolean;
    /** Authenticated username (null when logged out). */
    user: string | null;
    /** Raw authentication token for API calls (null when logged out). */
    token: string | null;
    /** The method used for the current session. */
    method: 'PATRIC' | 'RAST' | null;
    /** True while a login request is in flight. */
    loading: boolean;
    /** Login — calls the appropriate auth endpoint and persists the result. */
    login: (method: 'PATRIC' | 'RAST', username: string, password: string) => Promise<void>;
    /** Logout — clears stored credentials and resets state. */
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ─── Provider ──────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
    const [authData, setAuthData] = useState<AuthResult | null>(null);
    const [loading, setLoading] = useState(false);

    // Hydrate from localStorage on mount (client-side only)
    useEffect(() => {
        const stored = getStoredAuth();
        if (stored) {
            setAuthData(stored);
        }
    }, []);

    // Listen for cross-tab logout (mirrors legacy storageEventHandler)
    useEffect(() => {
        function handleStorageChange(e: StorageEvent) {
            if (e.key === 'auth' && !e.newValue) {
                setAuthData(null);
            }
        }
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = useCallback(
        async (method: 'PATRIC' | 'RAST', username: string, password: string) => {
            setLoading(true);
            try {
                const result =
                    method === 'PATRIC'
                        ? await loginPatric(username, password)
                        : await loginRast(username, password);

                persistAuth(result);
                setAuthData(result);
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const logout = useCallback(() => {
        clearAuth();
        setAuthData(null);
    }, []);

    const value: AuthContextValue = {
        isAuthenticated: !!authData,
        user: authData?.user_id ?? null,
        token: authData?.token ?? null,
        method: authData?.method ?? null,
        loading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ─── Hook ──────────────────────────────────────────────────── */

/**
 * Access the global authentication context.
 * Must be used within an `<AuthProvider>`.
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an <AuthProvider>');
    }
    return ctx;
}
