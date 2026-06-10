'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth/AuthProvider';
import type { PresentedJobSubmitError } from '@/lib/utils/jobErrors';

/**
 * Returns a handler that, given a presented job-submit error, performs the
 * `TOKEN_EXPIRED` side-effects (clear stored auth + bounce to the sign-in
 * page) and tells the caller whether it did so.
 *
 * Usage:
 * ```ts
 * const maybeRedirect = useTokenExpiredRedirect();
 * try {
 *   await submitFooJobFromApi(payload);
 * } catch (err) {
 *   const presented = presentJobSubmitError(err);
 *   if (maybeRedirect(presented)) return; // already navigating
 *   setError(presented);
 * }
 * ```
 *
 * Returns true when the redirect was triggered, so the caller can early-exit
 * without further state churn.
 */
export function useTokenExpiredRedirect(): (presented: PresentedJobSubmitError) => boolean {
    const { logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    return useCallback(
        (presented: PresentedJobSubmitError) => {
            if (!presented.isTokenExpired) return false;
            logout();
            const search = pathname ? `?returnTo=${encodeURIComponent(pathname)}&reason=token_expired` : '?reason=token_expired';
            void router.replace(`/${search}`);
            return true;
        },
        [logout, router, pathname],
    );
}
