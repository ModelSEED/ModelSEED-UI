'use client';

import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Button from '@mui/material/Button';

export default function BuildModelPage() {
    const [tabVal, setTabVal] = useState(0);

    return (
        <Box sx={{ p: 4, pt: 8 }}>
            <Typography variant="h4" fontWeight="600" gutterBottom>
                Build New Model
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Authentication active.
                Placeholder page for Model Reconstruction. Select reconstruction route based on domain.
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
                <Tabs value={tabVal} onChange={(e, v) => setTabVal(v)}>
                    <Tab label="Plant Model (FASTA/GenBank)" />
                    <Tab label="Microbe Model (FASTA/GenBank)" />
                </Tabs>
            </Box>

            <Box sx={{ p: 4, backgroundColor: '#fff', minHeight: 400, border: '1px solid #e0e0e0', borderTop: 'none' }}>
                {tabVal === 0 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>Plant Metadata Configuration</Typography>
                        <Button variant="contained" color="secondary" sx={{ mt: 2 }}>Upload Sequence File</Button>
                    </Box>
                )}
                {tabVal === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>Microbe Metadata Configuration</Typography>
                        <Button variant="contained" color="secondary" sx={{ mt: 2 }}>Upload Sequence File</Button>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
