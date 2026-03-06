'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface NavItem {
    label: string;
    href: string;
    external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Team', href: '/team' },
    { label: 'Publications', href: '/publications' },
    { label: 'Projects', href: '/projects' },
    { label: 'Events', href: '/events' },
    { label: 'Escher', href: '/escher/escher_builder.html', external: true },
];

export default function Header() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const pathname = usePathname();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    /** Check if a nav item is active based on the current pathname */
    const isActive = (href: string) => pathname.startsWith(href);

    const toggleDrawer = (open: boolean) => () => {
        setDrawerOpen(open);
    };

    const drawerContent = (
        <Box
            sx={{ width: 260 }}
            role="presentation"
            onClick={toggleDrawer(false)}
            onKeyDown={toggleDrawer(false)}
        >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <Link href="/">
                    <Image
                        src="/img/ModelSEED-logo.png"
                        alt="ModelSEED"
                        width={160}
                        height={40}
                        style={{ objectFit: 'contain' }}
                    />
                </Link>
            </Box>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton component={Link} href="/biochem/reactions">
                        <ListItemText
                            primary="Biochemistry"
                            primaryTypographyProps={{ fontWeight: 600, color: 'primary' }}
                        />
                    </ListItemButton>
                </ListItem>
                <Divider />
                {NAV_ITEMS.map((item) => (
                    <ListItem key={item.label} disablePadding>
                        <ListItemButton
                            component={item.external ? 'a' : Link}
                            href={item.href}
                            {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                            <ListItemText primary={item.label} />
                        </ListItemButton>
                    </ListItem>
                ))}
                <Divider />
                <ListItem disablePadding>
                    <ListItemButton component={Link} href="/about">
                        <ListItemText primary="About" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton component={Link} href="/">
                        <ListItemText
                            primary="Sign In"
                            primaryTypographyProps={{ fontWeight: 600, color: 'primary' }}
                        />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <>
            <AppBar
                position="fixed"
                elevation={2}
                sx={{
                    backgroundColor: '#2D224E',
                    minHeight: 50,
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                }}
            >
                <Toolbar
                    sx={{
                        maxWidth: 1170,
                        width: '100%',
                        mx: 'auto',
                        px: { xs: 1, sm: 2 },
                        minHeight: { xs: 50, sm: 50 },
                    }}
                >
                    <Box sx={{ mr: { xs: 1, md: 4 }, display: 'flex', alignItems: 'center' }}>
                        <Link href="/" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Image
                                src="/img/ModelSEED-logo.png"
                                alt="ModelSEED"
                                width={174}
                                height={44}
                                style={{ objectFit: 'contain', display: 'block' }}
                                priority
                            />
                            <Box component="span" sx={{
                                position: 'absolute',
                                right: '-20px',
                                top: '5px',
                                fontSize: '0.6em',
                                color: '#aaa'
                            }}>
                                (beta)
                            </Box>
                        </Link>
                    </Box>

                    {/* Desktop Nav */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                            <Button
                                component={Link}
                                href="/biochem/reactions"
                                variant="contained"
                                size="small"
                                sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    color: '#fff',
                                    fontWeight: 600,
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: '#1ba3b4',
                                    },
                                }}
                            >
                                Biochemistry
                            </Button>

                            {NAV_ITEMS.map((item) => {
                                const active = !item.external && isActive(item.href);
                                return (
                                    <Button
                                        key={item.label}
                                        component={item.external ? 'a' : Link}
                                        href={item.href}
                                        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                        sx={{
                                            color: '#EBEBEB',
                                            fontWeight: 300,
                                            fontSize: '0.875rem',
                                            letterSpacing: '1px',
                                            borderRadius: 0,
                                            borderBottom: active
                                                ? '3px solid #EBEBEB'
                                                : '3px solid transparent',
                                            '&:hover': {
                                                color: '#EBEBEB',
                                                backgroundColor: 'transparent',
                                                borderBottom: '3px solid #EBEBEB',
                                            },
                                        }}
                                    >
                                        {item.label}
                                    </Button>
                                );
                            })}

                            <Box sx={{ flex: 1 }} />

                            <Button
                                component={Link}
                                href="/about"
                                sx={{
                                    color: '#EBEBEB',
                                    fontWeight: 300,
                                    fontSize: '0.875rem',
                                    letterSpacing: '1px',
                                    borderRadius: 0,
                                    borderBottom: isActive('/about')
                                        ? '3px solid #EBEBEB'
                                        : '3px solid transparent',
                                    '&:hover': {
                                        color: '#EBEBEB',
                                        backgroundColor: 'transparent',
                                        borderBottom: '3px solid #EBEBEB',
                                    },
                                }}
                            >
                                About
                            </Button>

                            <Button
                                component={Link}
                                href="/"
                                variant="contained"
                                size="small"
                                sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    color: '#fff',
                                    fontWeight: 600,
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: '#1ba3b4',
                                    },
                                }}
                            >
                                Sign In
                            </Button>
                        </Box>
                    )}

                    {/* Mobile Hamburger */}
                    {isMobile && (
                        <>
                            <Box sx={{ flex: 1 }} />
                            <IconButton
                                color="inherit"
                                aria-label="open navigation menu"
                                edge="end"
                                onClick={toggleDrawer(true)}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Drawer
                                anchor="right"
                                open={drawerOpen}
                                onClose={toggleDrawer(false)}
                            >
                                {drawerContent}
                            </Drawer>
                        </>
                    )}
                </Toolbar>
            </AppBar>
            <Toolbar sx={{ minHeight: { xs: 50, sm: 50 } }} />
        </>
    );
}
