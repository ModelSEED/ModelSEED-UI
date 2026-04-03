'use client';

import { Box, Typography, Alert, Button, Card, CardContent } from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function FusionsPage() {
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
                Gene Fusions Project
            </Typography>

            <Alert severity="info" sx={{ mt: 2, mb: 4 }}>
                <Typography variant="body1" gutterBottom>
                    The Gene Fusions project page is currently under development.
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                    This feature from the legacy ModelSEED UI is being migrated to the new platform.
                    The following sub-pages are also being migrated:
                </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Fusions Sub-Pages (Coming Soon)
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2, mt: 2 }}>
                {[
                    { name: 'Training Genes', path: '/projects/fusions/training-gene/:gene' },
                    { name: 'Fusion Genes', path: '/projects/fusions/fusion-gene/:gene' },
                    { name: 'Roles', path: '/projects/fusions/role/:role' },
                    { name: 'CDD', path: '/projects/fusions/cdd/:cdd' },
                    { name: 'CDD Sets', path: '/projects/fusions/cdd-sets/:cdd' },
                    { name: 'Genome Stats', path: '/projects/fusions/genome-stats/:id' },
                    { name: 'Reactions', path: '/projects/fusions/reactions/:id' },
                    { name: 'Subsystems', path: '/projects/fusions/subsystems/:id' },
                ].map((item) => (
                    <Card key={item.path} sx={{ opacity: 0.7 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {item.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {item.path}
                            </Typography>
                            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                                Under development
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

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
                        <Link href="/genomes" style={{ color: '#00acc1' }}>
                            Browse Reference Genomes
                        </Link>
                    </li>
                </ul>
            </Box>
        </Box>
    );
}
