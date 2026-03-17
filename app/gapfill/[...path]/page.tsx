'use client';

import { use, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Link from 'next/link';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { listModelGapfillsFromApi } from '@/lib/api/modelseed';
import { workspaceGet, parseWorkspaceGetObject } from '@/lib/api/workspace';
import { USE_MODELSEED_API } from '@/lib/api/config';
import DataControlHeader from '@/components/layout/DataControlHeader';

/* ---------- types ---------- */

interface GapfillReaction {
    id: string;
    reaction: string;
    name: string;
    direction: string;
    compartment: string;
    equation?: string;
}

/* ---------- helpers ---------- */

function extractModelRef(gfPath: string): string {
    // Legacy paths: /<user>/models/<Model>/gapfilling/gf.0
    const gfIdx = gfPath.lastIndexOf('/gapfilling/');
    if (gfIdx > 0) return gfPath.substring(0, gfIdx);
    // Also try /gapfill/ segment pattern
    const gfIdx2 = gfPath.lastIndexOf('/gapfill/');
    if (gfIdx2 > 0) return gfPath.substring(0, gfIdx2);
    const segments = gfPath.split('/').filter(Boolean);
    if (segments.length >= 3) return '/' + segments.slice(0, -2).join('/');
    return gfPath;
}

function extractGapfillName(gfPath: string): string {
    const parts = gfPath.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'Gapfill';
}

function extractModelName(gfPath: string): string {
    const modelRef = extractModelRef(gfPath);
    const parts = modelRef.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'Model';
}

function parseGapfillReactions(gfData: Record<string, unknown>): GapfillReaction[] {
    // Gapfill data shape varies: may have `gapfillingSolutions` or `reactions` array
    const solutions = gfData.gapfillingSolutions as Record<string, unknown>[] | undefined;
    const reactions: GapfillReaction[] = [];

    if (Array.isArray(solutions)) {
        solutions.forEach((sol, solIdx) => {
            const rxns = sol.gapfillingSolutionReactions as Record<string, unknown>[] | undefined;
            if (!Array.isArray(rxns)) return;
            rxns.forEach((r, rxnIdx) => {
                const rxnRef = String(r.reaction_ref ?? r.modelreaction_ref ?? '');
                const rxnId = rxnRef.split('/').pop() ?? `rxn-${solIdx}-${rxnIdx}`;
                reactions.push({
                    id: `${solIdx}-${rxnIdx}-${rxnId}`,
                    reaction: rxnId,
                    name: String(r.name ?? rxnId),
                    direction: String(r.direction ?? r.directionality ?? '>'),
                    compartment: String(r.compartment_ref ?? '').split('/').pop() ?? '',
                    equation: r.equation ? String(r.equation) : undefined,
                });
            });
        });
    }

    // Direct reactions array fallback
    if (reactions.length === 0) {
        const directRxns = gfData.reactions as Record<string, unknown>[] | undefined;
        if (Array.isArray(directRxns)) {
            directRxns.forEach((r, idx) => {
                const rxnId = String(r.reaction ?? r.id ?? `rxn-${idx}`);
                reactions.push({
                    id: `direct-${idx}-${rxnId}`,
                    reaction: rxnId,
                    name: String(r.name ?? rxnId),
                    direction: String(r.direction ?? '>'),
                    compartment: String(r.compartment ?? ''),
                });
            });
        }
    }

    return reactions;
}

/* ---------- component ---------- */

export default function GapfillPage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const workspacePath = `/${resolvedParams.path.join('/')}`;
    const modelRef = extractModelRef(workspacePath);
    const gfName = extractGapfillName(workspacePath);
    const modelName = extractModelName(workspacePath);

    const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([]);

    const { data: gfReactions, isLoading, error } = useQuery({
        queryKey: ['gapfillDetail', workspacePath, modelRef],
        queryFn: async () => {
            // Try API gapfills list first
            if (USE_MODELSEED_API) {
                try {
                    const allGapfills = await listModelGapfillsFromApi(modelRef);
                    if (Array.isArray(allGapfills)) {
                        // Find the specific gapfill matching our name
                        const match = allGapfills.find(
                            (gf) => {
                                const gfRef = String((gf as Record<string, unknown>).id ?? (gf as Record<string, unknown>).ref ?? '');
                                return gfRef === gfName || gfRef.endsWith('/' + gfName);
                            },
                        );
                        if (match) return parseGapfillReactions(match as Record<string, unknown>);
                        // If no specific match, try first one
                        if (allGapfills.length > 0) {
                            return parseGapfillReactions(allGapfills[0] as Record<string, unknown>);
                        }
                    }
                } catch { /* fall through */ }
            }
            // Fallback: workspace get
            try {
                const wsData = await workspaceGet([workspacePath]);
                const parsed = parseWorkspaceGetObject<Record<string, unknown>>(wsData);
                if (parsed) return parseGapfillReactions(parsed);
            } catch { /* handled below */ }
            return [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const columns: GridColDef<GapfillReaction>[] = useMemo(() => [
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
        { field: 'name', headerName: 'Name', width: 280 },
        { field: 'direction', headerName: 'Direction', width: 120 },
        { field: 'compartment', headerName: 'Compartment', width: 140 },
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
                    {gfName}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    (for {modelName})
                </Typography>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }} />

            {isLoading && (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }} color="text.secondary">Loading gapfill data…</Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 4 }}>
                    Failed to load gapfill data: {(error as Error).message}
                </Alert>
            )}

            {!isLoading && !error && gfReactions && gfReactions.length === 0 && (
                <Alert severity="info" sx={{ mt: 4 }}>
                    No gapfill reactions found for this reference. The gapfill solution may be empty or the data is not yet available.
                </Alert>
            )}

            {gfReactions && gfReactions.length > 0 && (
                <DataGrid<GapfillReaction>
                    rows={gfReactions}
                    columns={columns}
                    pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={pagination}
                    onPaginationModelChange={setPagination}
                    sortModel={sortModel}
                    onSortModelChange={setSortModel}
                    showToolbar
                    slots={{ toolbar: DataControlHeader }}
                    slotProps={{ toolbar: { showQuickFilter: true } }}
                    disableRowSelectionOnClick
                    getRowId={(row) => row.id}
                    sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                />
            )}
        </Container>
    );
}
