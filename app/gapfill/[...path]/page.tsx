'use client';

import { use } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

export default function GapfillPage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const workspacePath = `/${resolvedParams.path.join('/')}`;

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
                    Gapfill View
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    {workspacePath}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 4 }}>
                    This data view is under construction.
                </Typography>
            </Box>
        </Container>
    );
}
