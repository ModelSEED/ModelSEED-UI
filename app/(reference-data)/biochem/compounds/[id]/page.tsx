'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Link from 'next/link';
import {
    getCompoundById,
    findReactionsForCompound,
    getCompoundImageUrl,
    EXTERNAL_DBS,
    type Reaction,
    type SolrQueryOpts,
} from '@/lib/api/biochem';
import { formatFormula } from '@/components/utils/formatFormula';
import { formatEquation } from '@/components/utils/formatEquation';

/* ─── Helpers ────────────────────────────────────────────────── */

function AliasDisplay({ aliases, type }: { aliases?: string[]; type: 'cpd' | 'rxn' }) {
    if (!aliases || aliases.length === 0) return <span>N/A</span>;

    return (
        <span>
            {aliases.map((entry, i) => {
                const colonIdx = entry.indexOf(':');
                if (colonIdx === -1) return <span key={i}>{entry}; </span>;

                const prefix = entry.substring(0, colonIdx).trim();
                const values = entry.substring(colonIdx + 1).split(';').map((v) => v.trim()).filter(Boolean);

                let baseUrl = '';
                if (prefix.includes('BiGG'))
                    baseUrl = type === 'cpd' ? EXTERNAL_DBS.BiGG_c : EXTERNAL_DBS.BiGG_r;
                else if (prefix.includes('KEGG'))
                    baseUrl = EXTERNAL_DBS.KEGG;
                else if (prefix.includes('MetaCyc'))
                    baseUrl = type === 'cpd' ? EXTERNAL_DBS.MetaCyc_c : EXTERNAL_DBS.MetaCyc_r;

                return (
                    <span key={i}>
                        <strong>{prefix}:</strong>{' '}
                        {values.map((v, j) => (
                            <span key={j}>
                                {baseUrl ? (
                                    <a href={`${baseUrl}${v}`} target="_blank" rel="noopener noreferrer">{v}</a>
                                ) : v}
                                {j < values.length - 1 ? '; ' : ''}
                            </span>
                        ))}
                        {'; '}
                    </span>
                );
            })}
        </span>
    );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', py: 0.5 }}>
            <Box sx={{ width: '20%', minWidth: 160, flexShrink: 0 }}>
                <strong>{label}</strong>
            </Box>
            <Box sx={{ flex: 1 }}>{children}</Box>
        </Box>
    );
}

/* ─── Related Reactions Columns (cpd_rxnHeader from legacy) ─── */

const rxnColumns: GridColDef<Reaction>[] = [
    {
        field: 'id',
        headerName: 'ID',
        width: 120,
        renderCell: (params) => (
            <Link href={`/biochem/reactions/${params.value}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                {params.value}
            </Link>
        ),
    },
    { field: 'name', headerName: 'Name', width: 200 },
    {
        field: 'definition',
        headerName: 'Equation',
        width: 350,
        sortable: false,
        renderCell: (params) => formatEquation(params.value),
    },
    {
        field: 'is_transport',
        headerName: 'Transport',
        width: 90,
        valueGetter: (_value, row) => (row.is_transport ? 'Yes' : 'No'),
    },
    { field: 'deltag', headerName: 'ΔG', width: 80, type: 'number' },
    { field: 'status', headerName: 'Status', width: 110 },
];

/* ─── Page ───────────────────────────────────────────────────── */

export default function CompoundDetailPage() {
    const { id } = useParams<{ id: string }>();

    // ── Compound data
    const { data: cpd, isLoading: loadingCpd, error } = useQuery({
        queryKey: ['compound', id],
        queryFn: () => getCompoundById(id),
        enabled: !!id,
    });

    // ── Related reactions
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'id', sort: 'asc' }]);

    const rxnOpts = useMemo<SolrQueryOpts>(() => ({
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
        sort: sortModel[0]
            ? { field: sortModel[0].field, desc: sortModel[0].sort === 'desc' }
            : { field: 'id' },
    }), [paginationModel, sortModel]);

    const { data: rxnData, isLoading: loadingRxns } = useQuery({
        queryKey: ['cpd-reactions', id, rxnOpts],
        queryFn: () => findReactionsForCompound(id, rxnOpts),
        enabled: !!id,
    });

    // ── Loading / Error states
    if (loadingCpd) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !cpd) {
        return (
            <Box sx={{ px: 3, py: 4 }}>
                <Typography color="error">Failed to load compound {id}.</Typography>
            </Box>
        );
    }

    // ── Derived display values (matching legacy Compound controller)
    const synonymEntry = cpd.aliases?.find((a) => a.startsWith('Name:'));
    const synonyms = synonymEntry ? synonymEntry.replace('Name:', '').replace(/"/g, '') : 'N/A';
    const aliasesWithoutName = cpd.aliases?.filter((a) => !a.startsWith('Name:')) ?? [];

    const pkaDisplay = cpd.pka?.[0]?.replace(/"/g, '') ?? null;
    const pkbDisplay = cpd.pkb?.[0]?.replace(/"/g, '') ?? null;

    const deltaGDisplay = cpd.deltag === 10000000 ? 'unspecified' : String(cpd.deltag);
    const deltaGerrDisplay = cpd.deltagerr === 10000000 ? 'unspecified' : String(cpd.deltagerr);

    return (
        <Box sx={{ px: 3, py: 2, maxWidth: 1200, mx: 'auto' }}>
            {/* ── Title ── */}
            <Typography variant="h6" sx={{ mb: 1 }}>
                <strong>Compound:</strong>&nbsp;{cpd.id}&nbsp;({cpd.name},&nbsp;{formatFormula(cpd.formula)})
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* ── Two-column layout: image + properties ── */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
                {/* Image */}
                <Box sx={{ width: 220, flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={getCompoundImageUrl(cpd.id)}
                        alt={`Structure of ${cpd.id}`}
                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </Box>

                {/* Properties */}
                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                            <DetailRow label="ΔG:">
                                {deltaGDisplay}±{deltaGerrDisplay}&nbsp;(kcal/mol)
                            </DetailRow>
                            {pkaDisplay && <DetailRow label="pKa:">{pkaDisplay}</DetailRow>}
                            {pkbDisplay && <DetailRow label="pKb:">{pkbDisplay}</DetailRow>}
                            <DetailRow label="Weight:">{cpd.mass}</DetailRow>
                            <DetailRow label="Charge:">{cpd.charge}</DetailRow>
                            {cpd.structure && <DetailRow label="Structure:">{cpd.structure}</DetailRow>}
                            <DetailRow label="InChIKey:">{cpd.inchikey ?? 'N/A'}</DetailRow>
                            <DetailRow label="SMILES:">{cpd.smiles ?? 'N/A'}</DetailRow>
                            <DetailRow label="Is co-factor?:">{cpd.is_cofactor ? 'Yes' : 'No'}</DetailRow>
                            <DetailRow label="Is core?:">{cpd.is_core ? 'Yes' : 'No'}</DetailRow>
                            <DetailRow label="Is obsolete?:">{cpd.is_obsolete === '1' ? 'Yes' : 'No'}</DetailRow>
                            <DetailRow label="Aliases:">
                                <AliasDisplay aliases={aliasesWithoutName} type="cpd" />
                            </DetailRow>
                            <DetailRow label="Synonyms:">{synonyms}</DetailRow>
                            {cpd.ontology && cpd.ontology !== 'class:null|context:null' && (
                                <DetailRow label="Ontology:">{cpd.ontology}</DetailRow>
                            )}
                            <DetailRow label="Source:">{cpd.source ?? 'N/A'}</DetailRow>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* ── Related Reactions Table ── */}
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Found {rxnData?.numFound ?? '...'} reactions for {id}:
            </Typography>

            <DataGrid<Reaction>
                rows={rxnData?.docs ?? []}
                columns={rxnColumns}
                rowCount={rxnData?.numFound ?? 0}
                loading={loadingRxns}
                pageSizeOptions={[10, 25, 50]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                paginationMode="server"
                sortingMode="server"
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                sx={{
                    border: '1px solid #e0e0e0',
                    '& .MuiDataGrid-cell': { py: 1, alignItems: 'flex-start' },
                }}
                autoHeight
            />
        </Box>
    );
}
