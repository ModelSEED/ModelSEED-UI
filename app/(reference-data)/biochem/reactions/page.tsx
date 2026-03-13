'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel, GridFilterModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { getReactions, type Reaction, type SolrQueryOpts, EXTERNAL_DBS } from '@/lib/api/biochem';
import ChemicalEquation from '@/components/ui/ChemicalEquation';
import IconButton from '@mui/material/IconButton';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ReactionCommentModal from '@/components/ui/ReactionCommentModal';
import { GridHighlightText } from '@/components/GridHighlightText';
import DataControlHeader from '@/components/layout/DataControlHeader';

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
                    <span key={i}>
                        <strong>{prefix}:</strong>{' '}
                        {values.map((v, j) => (
                            <span key={j}>
                                {baseUrl ? (
                                    <a href={`${baseUrl}${v}`} target="_blank" rel="noopener noreferrer">{v}</a>
                                ) : (
                                    v
                                )}
                                {j < values.length - 1 ? '; ' : ''}
                            </span>
                        ))}
                        <br />
                    </span>
                );
            })}
        </span>
    );
}

function parseSynonyms(aliases?: string[]): string {
    if (!aliases || aliases.length === 0) return 'N/A';
    const last = aliases[aliases.length - 1];
    return last.replace('Name:', '').replace(/"/g, '');
}

function parsePathways(pathways?: string[]): React.ReactNode {
    if (!pathways || pathways.length === 0) return 'N/A';
    return (
        <span style={{ display: 'inline-block', maxWidth: 300 }}>
            {pathways.map((p, i) => {
                const colonIdx = p.indexOf(':');
                if (colonIdx === -1) return <span key={i}>{p}<br /></span>;
                const prefix = p.substring(0, colonIdx).trim();
                const rest = p.substring(colonIdx + 1).replace(/"/g, '').replace(/\|/g, '; ');
                return <span key={i}><strong>{prefix}:</strong> {rest}<br /></span>;
            })}
        </span>
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
    const [search, setSearch] = useState('');

    const handleFilterModelChange = useCallback((newModel: GridFilterModel) => {
        setSearch(newModel.quickFilterValues?.[0] ?? '');
        setFilterModel((prev) => ({ ...prev, items: newModel.items ?? [] }));
    }, []);

    // Modal state
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentReactionId, setCommentReactionId] = useState<string | null>(null);

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
            renderCell: (params) => <ChemicalEquation equation={params.value} />,
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
            width: 130,
            sortable: false,
            renderCell: (params) => <GridHighlightText text={(params.row.ec_numbers ?? []).join('; ')} />,
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
            width: 260,
            sortable: false,
            renderCell: (params) => <GridHighlightText text={parseSynonyms(params.row.aliases)} />,
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
            width: 300,
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

    const queryOpts = useMemo<SolrQueryOpts>(() => ({
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
        sort: sortModel[0]
            ? { field: sortModel[0].field, desc: sortModel[0].sort === 'desc' }
            : { field: 'id' },
        filterModel,
    }), [paginationModel, sortModel, filterModel]);

    const { data, isFetching } = useQuery({
        queryKey: ['reactions', queryOpts],
        queryFn: () => getReactions(queryOpts),
        placeholderData: keepPreviousData,
    });

    const filteredDocs = useMemo(() => {
        if (!search || !data?.docs) return data?.docs ?? [];
        const q = search.toLowerCase();
        return data.docs.filter((doc) =>
            doc.id?.toLowerCase().includes(q) ||
            doc.name?.toLowerCase().includes(q) ||
            doc.definition?.toLowerCase().includes(q) ||
            doc.aliases?.some((a) => a.toLowerCase().includes(q)) ||
            doc.pathways?.some((p) => p.toLowerCase().includes(q))
        );
    }, [data, search]);

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                Reactions
            </Typography>

            <DataGrid<Reaction>
                rows={search ? filteredDocs : (data?.docs ?? [])}
                columns={columns}
                rowCount={search ? filteredDocs.length : (data?.numFound ?? 0)}
                loading={isFetching}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                paginationMode={search ? 'client' : 'server'}
                sortingMode={search ? 'client' : 'server'}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                filterMode={search ? undefined : 'server'}
                filterModel={{
                    ...(search ? { items: [] } : filterModel),
                    quickFilterValues: search ? [search] : [],
                }}
                onFilterModelChange={handleFilterModelChange}
                showToolbar
                slots={{ toolbar: DataControlHeader }}
                slotProps={{
                    toolbar: { showQuickFilter: true },
                }}
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
        </>
    );
}
