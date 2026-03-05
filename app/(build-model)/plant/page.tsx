'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`build-model-tabpanel-${index}`}
            aria-labelledby={`build-model-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3, backgroundColor: '#fff', border: '1px solid #e0e0e0', borderTop: 'none' }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `build-model-tab-${index}`,
        'aria-controls': `build-model-tabpanel-${index}`,
    };
}

export default function BuildModelPlantPage() {
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto', p: { xs: 2, md: 4 } }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
                    Build Model
                </Typography>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Build Model Tabs">
                    <Tab label="UPLOAD Plants FASTA" {...a11yProps(0)} />
                    <Tab label="UPLOAD Microbes FASTA" {...a11yProps(1)} />
                    <Tab label="PATRIC Microbes" {...a11yProps(2)} />
                    <Tab label="RAST Microbes" {...a11yProps(3)} />
                </Tabs>
            </Box>

            <TabPanel value={tabIndex} index={0}>
                {/* UPLOAD Plants FASTA content skeleton */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
                    <Box>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontStyle: 'italic' }}>
                            Select FASTA file:
                        </Typography>
                        <Button variant="contained" color="primary" component="label">
                            Choose File...
                            <input type="file" hidden />
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                            <Button variant="outlined" size="small" sx={{ mb: 1 }}>
                                Change Media (Optional)
                            </Button>
                            <Typography variant="body2" color="primary">
                                (Selected media: Complete)
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth
                            label="Name Model to build -- Required"
                            required
                            variant="outlined"
                        />

                        <Button variant="contained" color="primary" sx={{ width: 'fit-content', mt: 1 }}>
                            Build Model
                        </Button>
                    </Box>
                </Box>
            </TabPanel>

            <TabPanel value={tabIndex} index={1}>
                {/* UPLOAD Microbes FASTA content skeleton */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
                    <Box>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontStyle: 'italic' }}>
                            Select FASTA file:
                        </Typography>
                        <Button variant="contained" color="primary" component="label">
                            Choose File...
                            <input type="file" hidden />
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            select
                            fullWidth
                            label="Select Template Model"
                            defaultValue=""
                        >
                            <MenuItem value="">Automatically select</MenuItem>
                            <MenuItem value="GramNegative">Gram Negative</MenuItem>
                            <MenuItem value="GramPositive">Gram Positive</MenuItem>
                        </TextField>

                        <TextField
                            select
                            fullWidth
                            label="Genome Type"
                            defaultValue=""
                        >
                            <MenuItem value="">Contigs</MenuItem>
                        </TextField>

                        <Box>
                            <Button variant="outlined" size="small" sx={{ mb: 1 }}>
                                Change Media (Optional)
                            </Button>
                            <Typography variant="body2" color="primary">
                                (Selected media: Complete)
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth
                            label="Name Model to build -- Required"
                            required
                            variant="outlined"
                        />

                        <Button variant="contained" color="primary" sx={{ width: 'fit-content', mt: 1 }}>
                            Build Model
                        </Button>
                    </Box>
                </Box>
            </TabPanel>

            <TabPanel value={tabIndex} index={2}>
                <Typography variant="h6" gutterBottom>PATRIC Microbes</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Search Genomes"
                        sx={{ width: 400 }}
                    />
                </Box>
                <Typography variant="body2" color="text.secondary">
                    Data table placeholder... (PATRIC genomes would be fetched and listed here)
                </Typography>
            </TabPanel>

            <TabPanel value={tabIndex} index={3}>
                <Typography variant="h6" gutterBottom>RAST Microbes</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Search models"
                        sx={{ width: 400 }}
                    />
                </Box>
                <Typography variant="body2" color="text.secondary">
                    Data table placeholder... (RAST genomes would be listed here)
                </Typography>
            </TabPanel>
        </Box>
    );
}
