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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {aliases.map((entry, i) => {
                const colonIdx = entry.indexOf(':');
                if (colonIdx === -1) {
                    return (
                        <Typography key={i} variant="caption" sx={{ color: 'text.secondary' }}>
                            {entry}
                        </Typography>
                    );
                }

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
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 62 }}>
                            {prefix}:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {values.map((v, j) => (
                                <Box
                                    key={`${prefix}-${j}-${v}`}
                                    sx={{
                                        px: 0.75,
                                        py: 0.2,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'background.default',
                                        lineHeight: 1.1,
                                    }}
                                >
                                    {baseUrl ? (
                                        <a
                                            href={`${baseUrl}${v}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none', color: '#1976d2', fontSize: '0.75rem' }}
                                        >
                                            {v}
                                        </a>
                                    ) : (
                                        <Typography variant="caption">{v}</Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                );
            })}
        </Box>
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

const SUBSCRIPT_MAP: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '(': '₍', ')': '₎',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾',
};

function toMappedScript(value: string, map: Record<string, string>): string {
    return value.split('').map((ch) => map[ch] ?? ch).join('');
}

function formatChemicalText(value: string): string {
    if (!value) return value;

    let text = value.trim();

    text = text
        .replace(/<\s*sub\s*>(.*?)<\s*\/\s*sub\s*>/gi, (_, inner: string) => toMappedScript(inner, SUBSCRIPT_MAP))
        .replace(/<\s*sup\s*>(.*?)<\s*\/\s*sup\s*>/gi, (_, inner: string) => toMappedScript(inner, SUPERSCRIPT_MAP))
        .replace(/<[^>]+>/g, '');

    text = text.replace(/([A-Za-z\)\]])(\d+)/g, (_, prev: string, digits: string) => `${prev}${toMappedScript(digits, SUBSCRIPT_MAP)}`);
    text = text.replace(/\((\d*[+-]|[+-]\d*)\)\s*$/g, (_, charge: string) => toMappedScript(charge, SUPERSCRIPT_MAP));
    text = text.replace(/([A-Za-z₀-₉\]\)])(\d*[+-]|[+-]\d*)$/g, (_, stem: string, charge: string) => `${stem}${toMappedScript(charge, SUPERSCRIPT_MAP)}`);

    return text.replace(/\s+/g, ' ').trim();
}

function normalizeSynonyms(rawSynonyms: string[]): string[] {
    const seen = new Set<string>();
    const formatted: string[] = [];

    for (const value of rawSynonyms) {
        const clean = formatChemicalText(value);
        if (!clean) continue;
        const key = clean.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        formatted.push(clean);
    }

    return formatted;
}

function SynonymsDisplay({ synonyms }: { synonyms: string[] }) {
    if (synonyms.length === 0) return <span>N/A</span>;

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {synonyms.map((syn) => (
                <Box
                    key={syn}
                    sx={{
                        px: 0.75,
                        py: 0.25,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'background.default',
                    }}
                >
                    <Typography variant="caption" sx={{ lineHeight: 1.3 }}>
                        {syn}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

function PKaDisplay({ value }: { value: string | null }) {
    if (!value) return <span>N/A</span>;

    const entries = value
        .split(';')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => {
            const [idx1, idx2, pka] = segment.split(':').map((s) => s.trim());
            if (!idx1 || !idx2 || !pka) return null;
            return {
                key: `${idx1}:${idx2}`,
                pka,
            };
        })
        .filter((entry): entry is { key: string; pka: string } => entry !== null);

    if (entries.length === 0) {
        return (
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                {value}
            </Typography>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
            {entries.map((entry) => (
                <Box
                    key={entry.key}
                    sx={{
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.default',
                    }}
                >
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {entry.key} = {entry.pka}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

function ChargeDisplay({ charge }: { charge: number }) {
    const value = Number(charge);
    if (Number.isNaN(value)) return <span>{String(charge)}</span>;
    const sign = value > 0 ? '+' : '';
    return (
        <Box
            sx={{
                display: 'inline-flex',
                px: 0.8,
                py: 0.2,
                borderRadius: 1,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {sign}{value}
            </Typography>
        </Box>
    );
}

function MonospaceValue({ value }: { value?: string | null }) {
    if (!value) return <span>N/A</span>;
    return (
        <Typography
            variant="caption"
            sx={{
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                lineHeight: 1.4,
                px: 0.75,
                py: 0.35,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                display: 'inline-block',
            }}
        >
            {value}
        </Typography>
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
    const synonyms = synonymEntry
        ? normalizeSynonyms(
            synonymEntry
                .replace('Name:', '')
                .replace(/"/g, '')
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean)
        )
        : [];
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
                                <Typography variant="body2">
                                    {deltaGDisplay}
                                    {deltaGerrDisplay !== 'unspecified' ? ` ± ${deltaGerrDisplay}` : ''} kcal/mol
                                </Typography>
                            </DetailRow>
                            {pkaDisplay && (
                                <DetailRow label="pKa:">
                                    <PKaDisplay value={pkaDisplay} />
                                </DetailRow>
                            )}
                            {pkbDisplay && (
                                <DetailRow label="pKb:">
                                    <PKaDisplay value={pkbDisplay} />
                                </DetailRow>
                            )}
                            <DetailRow label="Weight:">
                                <Typography variant="body2">{cpd.mass} Da</Typography>
                            </DetailRow>
                            <DetailRow label="Charge:">
                                <ChargeDisplay charge={cpd.charge} />
                            </DetailRow>
                            {cpd.structure && <DetailRow label="Structure:">{cpd.structure}</DetailRow>}
                            <DetailRow label="InChIKey:">
                                <MonospaceValue value={cpd.inchikey} />
                            </DetailRow>
                            <DetailRow label="SMILES:">
                                <MonospaceValue value={cpd.smiles} />
                            </DetailRow>
                            <DetailRow label="Is co-factor?:">{cpd.is_cofactor ? 'Yes' : 'No'}</DetailRow>
                            <DetailRow label="Is core?:">{cpd.is_core ? 'Yes' : 'No'}</DetailRow>
                            <DetailRow label="Is obsolete?:">{cpd.is_obsolete === '1' ? 'Yes' : 'No'}</DetailRow>
                            <DetailRow label="Aliases:">
                                <AliasDisplay aliases={aliasesWithoutName} type="cpd" />
                            </DetailRow>
                            <DetailRow label="Synonyms:">
                                <SynonymsDisplay synonyms={synonyms} />
                            </DetailRow>
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
