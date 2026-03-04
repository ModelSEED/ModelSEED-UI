'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import SignInModal from './SignInModal';

export default function AppHeader() {
    const pathname = usePathname();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
    const [signInOpen, setSignInOpen] = useState(false);

    // If user is inside /reference-data, /rxn, or /cpd
    const isReferenceDataActive = pathname.startsWith('/reference-data') ||
        pathname.startsWith('/rxn') ||
        pathname.startsWith('/cpd');

    const isUserDataActive = pathname.startsWith('/user-data');
    const isBuildModelActive = pathname.startsWith('/build-model');

    const handleMoreClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMoreAnchorEl(event.currentTarget);
    };

    const handleMoreClose = () => {
        setMoreAnchorEl(null);
    };

    const handleProtectedNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Mock authentication check. Always prompt login for now.
        e.preventDefault();
        setSignInOpen(true);
    };

    return (
        <>
            <AppBar
                position="static"
                elevation={1}
                sx={{
                    backgroundColor: '#2D224E',
                    color: '#fff',
                    borderBottom: '1px solid #1a1433',
                }}
            >
                <Toolbar sx={{ minHeight: '58px !important', px: { xs: 2, md: 4 } }}>

                    {/* Logo */}
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', marginRight: '32px' }}>
                        <Image
                            src="/img/ModelSEED-logo.png"
                            alt="ModelSEED Logo"
                            width={174}
                            height={44}
                            style={{ objectFit: 'contain' }}
                        />
                    </Link>

                    {/* Desktop Tabs */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, height: '100%', alignItems: 'stretch' }}>
                            <Button
                                component={Link}
                                href="/reference-data/reactions"
                                sx={{
                                    fontSize: '1.2rem',
                                    fontWeight: isReferenceDataActive ? 600 : 400,
                                    textTransform: 'none',
                                    color: isReferenceDataActive ? '#fff' : '#b39ddb',
                                    borderBottom: isReferenceDataActive ? '3px solid #00acc1' : '3px solid transparent',
                                    borderRadius: 0,
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                    }
                                }}
                            >
                                Reference Data
                            </Button>

                            <Button
                                component={Link}
                                href="/user-data"
                                onClick={handleProtectedNavigation}
                                sx={{
                                    fontSize: '1.2rem',
                                    fontWeight: isUserDataActive ? 600 : 400,
                                    textTransform: 'none',
                                    color: isUserDataActive ? '#fff' : '#b39ddb',
                                    borderBottom: isUserDataActive ? '3px solid #00acc1' : '3px solid transparent',
                                    borderRadius: 0,
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                    }
                                }}
                            >
                                User Data
                            </Button>

                            <Button
                                component={Link}
                                href="/build-model"
                                onClick={handleProtectedNavigation}
                                sx={{
                                    fontSize: '1.2rem',
                                    fontWeight: isBuildModelActive ? 600 : 400,
                                    textTransform: 'none',
                                    color: isBuildModelActive ? '#fff' : '#b39ddb',
                                    borderBottom: isBuildModelActive ? '3px solid #00acc1' : '3px solid transparent',
                                    borderRadius: 0,
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                    }
                                }}
                            >
                                Build Model
                            </Button>
                        </Box>
                    )}

                    {/* Right Side Options */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Button
                                color="inherit"
                                onClick={handleMoreClick}
                                endIcon={<KeyboardArrowDownIcon />}
                                sx={{ textTransform: 'none', color: '#fff' }}
                            >
                                More
                            </Button>
                            <Menu
                                anchorEl={moreAnchorEl}
                                open={Boolean(moreAnchorEl)}
                                onClose={handleMoreClose}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            >
                                <MenuItem component={Link} href="/about" onClick={handleMoreClose}>About</MenuItem>
                                <MenuItem component={Link} href="/about/version" onClick={handleMoreClose}>Version</MenuItem>
                                <MenuItem component={Link} href="/events" onClick={handleMoreClose}>Events</MenuItem>
                                <MenuItem component={Link} href="/projects" onClick={handleMoreClose}>Related Projects</MenuItem>
                            </Menu>

                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => setSignInOpen(true)}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Sign In
                            </Button>
                        </Box>
                    )}

                    {/* Mobile Menu Icon */}
                    {isMobile && (
                        <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end' }}>
                            <IconButton color="inherit" edge="end">
                                <MenuIcon sx={{ color: '#fff' }} />
                            </IconButton>
                        </Box>
                    )}

                </Toolbar>
            </AppBar>

            <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
        </>
    );
}
