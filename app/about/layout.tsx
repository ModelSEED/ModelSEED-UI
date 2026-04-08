'use client';

import React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const SIDEBAR_WIDTH = 200;

const NAV_ITEMS = [
    { label: 'About', path: '/about', exact: true },
    { label: 'Version / Status', path: '/about/version', exact: false },
    { label: 'Data Sources', path: '/about/data-sources', exact: false },
];

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
            {/* Sidebar */}
            <Box
                sx={{
                    width: SIDEBAR_WIDTH,
                    flexShrink: 0,
                    borderRight: '1px solid #e0e0e0',
                    backgroundColor: '#fafafa',
                    pt: 4,
                }}
            >
                <Typography variant="h6" sx={{ px: 3, mb: 2, fontWeight: 500 }}>
                    Contents
                </Typography>
                <List sx={{ py: 0 }}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.path
                            : pathname.startsWith(item.path);

                        return (
                            <ListItem key={item.path} disablePadding>
                                <ListItemButton
                                    component={Link}
                                    href={item.path}
                                    sx={{
                                        pl: 3,
                                        py: 1,
                                        borderLeft: isActive ? '4px solid #30BCCF' : '4px solid transparent',
                                        backgroundColor: isActive ? 'rgba(48, 188, 207, 0.1)' : 'transparent',
                                        '&:hover': {
                                            backgroundColor: isActive ? 'rgba(48, 188, 207, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            fontWeight: isActive ? 600 : 400,
                                            color: isActive ? '#30BCCF' : 'text.primary',
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 4, bgcolor: '#ffffff' }}>
                <Box sx={{ maxWidth: 900 }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
}
