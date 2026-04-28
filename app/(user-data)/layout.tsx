'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

/**
 * Sub-navigation tabs for the User Data section.
 * Mirrors legacy User Data toolbar:
 *   My Models | My Media
 */

interface UserDataTab {
    label: string;
    href: string;
    matchPaths: string[]; // pathname prefixes that mark this tab active
}

const USER_DATA_TABS: UserDataTab[] = [
    {
        label: 'My Models',
        href: '/my-models',
        matchPaths: ['/my-models'],
    },
    {
        label: 'My Media',
        href: '/myMedia',
        matchPaths: ['/myMedia'],
    },
    {
        label: 'My Jobs',
        href: '/my-jobs',
        matchPaths: ['/my-jobs'],
    },
];

export default function UserDataLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const activeIndex = useMemo(() => {
        let bestIndex = -1;
        let bestMatchLength = -1;

        USER_DATA_TABS.forEach((tab, idx) => {
            tab.matchPaths.forEach((p) => {
                if (pathname.startsWith(p) && p.length > bestMatchLength) {
                    bestIndex = idx;
                    bestMatchLength = p.length;
                }
            });
        });

        return bestIndex;
    }, [pathname]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 0 }}>
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
                            fontSize: '1rem',
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
                        },
                    }}
                >
                    {USER_DATA_TABS.map((tab) => (
                        <Tab
                            key={tab.label}
                            label={tab.label}
                            component={Link}
                            href={tab.href}
                        />
                    ))}
                </Tabs>
            </Box>

            <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
                {children}
            </Box>
        </Box>
    );
}
