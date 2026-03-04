'use client';

import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

export default function UserDataPage() {
    const [tabVal, setTabVal] = useState(0);

    return (
        <Box sx={{ p: 4, pt: 8 }}>
            <Typography variant="h4" fontWeight="600" gutterBottom>
                User Data Workspace
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Authentication active.
                Placeholder page for the upcoming My Models and My Media components.
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
                <Tabs value={tabVal} onChange={(e, v) => setTabVal(v)}>
                    <Tab label="My Models" />
                    <Tab label="My Media" />
                    <Tab label="My Custom Features" />
                </Tabs>
            </Box>

            <Box sx={{ p: 3, backgroundColor: '#fff', minHeight: 400 }}>
                {tabVal === 0 && <Typography>User Models DataGrid Placeholder...</Typography>}
                {tabVal === 1 && <Typography>User Media DataGrid Placeholder...</Typography>}
                {tabVal === 2 && <Typography>Custom Features Placeholder...</Typography>}
            </Box>
        </Box>
    );
}
