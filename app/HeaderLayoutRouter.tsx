'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import AppHeader from '@/components/layout/AppHeader';

/**
 * Conditionally renders the correct header based on the current path.
 * 
 * Marketing / Information paths use the default <Header />
 * App routes (/reference-data, /build-model, /user-data, etc) use <AppHeader />
 * 
 * The AppHeader shows "Reference Data | User Data | Build Model" navigation.
 */
export default function HeaderLayoutRouter() {
    const pathname = usePathname();

    // App routes that should show the main navigation header (Reference Data | User Data | Build Model)
    const isAppRoute = 
        // User Data routes
        pathname.startsWith('/my-') ||
        pathname.startsWith('/myMedia') ||
        // Build Model routes  
        pathname.startsWith('/plant') ||
        pathname.startsWith('/compare') ||
        // Reference Data routes
        pathname.startsWith('/biochem') ||
        pathname.startsWith('/media') ||
        pathname.startsWith('/genomes') ||
        // Model/FBA/Gapfill detail pages (these are under User Data conceptually)
        pathname.startsWith('/model/') ||
        pathname.startsWith('/fba/') ||
        pathname.startsWith('/gapfill/') ||
        pathname.startsWith('/genome/') ||
        pathname.startsWith('/feature/') ||
        // Data explorer
        pathname.startsWith('/data');

    if (isAppRoute) {
        return <AppHeader />;
    }

    return <Header />;
}
