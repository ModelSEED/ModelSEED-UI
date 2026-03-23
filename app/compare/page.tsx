'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { getModelDetailBundleFromApi, type ModelDetailBundle } from '@/lib/api/modelseed';

interface ComparisonRow {
    id: string;
    name: string;
    [key: string]: string | number | boolean | undefined;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
        </div>
    );
}

function ModelComparisonContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(0);

    // Parse model refs from URL params (e.g., ?models=/path/model1,/path/model2)
    const modelRefs = useMemo(() => {
        const modelsParam = searchParams.get('models');
        if (!modelsParam) return [];
        return modelsParam.split(',').filter(Boolean).slice(0, 3); // Max 3 models
    }, [searchParams]);

    // Fetch all models in parallel
    const modelQueries = useQueries({
        queries: modelRefs.map((ref) => ({
            queryKey: ['model-compare', ref],
            queryFn: () => getModelDetailBundleFromApi(ref),
            enabled: !!ref,
        })),
    });

    const isLoading = modelQueries.some((q) => q.isLoading);
    const hasError = modelQueries.some((q) => q.error);
    const models = modelQueries
        .map((q) => q.data)
        .filter((d): d is ModelDetailBundle => d !== undefined);

    // Extract model data (bundle.data contains the actual model object)
    const modelData = useMemo(() => models.map((m) => m.data as Record<string, unknown>), [models]);

    // Extract model names for column headers
    const modelNames = useMemo(() => {
        return models.map((m, i) => {
            const pathParts = modelRefs[i]?.split('/') || [];
            return pathParts[pathParts.length - 1] || `Model ${i + 1}`;
        });
    }, [models, modelRefs]);

    // Build reaction comparison data
    const reactionComparison = useMemo<ComparisonRow[]>(() => {
        if (modelData.length === 0) return [];

        // Collect all unique reaction IDs
        const allReactionIds = new Set<string>();
        const reactionDataMap: Map<string, Record<string, unknown>> = new Map();

        modelData.forEach((model, modelIndex) => {
            const reactions = (model.modelreactions || model.reactions || []) as Record<string, unknown>[];
            reactions.forEach((rxn: Record<string, unknown>) => {
                const id = String(rxn.id || rxn.reaction || '');
                if (!id) return;
                allReactionIds.add(id);

                if (!reactionDataMap.has(id)) {
                    reactionDataMap.set(id, {
                        id,
                        name: rxn.name || rxn.reaction || id,
                    });
                }

                const entry = reactionDataMap.get(id)!;
                entry[`model${modelIndex}_present`] = true;
                entry[`model${modelIndex}_direction`] = rxn.direction;
                entry[`model${modelIndex}_gpr`] = rxn.gpr || '';
            });
        });

        return Array.from(reactionDataMap.values()) as ComparisonRow[];
    }, [modelData]);

    // Build compound comparison data
    const compoundComparison = useMemo<ComparisonRow[]>(() => {
        if (modelData.length === 0) return [];

        const allCompoundIds = new Set<string>();
        const compoundDataMap: Map<string, Record<string, unknown>> = new Map();

        modelData.forEach((model, modelIndex) => {
            const compounds = (model.modelcompounds || model.compounds || []) as Record<string, unknown>[];
            compounds.forEach((cpd: Record<string, unknown>) => {
                const id = String(cpd.id || cpd.compound || '');
                if (!id) return;
                allCompoundIds.add(id);

                if (!compoundDataMap.has(id)) {
                    compoundDataMap.set(id, {
                        id,
                        name: cpd.name || cpd.compound || id,
                    });
                }

                const entry = compoundDataMap.get(id)!;
                entry[`model${modelIndex}_present`] = true;
                entry[`model${modelIndex}_charge`] = cpd.charge;
                entry[`model${modelIndex}_compartment`] = cpd.compartment || cpd.modelcompartment_ref;
            });
        });

        return Array.from(compoundDataMap.values()) as ComparisonRow[];
    }, [modelData]);

    // Build gene comparison data
    const geneComparison = useMemo<ComparisonRow[]>(() => {
        if (modelData.length === 0) return [];

        const allGeneIds = new Set<string>();
        const geneDataMap: Map<string, Record<string, unknown>> = new Map();

        modelData.forEach((model, modelIndex) => {
            const genes = (model.modelgenes || model.genes || []) as Record<string, unknown>[];
            genes.forEach((gene: Record<string, unknown>) => {
                const id = String(gene.id || gene.gene || '');
                if (!id) return;
                allGeneIds.add(id);

                if (!geneDataMap.has(id)) {
                    geneDataMap.set(id, {
                        id,
                        name: gene.name || gene.function || id,
                    });
                }

                const entry = geneDataMap.get(id)!;
                entry[`model${modelIndex}_present`] = true;
            });
        });

        return Array.from(geneDataMap.values()) as ComparisonRow[];
    }, [modelData]);

    // Dynamic columns based on number of models
    const buildComparisonColumns = (type: 'reactions' | 'compounds' | 'genes'): GridColDef[] => {
        const baseColumns: GridColDef[] = [
            { field: 'id', headerName: 'ID', width: 140 },
            { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
        ];

        const modelColumns: GridColDef[] = modelNames.map((name, i) => ({
            field: `model${i}_present`,
            headerName: name,
            width: 120,
            renderCell: (params) => (
                params.value ? (
                    <Chip label="✓" size="small" color="success" variant="outlined" />
                ) : (
                    <Chip label="—" size="small" variant="outlined" />
                )
            ),
        }));

        return [...baseColumns, ...modelColumns];
    };

    if (modelRefs.length === 0) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight={600}>
                    Model Comparison
                </Typography>
                <Alert severity="info">
                    No models selected for comparison. Go to{' '}
                    <Link href="/my-models" style={{ color: 'inherit', fontWeight: 600 }}>
                        My Models
                    </Link>{' '}
                    and select models to compare.
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom fontWeight={600}>
                    Model Comparison
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {modelRefs.map((ref, i) => (
                        <Chip
                            key={ref}
                            label={modelNames[i] || ref}
                            color={i === 0 ? 'primary' : i === 1 ? 'secondary' : 'default'}
                            variant="outlined"
                        />
                    ))}
                </Box>
            </Box>

            {/* Loading state */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Error state */}
            {hasError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load one or more models. Some comparison data may be missing.
                </Alert>
            )}

            {/* Comparison content */}
            {!isLoading && models.length > 0 && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, v) => setActiveTab(v)}
                        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                    >
                        <Tab label={`Reactions (${reactionComparison.length})`} />
                        <Tab label={`Compounds (${compoundComparison.length})`} />
                        <Tab label={`Genes (${geneComparison.length})`} />
                        <Tab label="Summary" />
                    </Tabs>

                    <Box sx={{ p: 2 }}>
                        {/* Reactions Tab */}
                        <TabPanel value={activeTab} index={0}>
                            <DataGrid
                                rows={reactionComparison}
                                columns={buildComparisonColumns('reactions')}
                                pageSizeOptions={[25, 50, 100]}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 25 } },
                                }}
                                autoHeight
                                disableRowSelectionOnClick
                            />
                        </TabPanel>

                        {/* Compounds Tab */}
                        <TabPanel value={activeTab} index={1}>
                            <DataGrid
                                rows={compoundComparison}
                                columns={buildComparisonColumns('compounds')}
                                pageSizeOptions={[25, 50, 100]}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 25 } },
                                }}
                                autoHeight
                                disableRowSelectionOnClick
                            />
                        </TabPanel>

                        {/* Genes Tab */}
                        <TabPanel value={activeTab} index={2}>
                            <DataGrid
                                rows={geneComparison}
                                columns={buildComparisonColumns('genes')}
                                pageSizeOptions={[25, 50, 100]}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 25 } },
                                }}
                                autoHeight
                                disableRowSelectionOnClick
                            />
                        </TabPanel>

                        {/* Summary Tab */}
                        <TabPanel value={activeTab} index={3}>
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                {modelData.map((model, i) => {
                                    const reactions = (model.modelreactions as unknown[] || model.reactions as unknown[] || []).length;
                                    const compounds = (model.modelcompounds as unknown[] || model.compounds as unknown[] || []).length;
                                    const genes = (model.modelgenes as unknown[] || model.genes as unknown[] || []).length;
                                    const biomasses = (model.biomasses as unknown[] || []).length;

                                    return (
                                        <Paper
                                            key={modelRefs[i]}
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                minWidth: 200,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                                {modelNames[i]}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Reactions: {reactions}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Compounds: {compounds}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Genes: {genes}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Biomasses: {biomasses}
                                            </Typography>
                                        </Paper>
                                    );
                                })}
                            </Box>

                            {/* Overlap stats */}
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Overlap Statistics
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    • Shared reactions: {reactionComparison.filter((r) =>
                                        modelNames.every((_, i) => r[`model${i}_present`])
                                    ).length} / {reactionComparison.length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    • Shared compounds: {compoundComparison.filter((c) =>
                                        modelNames.every((_, i) => c[`model${i}_present`])
                                    ).length} / {compoundComparison.length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    • Shared genes: {geneComparison.filter((g) =>
                                        modelNames.every((_, i) => g[`model${i}_present`])
                                    ).length} / {geneComparison.length}
                                </Typography>
                            </Box>
                        </TabPanel>
                    </Box>
                </Paper>
            )}
        </Container>
    );
}

export default function ModelComparisonPage() {
    return (
        <Suspense fallback={<Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}>
            <ModelComparisonContent />
        </Suspense>
    );
}
