'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

interface MaintenanceStatus {
    enabled: boolean;
    message: string;
}

export default function OutageBanner() {
    const [status, setStatus] = useState<MaintenanceStatus | null>(null);

    useEffect(() => {
        fetch('/api/maintenance', { cache: 'no-store' })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: MaintenanceStatus) => setStatus(data))
            .catch(() => setStatus({ enabled: false, message: '' }));
    }, []);

    if (!status || !status.enabled) return null;

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
                    {status.message || 'Site is undergoing maintenance. Please check back shortly.'}
                </Typography>
            </Alert>
        </Box>
    );
}
