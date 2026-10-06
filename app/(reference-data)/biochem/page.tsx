'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export default function BiochemPage() {
    return (
        <Box component="main" sx={{ maxWidth: 720, mx: 'auto', py: { xs: 4, md: 8 }, textAlign: 'center' }}>
            <Typography component="h1" variant="h3" gutterBottom>
                Biochemistry
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
                Explore ModelSEED biochemical reactions and compounds.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', gap: 2 }}>
                <Button component={Link} href="/biochem/reactions" variant="contained" color="primary" size="large">
                    Reactions
                </Button>
                <Button component={Link} href="/biochem/compounds" variant="contained" color="primary" size="large">
                    Compounds
                </Button>
            </Box>
        </Box>
    );
}
