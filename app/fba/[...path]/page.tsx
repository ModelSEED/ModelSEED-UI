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
import Link from 'next/link';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { getModelFbaFromApi } from '@/lib/api/modelseed';
import { workspaceGet, parseWorkspaceGetObject } from '@/lib/api/workspace';
import { USE_MODELSEED_API } from '@/lib/api/config';
import DataControlHeader from '@/components/layout/DataControlHeader';
import ChemicalEquation from '@/components/ui/ChemicalEquation';

/* ---------- types ---------- */

interface FbaReactionFlux {
    id: string;
    reaction: string;
    name: string;
    flux: number;
    min: number;
    max: number;
    class: string;
    equation?: string;
}

interface FbaExchangeFlux {
    id: string;
    compound: string;
    name: string;
    flux: number;
    min: number;
    max: number;
    class: string;
}

/* ---------- helpers ---------- */

function extractModelRef(fbaPath: string): string {
    // Legacy FBA paths are like /<user>/models/<Model>/fba/gf.0
    // The model ref is everything up to /fba/
    const fbaIdx = fbaPath.lastIndexOf('/fba/');
    if (fbaIdx > 0) return fbaPath.substring(0, fbaIdx);
    // Fallback: strip last two segments
    const segments = fbaPath.split('/').filter(Boolean);
    if (segments.length >= 3) return '/' + segments.slice(0, -2).join('/');
    return fbaPath;
}

function extractFbaName(fbaPath: string): string {
    const parts = fbaPath.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'FBA';
}

function extractModelName(fbaPath: string): string {
    const modelRef = extractModelRef(fbaPath);
    const parts = modelRef.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'Model';
}

function parseReactionFluxes(data: Record<string, unknown>): FbaReactionFlux[] {
    const vars = data.FBAReactionVariables as Record<string, unknown>[] | undefined;
    if (!Array.isArray(vars)) return [];
    return vars.map((v, idx) => {
        const rxnRef = String(v.modelreaction_ref ?? v.reaction_ref ?? '');
        const rxnId = rxnRef.split('/').pop() ?? `rxn-${idx}`;
        return {
            id: rxnId + '-' + idx,
            reaction: rxnId,
            name: String(v.name ?? rxnId),
            flux: Number(v.value ?? v.flux ?? 0),
            min: Number(v.lowerBound ?? v.min ?? 0),
            max: Number(v.upperBound ?? v.max ?? 0),
            class: String(v.class ?? v.variableType ?? ''),
            equation: v.equation ? String(v.equation) : undefined,
        };
    });
}

function parseExchangeFluxes(data: Record<string, unknown>): FbaExchangeFlux[] {
    const vars = data.FBACompoundVariables as Record<string, unknown>[] | undefined;
    if (!Array.isArray(vars)) return [];
    return vars.map((v, idx) => {
        const cpdRef = String(v.modelcompound_ref ?? v.compound_ref ?? '');
        const cpdId = cpdRef.split('/').pop() ?? `cpd-${idx}`;
        return {
            id: cpdId + '-' + idx,
            compound: cpdId,
            name: String(v.name ?? cpdId),
            flux: Number(v.value ?? v.flux ?? 0),
            min: Number(v.lowerBound ?? v.min ?? 0),
            max: Number(v.upperBound ?? v.max ?? 0),
            class: String(v.class ?? v.variableType ?? ''),
        };
    });
}

/* ---------- component ---------- */

export default function FbaPage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const workspacePath = `/${resolvedParams.path.join('/')}`;
    const modelRef = extractModelRef(workspacePath);
    const fbaName = extractFbaName(workspacePath);
    const modelName = extractModelName(workspacePath);

    const [tabIndex, setTabIndex] = useState(0);
    const [rxnPagination, setRxnPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [rxnSort, setRxnSort] = useState<GridSortModel>([]);
    const [exchPagination, setExchPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [exchSort, setExchSort] = useState<GridSortModel>([]);

    const { data: fbaData, isLoading, error } = useQuery({
        queryKey: ['fbaDetail', workspacePath, modelRef],
        queryFn: async () => {
            // Try model-level FBA from API first
            if (USE_MODELSEED_API) {
                try {
                    const result = await getModelFbaFromApi(modelRef);
                    if (result && typeof result === 'object') return result;
                } catch { /* fall through to workspace */ }
            }
            // Fallback: fetch FBA object directly from workspace
            try {
                const wsData = await workspaceGet([workspacePath]);
                const parsed = parseWorkspaceGetObject<Record<string, unknown>>(wsData);
                if (parsed) return parsed;
            } catch { /* handled in error state */ }
            return null;
        },
        staleTime: 5 * 60 * 1000,
    });

    const rxnFluxes = useMemo(
        () => (fbaData ? parseReactionFluxes(fbaData as Record<string, unknown>) : []),
        [fbaData],
    );
    const exchFluxes = useMemo(
        () => (fbaData ? parseExchangeFluxes(fbaData as Record<string, unknown>) : []),
        [fbaData],
    );

    const rxnColumns: GridColDef<FbaReactionFlux>[] = useMemo(() => [
        {
            field: 'reaction',
            headerName: 'Reaction',
            width: 160,
            renderCell: (p) => {
                const baseId = p.row.reaction.replace(/_[a-z]\d*$/, '');
                return (
                    <Link href={`/biochem/reactions/${baseId}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                        {p.row.reaction}
                    </Link>
                );
            },
        },
        { field: 'name', headerName: 'Name', width: 240 },
        { field: 'flux', headerName: 'Flux', width: 120, type: 'number' },
        { field: 'min', headerName: 'Min', width: 100, type: 'number' },
        { field: 'max', headerName: 'Max', width: 100, type: 'number' },
        { field: 'class', headerName: 'Class', width: 140 },
    ], []);

    const exchColumns: GridColDef<FbaExchangeFlux>[] = useMemo(() => [
        {
            field: 'compound',
            headerName: 'Compound',
            width: 160,
            renderCell: (p) => {
                const baseId = p.row.compound.replace(/_[a-z]\d*$/, '');
                return (
                    <Link href={`/biochem/compounds/${baseId}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                        {p.row.compound}
                    </Link>
                );
            },
        },
        { field: 'name', headerName: 'Name', width: 240 },
        { field: 'flux', headerName: 'Flux', width: 120, type: 'number' },
        { field: 'min', headerName: 'Min', width: 100, type: 'number' },
        { field: 'max', headerName: 'Max', width: 100, type: 'number' },
        { field: 'class', headerName: 'Class', width: 140 },
    ], []);

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Breadcrumb */}
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                <Link href="/my-models" style={{ color: '#00acc1', textDecoration: 'none' }}>My Models</Link>
                {' > '}
                <Link href={`/model${modelRef}`} style={{ color: '#00acc1', textDecoration: 'none' }}>{modelName}</Link>
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                <Typography variant="h4" fontWeight={600}>
                    {fbaName}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    (for {modelName})
                </Typography>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }} />

            {isLoading && (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }} color="text.secondary">Loading FBA data…</Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 4 }}>
                    Failed to load FBA data: {(error as Error).message}
                </Alert>
            )}

            {!isLoading && !error && !fbaData && (
                <Alert severity="warning" sx={{ mt: 4 }}>
                    No FBA data found for this reference. The backend may not have the data available yet.
                </Alert>
            )}

            {fbaData && (
                <>
                    <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
                        <Tab label={`Reaction Fluxes (${rxnFluxes.length})`} />
                        <Tab label={`Exchange Fluxes (${exchFluxes.length})`} />
                    </Tabs>

                    {tabIndex === 0 && (
                        <DataGrid<FbaReactionFlux>
                            rows={rxnFluxes}
                            columns={rxnColumns}
                            pageSizeOptions={[10, 25, 50, 100]}
                            paginationModel={rxnPagination}
                            onPaginationModelChange={setRxnPagination}
                            sortModel={rxnSort}
                            onSortModelChange={setRxnSort}
                            showToolbar
                            slots={{ toolbar: DataControlHeader }}
                            slotProps={{ toolbar: { showQuickFilter: true } }}
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                        />
                    )}

                    {tabIndex === 1 && (
                        <DataGrid<FbaExchangeFlux>
                            rows={exchFluxes}
                            columns={exchColumns}
                            pageSizeOptions={[10, 25, 50, 100]}
                            paginationModel={exchPagination}
                            onPaginationModelChange={setExchPagination}
                            sortModel={exchSort}
                            onSortModelChange={setExchSort}
                            showToolbar
                            slots={{ toolbar: DataControlHeader }}
                            slotProps={{ toolbar: { showQuickFilter: true } }}
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                        />
                    )}
                </>
            )}
        </Container>
    );
}
