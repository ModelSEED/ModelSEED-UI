/**
 * Regulons project detail page showing Bacillus subtilis regulatory network.
 * 
 * Displays data from the paper "Reconstruction of the Regulatory Network
 * for Bacillus Subtilis and Reconciliation with Gene Expression Data".
 * 
 * @page /projects/regulons - Regulatory network visualization
 */

'use client';

import { Box, Typography, Alert, Button } from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function RegulonsPage() {
    return (
        <Box sx={{ p: 4 }}>
            <Button
                component={Link}
                href="/projects"
                startIcon={<ArrowBackIcon />}
                sx={{ mb: 2 }}
            >
                Back to Projects
            </Button>

            <Typography variant="h4" gutterBottom>
                Regulons Project
            </Typography>

            <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                    The Regulons project page is currently under development.
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                    This feature from the legacy ModelSEED UI is being migrated to the new platform.
                    Please check back later or contact the development team for more information.
                </Typography>
            </Alert>

            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Available Resources
                </Typography>
                <ul>
                    <li>
                        <Link href="/projects" style={{ color: '#00acc1' }}>
                            ModelSEED Projects Overview
                        </Link>
                    </li>
                    <li>
                        <Link href="/biochem/reactions" style={{ color: '#00acc1' }}>
                            Browse Biochemistry Reactions
                        </Link>
                    </li>
                    <li>
                        <Link href="/genomes" style={{ color: '#00acc1' }}>
                            Browse Reference Genomes
                        </Link>
                    </li>
                </ul>
            </Box>
        </Box>
    );
}
