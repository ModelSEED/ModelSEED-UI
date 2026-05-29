/**
 * Gapfill solution detail view.
 * 
 * Displays gapfilling results that identify missing metabolic reactions
 * needed for model completeness. Shows proposed reactions, compounds,
 * and integration status.
 * 
 * @route /gapfill/[...path] - Dynamic gapfill workspace path
 * @param {Promise<{ path: string[] }>} params - Workspace path segments
 */

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
import { workspaceGet, workspaceDownloadUrl, parseWorkspaceGetObject } from '@/lib/api/workspace';
import { USE_MODELSEED_API } from '@/lib/api/config';
import ChemicalEquation from '@/components/ui/ChemicalEquation';
import DataControlHeader, { withQuickSearchHeaders } from '@/components/layout/DataControlHeader';
import { useToolbarGridFiltering } from '@/lib/hooks/useToolbarGridFiltering';

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
    const normalized = normalizeWorkspaceRef(gfPath);

    if (normalized.toLowerCase().endsWith('/gapfilling')) {
        return normalized.slice(0, -('/gapfilling'.length));
    }
    if (normalized.toLowerCase().endsWith('/gapfill')) {
        return normalized.slice(0, -('/gapfill'.length));
    }

    // Legacy paths: /<user>/models/<Model>/gapfilling/gf.0
    const gfIdx = normalized.toLowerCase().lastIndexOf('/gapfilling/');
    if (gfIdx > 0) return normalized.substring(0, gfIdx);
    // Also try /gapfill/ segment pattern
    const gfIdx2 = normalized.toLowerCase().lastIndexOf('/gapfill/');
    if (gfIdx2 > 0) return normalized.substring(0, gfIdx2);
    const segments = gfPath.split('/').filter(Boolean);
    if (segments.length >= 3) return '/' + segments.slice(0, -2).join('/');
    return normalized;
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

function normalizeWorkspaceRef(value: string): string {
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? value as T[] : [];
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function parseReactionRecords(raw: unknown): Record<string, unknown>[] {
    const reactions = asArray<unknown>(raw);
    const normalized: Record<string, unknown>[] = [];

    for (const item of reactions) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            normalized.push(item as Record<string, unknown>);
            continue;
        }

        if (Array.isArray(item) && item.length > 0) {
            const tupleRecord = asRecord(item[item.length - 1]);
            if (Object.keys(tupleRecord).length > 0) {
                normalized.push(tupleRecord);
            }
        }
    }

    return normalized;
}

function parseGapfillSolutions(gfData: Record<string, unknown>): Record<string, unknown>[] {
    return asArray<Record<string, unknown>>(
        gfData.gapfillingSolutions
        ?? gfData.gapfilling_solutions
        ?? gfData.solutions
        ?? gfData.gapfill_solutions,
    );
}

function extractDownloadUrl(payload: unknown): string | null {
    if (Array.isArray(payload)) {
        for (const entry of payload) {
            if (typeof entry === 'string' && entry.startsWith('http')) return entry;
        }
    }
    if (payload && typeof payload === 'object') {
        const rec = payload as Record<string, unknown>;
        if (typeof rec.url === 'string' && rec.url.startsWith('http')) return rec.url;
    }
    return null;
}

async function downloadWorkspaceObjectJson(objectRef: string): Promise<Record<string, unknown> | null> {
    try {
        const downloadPayload = await workspaceDownloadUrl({ objects: [objectRef] }) as unknown;
        const downloadUrl = extractDownloadUrl(downloadPayload);
        if (!downloadUrl) return null;

        const response = await fetch(downloadUrl, { method: 'GET' });
        if (!response.ok) return null;

        const text = await response.text();
        if (!text) return null;
        const parsed = JSON.parse(text) as unknown;
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
    } catch {
        return null;
    }
}

function parseGapfillReactions(gfData: Record<string, unknown>): GapfillReaction[] {
    // Gapfill data shape varies: may have `gapfillingSolutions` or `reactions` array
    const solutions = parseGapfillSolutions(gfData);
    const reactions: GapfillReaction[] = [];

    if (solutions.length > 0) {
        solutions.forEach((sol, solIdx) => {
            const rxns = parseReactionRecords(
                sol.gapfillingSolutionReactions
                ?? sol.gapfilling_solution_reactions
                ?? sol.solution_reactions
                ?? sol.reactions,
            );
            if (rxns.length === 0) return;
            rxns.forEach((r, rxnIdx) => {
                const rxnRef = String(r.reaction_ref ?? r.modelreaction_ref ?? '');
                const rxnId = String(r.reaction ?? r.id ?? rxnRef.split('/').pop() ?? `rxn-${solIdx}-${rxnIdx}`);
                reactions.push({
                    id: `${solIdx}-${rxnIdx}-${rxnId}`,
                    reaction: rxnId,
                    name: String(r.name ?? rxnId),
                    direction: String(r.direction ?? r.directionality ?? '>'),
                    compartment: String(r.compartment_ref ?? r.compartment ?? '').split('/').pop() ?? '',
                    equation: r.equation ? String(r.equation) : undefined,
                });
            });
        });
    }

    // Direct reactions array fallback
    if (reactions.length === 0) {
        const directRxns = parseReactionRecords(
            gfData.reactions
            ?? gfData.gapfill_reactions
            ?? gfData.gapfillingSolutionReactions
            ?? gfData.solution_reactions,
        );
        if (directRxns.length > 0) {
            directRxns.forEach((r, idx) => {
                const rxnRef = String(r.reaction_ref ?? r.modelreaction_ref ?? '');
                const rxnId = String(r.reaction ?? r.id ?? rxnRef.split('/').pop() ?? `rxn-${idx}`);
                reactions.push({
                    id: `direct-${idx}-${rxnId}`,
                    reaction: rxnId,
                    name: String(r.name ?? rxnId),
                    direction: String(r.direction ?? r.directionality ?? '>'),
                    compartment: String(r.compartment_ref ?? r.compartment ?? '').split('/').pop() ?? '',
                    equation: r.equation ? String(r.equation) : undefined,
                });
            });
        }
    }

    return reactions;
}

/* ─── Component ─── */

/**
 * Gapfill detail page component with solution reactions.
 * 
 * @param params - Promise resolving to workspace path segments
 * @returns JSX containing gapfill solution with reaction table
 */
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
                        const targetRef = normalizeWorkspaceRef(workspacePath);
                        // Find the specific gapfill matching our name
                        const match = allGapfills.find(
                            (gf) => {
                                const record = gf as Record<string, unknown>;
                                const gfId = String(record.id ?? record.name ?? '').toLowerCase();
                                const gfRef = normalizeWorkspaceRef(String(record.ref ?? record.path ?? ''));
                                return gfRef === targetRef
                                    || gfRef.endsWith(`/${gfName}`)
                                    || gfId === gfName.toLowerCase();
                            },
                        );

                        if (match) {
                            const matchRecord = match as Record<string, unknown>;
                            const parsedMatch = parseGapfillReactions(matchRecord);
                            if (parsedMatch.length > 0) {
                                return parsedMatch;
                            }

                            const nestedRef = normalizeWorkspaceRef(String(matchRecord.ref ?? matchRecord.path ?? ''));
                            if (nestedRef) {
                                try {
                                    const nestedPayload = await workspaceGet([nestedRef]);
                                    const nestedObject = parseWorkspaceGetObject<unknown>(nestedPayload);
                                    if (nestedObject && typeof nestedObject === 'object') {
                                        const nestedReactions = parseGapfillReactions(nestedObject as Record<string, unknown>);
                                        if (nestedReactions.length > 0) {
                                            return nestedReactions;
                                        }
                                    }
                                } catch {
                                    // Fall through to workspace direct fetch.
                                }

                                const downloaded = await downloadWorkspaceObjectJson(nestedRef);
                                if (downloaded) {
                                    const nestedReactions = parseGapfillReactions(downloaded);
                                    if (nestedReactions.length > 0) {
                                        return nestedReactions;
                                    }
                                }
                            }
                        }

                        // If no specific match, try first one
                        if (allGapfills.length > 0) {
                            const first = allGapfills[0] as Record<string, unknown>;
                            const firstParsed = parseGapfillReactions(first);
                            if (firstParsed.length > 0) {
                                return firstParsed;
                            }
                        }
                    }
                } catch { /* fall through */ }
            }
            // Fallback: workspace get
            try {
                const wsData = await workspaceGet([workspacePath]);
                const parsed = parseWorkspaceGetObject<unknown>(wsData);
                if (parsed && typeof parsed === 'object') {
                    return parseGapfillReactions(parsed as Record<string, unknown>);
                }
            } catch { /* handled below */ }

            const downloaded = await downloadWorkspaceObjectJson(workspacePath);
            if (downloaded) {
                return parseGapfillReactions(downloaded);
            }

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
        {
            field: 'equation',
            headerName: 'Equation',
            flex: 1,
            minWidth: 280,
            sortable: false,
            renderCell: (params) => <ChemicalEquation equation={params.value} />,
        },
        { field: 'direction', headerName: 'Direction', width: 120 },
        { field: 'compartment', headerName: 'Compartment', width: 140 },
    ], []);

    const {
        filterModel,
        filteredRows,
        handleFilterModelChange,
        handleToolbarApplyFilterModel,
    } = useToolbarGridFiltering<GapfillReaction>({
        rows: (gfReactions ?? []) as GapfillReaction[],
        onFilterApplied: () => setPagination((p) => ({ ...p, page: 0 })),
    });

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
                    rows={filteredRows}
                    columns={withQuickSearchHeaders(columns)}
                    pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={pagination}
                    onPaginationModelChange={setPagination}
                    sortModel={sortModel}
                    onSortModelChange={setSortModel}
                    filterModel={filterModel}
                    filterMode="server"
                    onFilterModelChange={handleFilterModelChange}
                    showToolbar
                    slots={{ toolbar: DataControlHeader }}
                    slotProps={{
                        toolbar: {
                            showQuickFilter: true,
                            onApplyFilterModel: handleToolbarApplyFilterModel,
                        },
                    }}
                    hideFooter
                    disableRowSelectionOnClick
                    getRowId={(row) => row.id}
                    sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                />
            )}
        </Container>
    );
}
