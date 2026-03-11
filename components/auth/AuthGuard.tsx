'use client';

import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useAuth } from './AuthProvider';

interface AuthGuardProps {
    children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    Authentication Required
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Please sign in to view this page.
                </Typography>
            </Box>
        );
    }

    return <>{children}</>;
}
