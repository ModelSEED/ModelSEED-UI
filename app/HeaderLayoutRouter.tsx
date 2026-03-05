'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import AppHeader from '@/components/layout/AppHeader';

/**
 * Conditionally renders the correct header based on the current path.
 * 
 * Marketing / Information paths use the default <Header />
 * App routes (/reference-data, /build-model, etc) use <AppHeader />
 */
export default function HeaderLayoutRouter() {
    const pathname = usePathname();

    const isAppRoute = pathname.startsWith('/genomes') ||
        pathname.startsWith('/biochem') ||
        pathname.startsWith('/list-media') ||
        pathname.startsWith('/user-data') ||
        pathname.startsWith('/build-model');

    if (isAppRoute) {
        return <AppHeader />;
    }

    return <Header />;
}
