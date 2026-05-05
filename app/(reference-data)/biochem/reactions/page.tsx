'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel, GridFilterModel, GridLogicOperator } from '@mui/x-data-grid';
import type { GridCallbackDetails } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import DownloadIcon from '@mui/icons-material/Download';
import Link from 'next/link';
import { getReactions, type Reaction, type SolrQueryOpts, EXTERNAL_DBS } from '@/lib/api/biochem';
import ChemicalEquation from '@/components/ui/ChemicalEquation';
import IconButton from '@mui/material/IconButton';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ReactionCommentModal from '@/components/ui/ReactionCommentModal';
import { GridHighlightText } from '@/components/GridHighlightText';
import DataControlHeader from '@/components/layout/DataControlHeader';
import ExportModal from '@/components/ui/ExportModal';
import TruncatedWithTooltip from '@/components/ui/TruncatedWithTooltip';

/* ─── Alias / external-link helpers ──────────────────────────── */

function parseAliases(aliases?: string[]): React.ReactNode {
    if (!aliases || aliases.length === 0) return 'N/A';

    // Last item is the "Name:" (synonyms) entry — exclude from aliases display
    const aliasEntries = aliases.slice(0, aliases.length - 1);
    if (aliasEntries.length === 0) return 'N/A';

    return (
        <span style={{ display: 'inline-block', maxWidth: 300 }}>
            {aliasEntries.map((entry, i) => {
                const colonIdx = entry.indexOf(':');
                if (colonIdx === -1) return <span key={i}>{entry}<br /></span>;

                const prefix = entry.substring(0, colonIdx).trim();
                const values = entry.substring(colonIdx + 1).split(';').map((v) => v.trim()).filter(Boolean);

                let baseUrl = '';
                if (prefix.includes('BiGG')) baseUrl = EXTERNAL_DBS.BiGG_r;
                else if (prefix.includes('KEGG')) baseUrl = EXTERNAL_DBS.KEGG;
                else if (prefix.includes('MetaCyc')) baseUrl = EXTERNAL_DBS.MetaCyc_r;

                return (
                    <span key={i} style={{ display: 'block', marginBottom: 2 }}>
                        <strong>{prefix}:</strong>{' '}
                        {values.map((v, j) => (
                            <span key={j}>
                                {baseUrl ? (
                                    <a href={`${baseUrl}${v}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00acc1' }}>{v}</a>
                                ) : (
                                    <span style={{ color: '#334155' }}>{v}</span>
                                )}
                                {j < values.length - 1 ? <span style={{ color: '#94a3b8', margin: '0 4px' }}>•</span> : ''}
                            </span>
                        ))}
                        <br />
                    </span>
                );
            })}
        </span>
    );
}

function parseSynonyms(aliases?: string[]): string[] {
    if (!aliases || aliases.length === 0) return [];
    const last = aliases[aliases.length - 1];
    const nameEntry = last.replace('Name:', '').replace(/"/g, '');
    return nameEntry.split(';').map((s) => s.trim()).filter(Boolean);
}

function SynonymsCell({ synonyms }: { synonyms: string[] }) {
    if (synonyms.length === 0) return <span style={{ color: '#999' }}>N/A</span>;
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
            {synonyms.map((syn) => (
                <Chip
                    key={syn}
                    label={syn}
                    size="small"
                    sx={{
                        bgcolor: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                        fontSize: '0.72rem',
                        height: 22,
                    }}
                />
            ))}
        </Box>
    );
}

function parsePathways(pathways?: string[]): React.ReactNode {
    if (!pathways || pathways.length === 0) return 'N/A';
    
    const allPathways: { prefix: string; items: string[] }[] = [];
    pathways.forEach((p) => {
        const colonIdx = p.indexOf(':');
        if (colonIdx === -1) {
            allPathways.push({ prefix: '', items: [p] });
            return;
        }
        const prefix = p.substring(0, colonIdx).trim();
        const rest = p.substring(colonIdx + 1).replace(/"/g, '').replace(/\|/g, ';');
        const items = rest.split(';').map((s) => s.trim()).filter(Boolean);
        allPathways.push({ prefix, items });
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5 }}>
            {allPathways.map((group, i) => (
                <Box key={i} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                    {group.prefix && (
                        <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', mr: 0.5 }}>
                            {group.prefix}:
                        </Box>
                    )}
                    {group.items.map((item) => (
                        <Chip
                            key={item}
                            label={item}
                            size="small"
                            sx={{
                                bgcolor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#475569',
                                fontSize: '0.72rem',
                                height: 22,
                            }}
                        />
                    ))}
                </Box>
            ))}
        </Box>
    );
}

/* ─── Page Component ─────────────────────────────────────────── */

export default function ReactionsPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 25,
    });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'id', sort: 'asc' }]);
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
    // Tracks the authoritative multi-filter items set by our toolbar (bypasses grid truncation).
    const committedFilterItemsRef = useRef<GridFilterModel['items']>([]);
    const committedLogicOperatorRef = useRef<GridFilterModel['logicOperator']>(undefined);

    // When true, the next handleFilterModelChange call came from our toolbar Save
    // (not from a grid-internal Community Edition truncation), so the guard is skipped.
    const toolbarSaveRef = useRef(false);

    const handleFilterModelChange = useCallback((newModel: GridFilterModel, _details?: GridCallbackDetails<'filter'>) => {
        const incoming = newModel.items ?? [];
        const committed = committedFilterItemsRef.current;
        const fromToolbar = toolbarSaveRef.current;
        toolbarSaveRef.current = false;
        // Guard: if the grid fires this with fewer items than our committed state,
        // it's a Community Edition truncation — ignore it (unless clearing to 0).
        // Skip the guard when the toolbar explicitly triggered this (user intentionally removed a filter).
        if (!fromToolbar && incoming.length > 0 && incoming.length < committed.length) {
            return;
        }
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
        setFilterModel({
            items: incoming,
            logicOperator: newModel.logicOperator,
            quickFilterValues: newModel.quickFilterValues ?? [],
            quickFilterLogicOperator: newModel.quickFilterLogicOperator,
        });
        committedFilterItemsRef.current = incoming;
        committedLogicOperatorRef.current = newModel.logicOperator;
    }, []);

    // Wrapper passed via slotProps.toolbar — marks the next call as authoritative.
    const handleToolbarApplyFilterModel = useCallback((model: GridFilterModel) => {
        toolbarSaveRef.current = true;
        handleFilterModelChange(model);
    }, [handleFilterModelChange]);

    // Modal state
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentReactionId, setCommentReactionId] = useState<string | null>(null);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    const exportColumns = useMemo(() => [
        { field: 'id', headerName: 'ID', defaultSelected: true },
        { field: 'name', headerName: 'Name', defaultSelected: true },
        { field: 'definition', headerName: 'Equation', defaultSelected: true },
        { field: 'deltag', headerName: 'ΔG', defaultSelected: true },
        { field: 'reversibility', headerName: 'Reversibility', defaultSelected: false },
        { field: 'status', headerName: 'Status', defaultSelected: true },
        { field: 'ec_numbers', headerName: 'EC Numbers', defaultSelected: false },
        { field: 'pathways', headerName: 'Pathways', defaultSelected: false },
        { field: 'is_transport', headerName: 'Transport', defaultSelected: false },
    ], []);

    const fetchAllRows = useCallback(async (): Promise<Record<string, unknown>[]> => {
        const res = await getReactions({
            limit: 100000,
            offset: 0,
            sort: { field: 'id' },
            filterModel,
        });
        return res.docs.map((doc) => ({
            id: doc.id,
            name: doc.name,
            definition: doc.definition,
            deltag: doc.deltag,
            reversibility: doc.reversibility,
            status: doc.status,
            ec_numbers: doc.ec_numbers?.join('; ') || '',
            pathways: doc.pathways?.join('; ') || '',
            is_transport: doc.is_transport ? 'Yes' : 'No',
        }));
    }, [filterModel]);

    const handleOpenComment = useCallback((id: string) => {
        setCommentReactionId(id);
        setCommentModalOpen(true);
    }, []);

    const columns = useMemo<GridColDef<Reaction>[]>(() => [
        {
            field: 'id',
            headerName: 'ID',
            width: 120,
            renderCell: (params) => (
                <Link href={`/biochem/reactions/${params.value}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                    <GridHighlightText text={params.value as string} />
                </Link>
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 50,
            sortable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <IconButton
                    size="small"
                    title="Comment on this reaction"
                    onClick={() => handleOpenComment(params.row.id)}
                    sx={{ color: '#00acc1' }}
                >
                    <ChatBubbleOutlineIcon fontSize="small" />
                </IconButton>
            )
        },
        {
            field: 'name',
            headerName: 'Name',
            width: 220,
            renderCell: (params) => <GridHighlightText text={params.value as string} />
        },
        {
            field: 'definition',
            headerName: 'Equation',
            width: 350,
            sortable: false,
            renderCell: (params) => (
                <TruncatedWithTooltip text={params.value} maxWidth={330}>
                    <ChemicalEquation equation={params.value} />
                </TruncatedWithTooltip>
            ),
        },
        {
            field: 'is_transport',
            headerName: 'Transport',
            width: 90,
            renderCell: (params) => <GridHighlightText text={params.row.is_transport ? 'Yes' : 'No'} />,
        },
        { field: 'deltag', headerName: 'ΔG', width: 80, type: 'number' },
        {
            field: 'status',
            headerName: 'Status',
            width: 110,
            renderCell: (params) => <GridHighlightText text={params.value as string} />
        },
        {
            field: 'ec_numbers',
            headerName: 'EC Numbers',
            width: 160,
            sortable: false,
            renderCell: (params) => {
                const ecNumbers = params.row.ec_numbers ?? [];
                if (ecNumbers.length === 0) return 'N/A';
                return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                        {ecNumbers.map((ec: string) => (
                            <Chip
                                key={ec}
                                label={ec}
                                size="small"
                                sx={{
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    color: '#475569',
                                    fontSize: '0.72rem',
                                    height: 22,
                                }}
                            />
                        ))}
                    </Box>
                );
            },
        },
        {
            field: 'notes',
            headerName: 'Notes',
            width: 100,
            sortable: false,
            renderCell: (params) => <GridHighlightText text={(params.row.notes ?? []).join(' | ')} />,
        },
        {
            field: 'synonyms',
            headerName: 'Synonyms',
            width: 280,
            sortable: false,
            renderCell: (params) => {
                const synonyms = parseSynonyms(params.row.aliases);
                return (
                    <TruncatedWithTooltip text={synonyms.join('; ')}>
                        <SynonymsCell synonyms={synonyms} />
                    </TruncatedWithTooltip>
                );
            },
        },
        {
            field: 'aliases',
            headerName: 'Aliases',
            width: 320,
            sortable: false,
            renderCell: (params) => parseAliases(params.row.aliases),
        },
        {
            field: 'pathways',
            headerName: 'Pathways',
            width: 280,
            sortable: false,
            renderCell: (params) => parsePathways(params.row.pathways),
        },
        {
            field: 'ontology',
            headerName: 'Ontology',
            width: 200,
            valueGetter: (_value, row) => {
                if (!row.ontology || row.ontology === 'class:null|context:null|step:null') return 'N/A';
                return row.ontology;
            },
        },
    ], [handleOpenComment]);

    const queryOpts = useMemo<SolrQueryOpts>(() => {
        console.debug('[Reactions] queryOpts recomputed. filterModel items:', filterModel.items?.length, JSON.stringify(filterModel));
        return {
            limit: paginationModel.pageSize,
            offset: paginationModel.page * paginationModel.pageSize,
            sort: sortModel[0]
                ? { field: sortModel[0].field, desc: sortModel[0].sort === 'desc' }
                : { field: 'id' },
            filterModel,
        };
    }, [paginationModel, sortModel, filterModel]);

    const { data, isFetching } = useQuery({
        queryKey: ['reactions', queryOpts],
        queryFn: () => getReactions(queryOpts),
        placeholderData: keepPreviousData,
    });

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                <Typography variant="h5" fontWeight={600}>
                    Reactions
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => setExportModalOpen(true)}
                    disabled={!data?.docs?.length}
                >
                    Export CSV
                </Button>
            </Box>

            <DataGrid<Reaction>
                rows={data?.docs ?? []}
                columns={columns}
                rowCount={data?.numFound ?? 0}
                loading={isFetching}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                paginationMode="server"
                sortingMode="server"
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                filterMode="server"
                onFilterModelChange={handleFilterModelChange}
                showToolbar
                slots={{ toolbar: DataControlHeader }}
                slotProps={{ toolbar: { onApplyFilterModel: handleToolbarApplyFilterModel } }}
                getRowId={(row) => row.id}
                getRowHeight={() => 'auto'}
                disableRowSelectionOnClick
                hideFooter
                disableColumnMenu
                sx={{
                    border: '1px solid #e0e0e0',
                    '& .MuiDataGrid-cell': {
                        py: 1,
                        alignItems: 'flex-start',
                    },
                }}
                autoHeight
            />

            <ReactionCommentModal
                open={commentModalOpen}
                onClose={() => setCommentModalOpen(false)}
                reactionId={commentReactionId}
            />

            <ExportModal
                open={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                columns={exportColumns}
                currentData={data?.docs as unknown as Record<string, unknown>[] ?? []}
                allDataFetcher={fetchAllRows}
                totalRows={data?.numFound ?? 0}
                filename="modelseed_reactions.csv"
                columnLabels={{
                    id: 'ID',
                    name: 'Name',
                    definition: 'Equation',
                    deltag: 'ΔG',
                    reversibility: 'Reversibility',
                    status: 'Status',
                    ec_numbers: 'EC Numbers',
                    pathways: 'Pathways',
                    is_transport: 'Transport',
                }}
                activeSearch={filterModel.quickFilterValues?.join(' ') || undefined}
                activeFilter={filterModel.items.length > 0 ? `${filterModel.items.length} column filter(s)` : undefined}
            />
        </>
    );
}
