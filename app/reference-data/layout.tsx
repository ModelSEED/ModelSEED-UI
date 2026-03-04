'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

/**
 * Sub-navigation tabs for the Biochemistry section.
 * Mirrors legacy `biochem.html` toolbar:
 *   Public Plant Models | Subsystems | Reactions | Compounds | Media
 */

interface BiochemTab {
    label: string;
    href: string;
    matchPaths: string[];       // pathname prefixes that mark this tab active
    disabled?: boolean;
}

const REF_DATA_TABS: BiochemTab[] = [
    {
        label: 'Public Plant Models',
        href: '/reference-data/plants',
        matchPaths: ['/reference-data/plants', '/genomes/Plants'],
    },
    {
        label: 'Subsystems',
        href: '/reference-data/subsystems',
        matchPaths: ['/reference-data/subsystems', '/genomes/Annotations'],
    },
    {
        label: 'Reactions',
        href: '/reference-data/reactions',
        matchPaths: ['/reference-data/reactions', '/rxn'],
    },
    {
        label: 'Compounds',
        href: '/reference-data/compounds',
        matchPaths: ['/reference-data/compounds', '/cpd'],
    },
    {
        label: 'Media',
        href: '/reference-data/media',
        matchPaths: ['/reference-data/media', '/list-media'],
    },
];

export default function BiochemLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Determine active tab index from the current URL
    const activeIndex = REF_DATA_TABS.findIndex((tab) =>
        tab.matchPaths.some((p) => pathname.startsWith(p)),
    );

    return (
        <>
            {/* ── Sub-navigation toolbar (mirrors legacy purple bar) ── */}
            <Box
                sx={{
                    backgroundColor: '#2D224E',
                    borderBottom: '1px solid #ccc',
                    px: 1.5,
                }}
            >
                <Tabs
                    value={activeIndex === -1 ? false : activeIndex}
                    variant="scrollable"
                    scrollButtons="auto"
                    TabIndicatorProps={{ sx: { display: 'none' } }}
                    sx={{
                        minHeight: 48,
                        '& .MuiTab-root': {
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '0.95rem',
                            fontWeight: 400,
                            textTransform: 'none',
                            minHeight: 48,
                            borderRight: '1px solid #bbb',
                            px: 2.5,
                            '&.Mui-selected': {
                                color: '#fff',
                                fontWeight: 600,
                            },
                            '&:hover': {
                                color: '#fff',
                            },
                            '&.Mui-disabled': {
                                color: 'rgba(255,255,255,0.35)',
                            },
                        },
                    }}
                >
                    {REF_DATA_TABS.map((tab) => (
                        <Tab
                            key={tab.label}
                            label={tab.label}
                            component={tab.disabled ? 'div' : Link}
                            href={tab.disabled ? undefined : tab.href}
                            disabled={tab.disabled}
                        />
                    ))}
                </Tabs>
            </Box>

            {/* ── Page content ── */}
            <Box sx={{ px: 2, py: 2 }}>
                {children}
            </Box>
        </>
    );
}
