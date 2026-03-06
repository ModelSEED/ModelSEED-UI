'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { getCompounds, type Compound, type SolrQueryOpts, EXTERNAL_DBS } from '@/lib/api/biochem';
import { formatFormula } from '@/components/utils/formatFormula';
import BiochemToolbar from '@/components/BiochemToolbar';
import { GridHighlightText } from '@/components/GridHighlightText';
import { type GridFilterModel } from '@mui/x-data-grid';

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

function parseSynonyms(aliases?: string[]): string {
    if (!aliases || aliases.length === 0) return 'N/A';
    // For compounds, the Name entry is the FIRST alias
    const first = aliases[0];
    return first.replace('Name:', '').replace(/"/g, '');
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
        width: 300,
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
        field: 'ontology',
        headerName: 'Ontology',
        width: 200,
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

    const queryOpts = useMemo<SolrQueryOpts>(() => ({
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
        sort: sortModel[0]
            ? { field: sortModel[0].field, desc: sortModel[0].sort === 'desc' }
            : { field: 'id' },
        filterModel,
    }), [paginationModel, sortModel, filterModel]);

    const { data, isLoading } = useQuery({
        queryKey: ['compounds', queryOpts],
        queryFn: () => getCompounds(queryOpts),
    });

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                Compounds
            </Typography>

            <DataGrid<Compound>
                rows={data?.docs ?? []}
                columns={columns}
                rowCount={data?.numFound ?? 0}
                loading={isLoading}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                paginationMode="server"
                sortingMode="server"
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                filterMode="server"
                filterModel={filterModel}
                onFilterModelChange={setFilterModel}
                showToolbar={true}
                slots={{ toolbar: BiochemToolbar }}
                slotProps={{
                    toolbar: { showQuickFilter: true },
                }}
                getRowId={(row) => row.id}
                getRowHeight={() => 'auto'}
                disableRowSelectionOnClick
                sx={{
                    border: '1px solid #e0e0e0',
                    '& .MuiDataGrid-cell': {
                        py: 1,
                        alignItems: 'flex-start',
                    },
                }}
                autoHeight
            />
        </>
    );
}
