'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

const MAINTENANCE_ENABLED = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
const MAINTENANCE_MESSAGE = process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE || 'Site is undergoing maintenance. Please check back shortly.';

export default function OutageBanner() {
    if (!MAINTENANCE_ENABLED) return null;

    return (
        <Box sx={{ width: '100%' }}>
            <Alert
                severity="warning"
                sx={{
                    borderRadius: 0,
                    textAlign: 'center',
                    justifyContent: 'center',
                    '& .MuiAlert-message': { flex: 'unset' },
                }}
            >
                <Typography variant="body1" fontWeight={600}>
                    {MAINTENANCE_MESSAGE}
                </Typography>
            </Alert>
        </Box>
    );
}
