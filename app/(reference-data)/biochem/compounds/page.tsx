'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel, GridFilterModel } from '@mui/x-data-grid';
import type { GridCallbackDetails } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import Link from 'next/link';
import { getCompounds, type Compound, type SolrQueryOpts, EXTERNAL_DBS } from '@/lib/api/biochem';
import { formatFormula } from '@/components/utils/formatFormula';
import { GridHighlightText } from '@/components/GridHighlightText';
import DataControlHeader from '@/components/layout/DataControlHeader';
import ExportModal from '@/components/ui/ExportModal';
import Chip from '@mui/material/Chip';

/* ─── Alias / formatting helpers ─────────────────────────────── */

function parseAliases(aliases?: string[]): React.ReactNode {
    if (!aliases || aliases.length === 0) return 'N/A';

    // First item is the "Name:" (synonyms) entry in compounds — exclude from aliases display
    const aliasEntries = aliases.slice(1);
    if (aliasEntries.length === 0) return 'N/A';

    return (
        <span style={{ display: 'inline-block', maxWidth: 300 }}>
            {aliasEntries.map((entry, i) => {
                const colonIdx = entry.indexOf(':');
                if (colonIdx === -1) return <span key={i}>{entry}<br /></span>;

                const prefix = entry.substring(0, colonIdx).trim();
                const values = entry.substring(colonIdx + 1).split(';').map((v) => v.trim()).filter(Boolean);

                let baseUrl = '';
                if (prefix.includes('BiGG')) baseUrl = EXTERNAL_DBS.BiGG_c;
                else if (prefix.includes('KEGG')) baseUrl = EXTERNAL_DBS.KEGG;
                else if (prefix.includes('MetaCyc')) baseUrl = EXTERNAL_DBS.MetaCyc_c;

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

function parseSynonyms(aliases?: string[]): string[] {
    if (!aliases || aliases.length === 0) return [];
    // For compounds, the Name entry is the FIRST alias
    const first = aliases[0];
    const nameEntry = first.replace('Name:', '').replace(/"/g, '');
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

/* ─── Columns ────────────────────────────────────────────────── */

const columns: GridColDef<Compound>[] = [
    {
        field: 'id',
        headerName: 'ID',
        width: 120,
        renderCell: (params) => (
            <Link href={`/biochem/compounds/${params.value}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                <GridHighlightText text={params.value as string} />
            </Link>
        ),
    },
    {
        field: 'name',
        headerName: 'Name',
        width: 220,
        renderCell: (params) => <GridHighlightText text={params.value as string} />
    },
    {
        field: 'formula',
        headerName: 'Formula',
        width: 140,
        renderCell: (params) => formatFormula(params.value)
    },
    { field: 'mass', headerName: 'Mass', width: 100, type: 'number' },
    { field: 'charge', headerName: 'Charge', width: 80, type: 'number' },
    {
        field: 'synonyms',
        headerName: 'Synonyms',
        width: 280,
        sortable: false,
        renderCell: (params) => <SynonymsCell synonyms={parseSynonyms(params.row.aliases)} />,
    },
    {
        field: 'aliases',
        headerName: 'Aliases',
        width: 320,
        sortable: false,
        renderCell: (params) => parseAliases(params.row.aliases),
    },
    {
        field: 'ontology',
        headerName: 'Ontology',
        width: 200,
        sortable: false,
        /** Solr compounds_staging has no ontology field — server filters cannot target it */
        filterable: false,
        valueGetter: (_value, row) => {
            if (!row.ontology || row.ontology === 'class:null|context:null') return 'N/A';
            return row.ontology;
        },
    },
];

/* ─── Page Component ─────────────────────────────────────────── */

export default function CompoundsPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 25,
    });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'id', sort: 'asc' }]);
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
    // Tracks the authoritative multi-filter items set by our toolbar (bypasses grid truncation).
    const committedFilterItemsRef = useRef<GridFilterModel['items']>([]);
    const committedLogicOperatorRef = useRef<GridFilterModel['logicOperator']>(undefined);
    const [exportModalOpen, setExportModalOpen] = useState(false);

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

    const queryOpts = useMemo<SolrQueryOpts>(() => ({
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
        sort: sortModel[0]
            ? { field: sortModel[0].field, desc: sortModel[0].sort === 'desc' }
            : { field: 'id' },
        filterModel,
    }), [paginationModel, sortModel, filterModel]);

    const { data, isFetching } = useQuery({
        queryKey: ['compounds', queryOpts],
        queryFn: () => getCompounds(queryOpts),
        placeholderData: keepPreviousData,
    });

    const exportColumns = useMemo(() => [
        { field: 'id', headerName: 'ID', defaultSelected: true },
        { field: 'name', headerName: 'Name', defaultSelected: true },
        { field: 'formula', headerName: 'Formula', defaultSelected: true },
        { field: 'mass', headerName: 'Mass', defaultSelected: true },
        { field: 'charge', headerName: 'Charge', defaultSelected: false },
        { field: 'deltag', headerName: 'ΔG', defaultSelected: false },
        { field: 'synonyms', headerName: 'Synonyms', defaultSelected: false },
        { field: 'aliases', headerName: 'Aliases', defaultSelected: false },
    ], []);

    const fetchAllRows = useCallback(async (): Promise<Record<string, unknown>[]> => {
        const res = await getCompounds({
            limit: 100000,
            offset: 0,
            sort: { field: 'id' },
            filterModel,
        });
        return res.docs.map((doc) => ({
            id: doc.id,
            name: doc.name,
            formula: doc.formula,
            mass: doc.mass,
            charge: doc.charge,
            deltag: doc.deltag,
            synonyms: parseSynonyms(doc.aliases).join('; '),
            aliases: doc.aliases?.slice(1).join('; ') || '',
        }));
    }, [filterModel]);

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                <Typography variant="h5" fontWeight={600}>
                    Compounds
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

            <DataGrid<Compound>
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

            <ExportModal
                open={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                columns={exportColumns}
                currentData={data?.docs as unknown as Record<string, unknown>[] ?? []}
                allDataFetcher={fetchAllRows}
                totalRows={data?.numFound ?? 0}
                filename="modelseed_compounds.csv"
                columnLabels={{
                    id: 'ID',
                    name: 'Name',
                    formula: 'Formula',
                    mass: 'Mass',
                    charge: 'Charge',
                    deltag: 'ΔG',
                    synonyms: 'Synonyms',
                    aliases: 'Aliases',
                }}
                activeSearch={filterModel.quickFilterValues?.join(' ') || undefined}
                activeFilter={filterModel.items.length > 0 ? `${filterModel.items.length} column filter(s)` : undefined}
            />
        </>
    );
}
