'use client';

import { use } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

export default function FeaturePage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const genomeId = resolvedParams.path[0] || '';
    const featureId = resolvedParams.path.slice(1).join('/');

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
                    Feature View
                </Typography>
                {genomeId && (
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Genome: {genomeId}
                    </Typography>
                )}
                {featureId && (
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        Feature: {featureId}
                    </Typography>
                )}
                <Typography variant="body1" color="text.secondary" sx={{ mt: 4 }}>
                    This data view is under construction.
                </Typography>
            </Box>
        </Container>
    );
}
