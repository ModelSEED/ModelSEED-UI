'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { workspaceGet } from '@/lib/api/workspace';

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
            id={`model-tabpanel-${index}`}
            aria-labelledby={`model-tab-${index}`}
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
        id: `model-tab-${index}`,
        'aria-controls': `model-tabpanel-${index}`,
    };
}

export default function ModelDetailPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const resolvedParams = use(params);
    const workspacePath = `/${resolvedParams.slug.join('/')}`;
    // E.g., /plantseed/plantseed/Alyrata-v1.0

    const { data: modelData, isLoading, error } = useQuery({
        queryKey: ['workspaceGet', workspacePath],
        queryFn: async () => {
            try {
                const result = await workspaceGet([workspacePath]);
                return result[0]; // Assuming array returned as standard KBase RPC
            } catch (err) {
                console.error("Failed to load model from workspace", err);
                throw err;
            }
        },
        retry: 1,
    });

    const [visualizeOption, setVisualizeOption] = useState('');
    const [tabIndex, setTabIndex] = useState(0);

    if (error) {
        return (
            <Box sx={{ p: 4, maxWidth: '1400px', mx: 'auto' }}>
                <Typography color="error" variant="h6">
                    Error loading model: {workspacePath}
                </Typography>
                <Typography>Please verify the model exists and you have access permissions.</Typography>
            </Box>
        );
    }

    if (isLoading) {
        return (
            <Box sx={{ p: 10, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Extract basic Model attributes (simulating old data)
    const modelName = modelData?.data?.id || resolvedParams.slug[resolvedParams.slug.length - 1];

    return (
        <Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 2 }}>
                <Typography variant="h4" component="h1" fontWeight={600}>
                    Model
                </Typography>
                <Typography variant="h5" color="text.secondary">
                    {modelName}
                </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Button variant="contained" color="primary">Rebuild Model</Button>
                <Button variant="contained" color="primary">Blast Genome</Button>
                <Button variant="contained" color="primary">Add Expression</Button>
                <Button variant="contained" color="primary">Run FBA</Button>
                <Button variant="contained" color="primary">Run GapFilling</Button>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Visualize Data Dropdown */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1" fontWeight={500}>
                    Visualize Data:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                        value={visualizeOption}
                        onChange={(e) => setVisualizeOption(e.target.value)}
                        displayEmpty
                    >
                        <MenuItem value="">
                            <em>---Please select---</em>
                        </MenuItem>
                        <MenuItem value="FBA">FBA</MenuItem>
                        <MenuItem value="Expression">Expression</MenuItem>
                        <MenuItem value="GapFill">GapFill</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* Main Tabs (model-generic skeleton) */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} variant="scrollable" scrollButtons="auto">
                    <Tab label="Reactions" {...a11yProps(0)} />
                    <Tab label="Compounds" {...a11yProps(1)} />
                    <Tab label="Genes" {...a11yProps(2)} />
                    <Tab label="Compartments" {...a11yProps(3)} />
                    <Tab label="Biomass" {...a11yProps(4)} />
                    <Tab label="Pathways" {...a11yProps(5)} />
                    <Tab label="Predictions" {...a11yProps(6)} />
                </Tabs>
            </Box>

            <TabPanel value={tabIndex} index={0}>
                <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    Reactions DataTable Placeholder...
                </Typography>
            </TabPanel>

            <TabPanel value={tabIndex} index={1}>
                <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    Compounds DataTable Placeholder...
                </Typography>
            </TabPanel>

            <TabPanel value={tabIndex} index={2}>
                <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    Genes DataTable Placeholder...
                </Typography>
            </TabPanel>

            <TabPanel value={tabIndex} index={3}>
                <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    Compartments DataTable Placeholder...
                </Typography>
            </TabPanel>

            <TabPanel value={tabIndex} index={4}>
                <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    Biomass DataTable Placeholder...
                </Typography>
            </TabPanel>

            <TabPanel value={tabIndex} index={5}>
                <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    Pathways DataTable Placeholder...
                </Typography>
            </TabPanel>

            <TabPanel value={tabIndex} index={6}>
                <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    Predictions DataTable Placeholder...
                </Typography>
            </TabPanel>
        </Box>
    );
}
