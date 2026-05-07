/**
 * Genome detail view displaying annotation features and roles.
 * 
 * Fetches genome data from Workspace and displays features in a searchable,
 * sortable DataGrid with pagination. Shows both raw features and derived
 * annotations (roles/subsystems).
 * 
 * @route /genome/[...path] - Dynamic genome workspace path
 * @param {Promise<{ path: string[] }>} params - Workspace path segments
 */

'use client';

import { use, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { workspaceGet, parseWorkspaceGetObject } from '@/lib/api/workspace';
import DataControlHeader from '@/components/layout/DataControlHeader';

/* ─── Types ─── */

interface GenomeFeature {
    id: string;
    featureId: string;
    type: string;
    func: string;
    location: string;
    aliases: string;
}

interface GenomeAnnotation {
    id: string;
    feature: string;
    role: string;
    subsystem: string;
}

/* ─── Helpers ─── */

/**
 * Extracts the genome name from a workspace path.
 * 
 * @param genomePath - Full workspace path to genome object
 * @returns Last path segment as genome name, or 'Genome' if empty
 */
function extractGenomeName(genomePath: string): string {
    const parts = genomePath.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'Genome';
}

/**
 * Parses genome features from raw workspace data.
 * 
 * @param data - Raw genome object from workspace
 * @returns Array of parsed GenomeFeature objects
 */
function parseFeatures(data: Record<string, unknown>): GenomeFeature[] {
    const features = data.features as Record<string, unknown>[] | undefined;
    if (!Array.isArray(features)) return [];
    return features.map((f, idx) => {
        const fId = String(f.id ?? f.feature_id ?? `feature-${idx}`);
        const loc = f.location as unknown;
        let locationStr = '';
        if (Array.isArray(loc) && loc.length > 0) {
            const first = loc[0] as unknown[];
            if (Array.isArray(first)) {
                locationStr = `${first[0] ?? ''}:${first[1] ?? ''}..${Number(first[1] ?? 0) + Number(first[3] ?? 0)}(${first[2] ?? '+'})`;
            }
        } else if (typeof loc === 'string') {
            locationStr = loc;
        }
        const aliases = f.aliases as unknown;
        let aliasStr = '';
        if (Array.isArray(aliases)) {
            aliasStr = aliases.flat().filter((a): a is string => typeof a === 'string').join(', ');
        }
        return {
            id: fId + '-' + idx,
            featureId: fId,
            type: String(f.type ?? ''),
            func: String(f.function ?? f.functional_description ?? ''),
            location: locationStr,
            aliases: aliasStr,
        };
    });
}

/**
 * Parses genome annotations (roles/subsystems) from raw workspace data.
 * 
 * @param data - Raw genome object from workspace
 * @returns Array of parsed GenomeAnnotation objects
 */
function parseAnnotations(data: Record<string, unknown>): GenomeAnnotation[] {
    const features = data.features as Record<string, unknown>[] | undefined;
    if (!Array.isArray(features)) return [];
    const annotations: GenomeAnnotation[] = [];
    features.forEach((f, fIdx) => {
        const fId = String(f.id ?? `feature-${fIdx}`);
        const roles = f.roles as string[] | undefined;
        const subsystems = f.subsystems as string[] | undefined;
        if (Array.isArray(roles)) {
            roles.forEach((role, rIdx) => {
                annotations.push({
                    id: `${fId}-role-${rIdx}`,
                    feature: fId,
                    role,
                    subsystem: Array.isArray(subsystems) ? (subsystems[rIdx] ?? subsystems[0] ?? '') : '',
                });
            });
        } else {
            // Single function/role entry
            const func = String(f.function ?? f.functional_description ?? '');
            if (func) {
                annotations.push({
                    id: `${fId}-anno-${fIdx}`,
                    feature: fId,
                    role: func,
                    subsystem: '',
                });
            }
        }
    });
    return annotations;
}

/* ─── Component ─── */

/**
 * Genome detail page component.
 * 
 * @param params - Promise resolving to workspace path segments
 * @returns JSX containing genome header, tabs, and DataGrid tables
 */
export default function GenomePage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const workspacePath = `/${resolvedParams.path.join('/')}`;
    const genomeName = extractGenomeName(workspacePath);

    const [tabIndex, setTabIndex] = useState(0);
    const [featPagination, setFeatPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [featSort, setFeatSort] = useState<GridSortModel>([]);
    const [annoPagination, setAnnoPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [annoSort, setAnnoSort] = useState<GridSortModel>([]);

    const { data: genomeData, isLoading, error } = useQuery({
        queryKey: ['genomeDetail', workspacePath],
        queryFn: async () => {
            const wsData = await workspaceGet([workspacePath]);
            return parseWorkspaceGetObject<Record<string, unknown>>(wsData);
        },
        staleTime: 5 * 60 * 1000,
    });

    const features = useMemo(
        () => (genomeData ? parseFeatures(genomeData) : []),
        [genomeData],
    );
    const annotations = useMemo(
        () => (genomeData ? parseAnnotations(genomeData) : []),
        [genomeData],
    );

    const featureColumns: GridColDef<GenomeFeature>[] = useMemo(() => [
        { field: 'featureId', headerName: 'Feature ID', width: 200 },
        { field: 'type', headerName: 'Type', width: 120 },
        { field: 'func', headerName: 'Function', width: 400 },
        { field: 'location', headerName: 'Location', width: 260 },
        { field: 'aliases', headerName: 'Aliases', width: 200 },
    ], []);

    const annotationColumns: GridColDef<GenomeAnnotation>[] = useMemo(() => [
        { field: 'feature', headerName: 'Feature', width: 200 },
        { field: 'role', headerName: 'Role', width: 400 },
        { field: 'subsystem', headerName: 'Subsystem', width: 300 },
    ], []);

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                <Typography variant="h4" fontWeight={600}>
                    Genome
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    {genomeName}
                </Typography>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }} />

            {isLoading && (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }} color="text.secondary">Loading genome data…</Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 4 }}>
                    Failed to load genome data: {(error as Error).message}.
                    The workspace may be temporarily unavailable.
                </Alert>
            )}

            {!isLoading && !error && genomeData && (
                <>
                    <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
                        <Tab label={`Features (${features.length})`} />
                        <Tab label={`Annotations (${annotations.length})`} />
                    </Tabs>

                    {tabIndex === 0 && (
                        <DataGrid<GenomeFeature>
                            rows={features}
                            columns={featureColumns}
                            pageSizeOptions={[10, 25, 50, 100]}
                            paginationModel={featPagination}
                            onPaginationModelChange={setFeatPagination}
                            sortModel={featSort}
                            onSortModelChange={setFeatSort}
                            showToolbar
                            slots={{ toolbar: DataControlHeader }}
                            slotProps={{ toolbar: { showQuickFilter: true } }}
                            hideFooter
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                        />
                    )}

                    {tabIndex === 1 && (
                        <DataGrid<GenomeAnnotation>
                            rows={annotations}
                            columns={annotationColumns}
                            pageSizeOptions={[10, 25, 50, 100]}
                            paginationModel={annoPagination}
                            onPaginationModelChange={setAnnoPagination}
                            sortModel={annoSort}
                            onSortModelChange={setAnnoSort}
                            showToolbar
                            slots={{ toolbar: DataControlHeader }}
                            slotProps={{ toolbar: { showQuickFilter: true } }}
                            hideFooter
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                        />
                    )}
                </>
            )}

            {!isLoading && !error && !genomeData && (
                <Alert severity="warning" sx={{ mt: 4 }}>
                    No genome data found at this path. The workspace may not have the genome object available.
                </Alert>
            )}
        </Container>
    );
}
