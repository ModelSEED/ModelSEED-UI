'use client';

import { use } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface GenomeDetailProps {
    params: Promise<{
        ref: string;
    }>;
}

export default function GenomeDetailPage(props: GenomeDetailProps) {
    const params = use(props.params);
    const genomeRef = decodeURIComponent(params.ref);

    // Query for genome data - this would need to be implemented in the API
    const { data: genomeData, isLoading, error } = useQuery({
        queryKey: ['genome', genomeRef],
        queryFn: async () => {
            // Placeholder - would need actual API endpoint
            throw new Error('Genome detail API endpoint not yet implemented');
        },
        retry: false,
        enabled: false, // Disable until API is ready
    });

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
                Genome Detail
            </Typography>

            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                    <strong>Genome Reference:</strong> {genomeRef}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                    This page is under construction. Genome detail pages will be available soon.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                    You can browse available genomes at <Link href="/genomes" style={{ color: '#00acc1' }}>/genomes</Link>
                </Typography>
            </Alert>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                    Genome detail endpoint not yet implemented. Please use the <Link href="/genomes">genomes list</Link> page.
                </Alert>
            )}
        </Box>
    );
}
