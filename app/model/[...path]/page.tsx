'use client';

import { use, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Chip from '@mui/material/Chip';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { parseWorkspaceGetObject, workspaceGet } from '@/lib/api/workspace';
import { USE_MODELSEED_API, USE_NEW_PROXY } from '@/lib/api/config';
import {
    editModelFromApi,
    getModelDetailBundleFromApi,
    getModelFbaFromApi,
    listModelEditsFromApi,
    listModelGapfillsFromApi,
    submitFbaJobFromApi,
    submitGapfillJobFromApi,
} from '@/lib/api/modelseed';
import { extractTrackedJobId, trackJob } from '@/lib/api/jobTracker';
import ModelDetailHeader from '@/components/ui/ModelDetailHeader';
import DownloadModelMenu from '@/components/ui/DownloadModelMenu';
import DataControlHeader from '@/components/layout/DataControlHeader';
import ChemicalEquation from '@/components/ui/ChemicalEquation';
import { formatFormula } from '@/components/utils/formatFormula';

type TabKey =
    | 'overview'
    | 'reactions'
    | 'compounds'
    | 'genes'
    | 'compartments'
    | 'biomass'
    | 'pathways'
    | 'edits';

interface TabConfig {
    key: TabKey;
    label: string;
    searchPlaceholder: string;
}

interface DataTableConfig {
    columns: GridColDef<Record<string, unknown>>[];
    rows: Record<string, unknown>[];
}

const MODEL_TABS: TabConfig[] = [
    { key: 'overview', label: 'Overview', searchPlaceholder: 'Search model overview...' },
    { key: 'reactions', label: 'Reactions', searchPlaceholder: 'Search reactions...' },
    { key: 'compounds', label: 'Compounds', searchPlaceholder: 'Search compounds...' },
    { key: 'genes', label: 'Genes', searchPlaceholder: 'Search genes...' },
    { key: 'compartments', label: 'Compartments', searchPlaceholder: 'Search compartments...' },
    { key: 'biomass', label: 'Biomass', searchPlaceholder: 'Search biomass...' },
    { key: 'pathways', label: 'Pathways', searchPlaceholder: 'Search pathways...' },
    { key: 'edits', label: 'Edit Model', searchPlaceholder: 'Search edits...' },
];

function isTabKey(value: string | undefined): value is TabKey {
    return MODEL_TABS.some((tab) => tab.key === value);
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function extractRefId(ref: unknown): string {
    if (typeof ref !== 'string') return '';
    const pieces = ref.split('/');
    return pieces[pieces.length - 1] || ref;
}

function normalizeBiochemReactionId(value: unknown): string {
    const raw = String(value ?? '');
    const match = raw.match(/rxn\d{5}/);
    return match?.[0] ?? '';
}

function normalizeBiochemCompoundId(value: unknown): string {
    const raw = String(value ?? '');
    const match = raw.match(/cpd\d{5}/);
    return match?.[0] ?? '';
}

function toEncodedCatchallHref(prefix: string, workspaceRef: string): string {
    const clean = workspaceRef.startsWith('/') ? workspaceRef.slice(1) : workspaceRef;
    const encoded = clean
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    return encoded ? `${prefix}/${encoded}` : prefix;
}

function toSearchableString(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item) => toSearchableString(item)).join(' ');
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map((item) => toSearchableString(item)).join(' ');
    return '';
}

function buildReactionRows(model: Record<string, unknown>): Record<string, unknown>[] {
    return asArray<Record<string, unknown>>(model.modelreactions ?? model.reactions).map((reaction, index) => ({
        id: String((reaction.id ?? extractRefId(reaction.reaction_ref)) || `rxn-${index}`),
        name: String(reaction.name ?? ''),
        direction: String(reaction.direction ?? ''),
        equation: String(reaction.definition ?? reaction.equation ?? ''),
        gapfilled: Boolean(reaction.is_gapfilled) ? 'Yes' : 'No',
        raw: reaction,
    }));
}

function buildCompoundRows(model: Record<string, unknown>): Record<string, unknown>[] {
    return asArray<Record<string, unknown>>(model.modelcompounds ?? model.compounds).map((compound, index) => ({
        id: String((compound.id ?? extractRefId(compound.compound_ref)) || `cpd-${index}`),
        name: String(compound.name ?? ''),
        formula: String(compound.formula ?? ''),
        charge: Number(compound.charge ?? 0),
        compartment: String(compound.modelcompartment_ref ?? compound.compartment_ref ?? ''),
        raw: compound,
    }));
}

function buildGeneRows(model: Record<string, unknown>): Record<string, unknown>[] {
    const explicitGenes = asArray<Record<string, unknown>>(model.genes ?? model.modelgenes);
    if (explicitGenes.length > 0) {
        return explicitGenes.map((gene, index) => ({
            id: String((gene.id ?? extractRefId(gene.feature_ref)) || `gene-${index}`),
            reactions: toSearchableString(gene.reactions ?? []),
            functions: toSearchableString(gene.functions ?? ''),
        }));
    }

    const reactionRows = asArray<Record<string, unknown>>(model.modelreactions ?? model.reactions);
    const geneToReactions = new Map<string, Set<string>>();
    for (const reaction of reactionRows) {
        const reactionId = String(reaction.id ?? extractRefId(reaction.reaction_ref) ?? '');
        const proteins = asArray<Record<string, unknown>>(reaction.modelReactionProteins);
        for (const protein of proteins) {
            const subunits = asArray<Record<string, unknown>>(protein.modelReactionProteinSubunits);
            for (const subunit of subunits) {
                const featureRefs = asArray<string>(subunit.feature_refs);
                for (const ref of featureRefs) {
                    const gene = extractRefId(ref);
                    if (!gene) continue;
                    if (!geneToReactions.has(gene)) geneToReactions.set(gene, new Set<string>());
                    if (reactionId) geneToReactions.get(gene)?.add(reactionId);
                }
            }
        }
    }

    return Array.from(geneToReactions.entries()).map(([gene, reactions]) => ({
        id: gene,
        reactions: Array.from(reactions).join(', '),
        functions: '',
    }));
}

function buildCompartmentRows(model: Record<string, unknown>): Record<string, unknown>[] {
    return asArray<Record<string, unknown>>(model.modelcompartments ?? model.compartments).map((item, index) => ({
        id: String(item.id ?? item.compartment ?? `cmp-${index}`),
        name: String(item.label ?? item.name ?? ''),
        pH: Number(item.pH ?? 0),
        potential: Number(item.potential ?? 0),
    }));
}

function buildBiomassRows(model: Record<string, unknown>): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    const biomasses = asArray<Record<string, unknown>>(model.biomasses ?? model.biomass);
    biomasses.forEach((biomass, biomassIndex) => {
        const biomassId = String(biomass.id ?? `bio-${biomassIndex}`);
        const compounds = asArray<Record<string, unknown>>(biomass.biomasscompounds ?? biomass.compounds);
        if (compounds.length === 0) {
            rows.push({
                id: `${biomassId}-empty`,
                biomass: biomassId,
                compound: '',
                name: '',
                coefficient: '',
                compartment: '',
            });
            return;
        }
        compounds.forEach((compound, compoundIndex) => {
            rows.push({
                id: `${biomassId}-${compoundIndex}`,
                biomass: biomassId,
                compound: String(compound.modelcompound_ref ?? compound.compound_ref ?? ''),
                name: String(compound.name ?? ''),
                coefficient: Number(compound.coefficient ?? 0),
                compartment: String(compound.modelcompartment_ref ?? ''),
            });
        });
    });
    return rows;
}

function buildPathwayRows(model: Record<string, unknown>): Record<string, unknown>[] {
    const pathways = asArray<Record<string, unknown>>(model.pathways ?? model.maps);
    if (pathways.length > 0) {
        return pathways.map((pathway, index) => ({
            id: String(pathway.id ?? `map-${index}`),
            name: String(pathway.name ?? pathway.id ?? ''),
            reactions: Number(pathway.rxnCount ?? pathway.reaction_count ?? 0),
            compounds: Number(pathway.cpdCount ?? pathway.compound_count ?? 0),
        }));
    }

    // Fallback when pathways are not precomputed in the object.
    const reactionRows = asArray<Record<string, unknown>>(model.modelreactions ?? model.reactions);
    const map = new Map<string, number>();
    for (const reaction of reactionRows) {
        const aliases = asArray<string>(reaction.pathways ?? []);
        for (const pathway of aliases) {
            if (!pathway) continue;
            map.set(pathway, (map.get(pathway) ?? 0) + 1);
        }
    }
    return Array.from(map.entries()).map(([name, count], index) => ({
        id: `map-${index}`,
        name,
        reactions: count,
        compounds: 0,
    }));
}

function buildTableConfig(model: Record<string, unknown>): Record<Exclude<TabKey, 'overview' | 'edits'>, DataTableConfig> {
    return {
        reactions: {
            rows: buildReactionRows(model),
            columns: [
                {
                    field: 'id',
                    headerName: 'ID',
                    width: 210,
                    renderCell: (params) => {
                        const reactionId = normalizeBiochemReactionId(params.value);
                        return reactionId ? (
                            <Link href={`/biochem/reactions/${reactionId}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                                {String(params.value ?? '')}
                            </Link>
                        ) : (
                            <>{String(params.value ?? '')}</>
                        );
                    },
                },
                { field: 'name', headerName: 'Name', width: 260 },
                { field: 'direction', headerName: 'Direction', width: 120 },
                {
                    field: 'equation',
                    headerName: 'Equation',
                    flex: 1,
                    minWidth: 280,
                    renderCell: (params) => <ChemicalEquation equation={String(params.value ?? '')} />,
                },
                { field: 'gapfilled', headerName: 'Gapfilled', width: 120 },
            ],
        },
        compounds: {
            rows: buildCompoundRows(model),
            columns: [
                {
                    field: 'id',
                    headerName: 'ID',
                    width: 210,
                    renderCell: (params) => {
                        const compoundId = normalizeBiochemCompoundId(params.value);
                        return compoundId ? (
                            <Link href={`/biochem/compounds/${compoundId}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                                {String(params.value ?? '')}
                            </Link>
                        ) : (
                            <>{String(params.value ?? '')}</>
                        );
                    },
                },
                { field: 'name', headerName: 'Name', width: 260 },
                {
                    field: 'formula',
                    headerName: 'Formula',
                    width: 180,
                    renderCell: (params) => formatFormula(String(params.value ?? '')),
                },
                { field: 'charge', headerName: 'Charge', width: 120, type: 'number' },
                { field: 'compartment', headerName: 'Compartment', width: 180 },
            ],
        },
        genes: {
            rows: buildGeneRows(model),
            columns: [
                { field: 'id', headerName: 'Gene', width: 230 },
                { field: 'reactions', headerName: 'Reactions', flex: 1, minWidth: 260 },
                { field: 'functions', headerName: 'Functions', flex: 1, minWidth: 260 },
            ],
        },
        compartments: {
            rows: buildCompartmentRows(model),
            columns: [
                { field: 'id', headerName: 'Compartment', width: 180 },
                { field: 'name', headerName: 'Name', width: 220 },
                { field: 'pH', headerName: 'pH', width: 120, type: 'number' },
                { field: 'potential', headerName: 'Potential', width: 140, type: 'number' },
            ],
        },
        biomass: {
            rows: buildBiomassRows(model),
            columns: [
                { field: 'biomass', headerName: 'Biomass', width: 180 },
                {
                    field: 'compound',
                    headerName: 'Compound',
                    width: 280,
                    renderCell: (params) => {
                        const compoundId = normalizeBiochemCompoundId(params.value);
                        return compoundId ? (
                            <Link href={`/biochem/compounds/${compoundId}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                                {String(params.value ?? '')}
                            </Link>
                        ) : (
                            <>{String(params.value ?? '')}</>
                        );
                    },
                },
                { field: 'name', headerName: 'Name', width: 220 },
                { field: 'coefficient', headerName: 'Coefficient', width: 140, type: 'number' },
                { field: 'compartment', headerName: 'Compartment', width: 180 },
            ],
        },
        pathways: {
            rows: buildPathwayRows(model),
            columns: [
                { field: 'name', headerName: 'Name', width: 300 },
                { field: 'id', headerName: 'ID', width: 220 },
                { field: 'reactions', headerName: 'Rxns', width: 120, type: 'number' },
                { field: 'compounds', headerName: 'Cpds', width: 120, type: 'number' },
            ],
        },
    };
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`model-tabpanel-${index}`}
            aria-labelledby={`model-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3, backgroundColor: '#fff', border: '1px solid #e0e0e0', borderTop: 'none' }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `model-tab-${index}`,
        'aria-controls': `model-tabpanel-${index}`,
    };
}

function formatRelativeTimestamp(value: unknown): string {
    if (typeof value !== 'string' && typeof value !== 'number') return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
}

function summarizeMediaRef(value: unknown): string {
    if (typeof value !== 'string' || !value) return 'N/A';
    const pieces = value.split('/');
    return pieces[pieces.length - 1] || value;
}

function extractExpressionRows(model: Record<string, unknown>): Array<{ id: string; name: string; ids: string[] }> {
    const expressionData = model.expression_data;
    if (!expressionData) return [];

    if (Array.isArray(expressionData)) {
        return expressionData.map((item, index) => {
            if (typeof item === 'string') {
                return { id: `expression-${index}`, name: item, ids: [] };
            }
            if (item && typeof item === 'object') {
                const record = item as Record<string, unknown>;
                return {
                    id: String(record.id ?? record.name ?? `expression-${index}`),
                    name: String(record.name ?? record.id ?? `Expression ${index + 1}`),
                    ids: asArray<unknown>(record.ids).map((entry) => String(entry)),
                };
            }
            return { id: `expression-${index}`, name: `Expression ${index + 1}`, ids: [] };
        });
    }

    if (typeof expressionData === 'object') {
        return Object.entries(expressionData as Record<string, unknown>).map(([name, ids], index) => ({
            id: `${name}-${index}`,
            name,
            ids: asArray<unknown>(ids).map((entry) => String(entry)),
        }));
    }

    return [];
}

function extractFbaRows(fbaData: Record<string, unknown> | null | undefined): Record<string, unknown>[] {
    if (!fbaData) return [];

    const nestedCandidates = [
        asArray<Record<string, unknown>>(fbaData.fbas),
        asArray<Record<string, unknown>>(fbaData.results),
        asArray<Record<string, unknown>>(fbaData.data),
    ];
    const nestedRows = nestedCandidates.find((rows) => rows.length > 0) ?? [];

    const rows = nestedRows.length > 0 ? nestedRows : [fbaData];
    return rows.map((fba, index) => ({
        id: String(fba.id ?? extractRefId(fba.ref) ?? `fba-${index}`),
        objective: String(fba.objective ?? '-'),
        objectiveFunction: String(fba.objective_function ?? 'N/A'),
        media: summarizeMediaRef(fba.media),
        timestamp: formatRelativeTimestamp(fba.timestamp ?? fba.rundate),
    }));
}

function extractGapfillRows(gapfills: Record<string, unknown>[] | undefined): Record<string, unknown>[] {
    return asArray<Record<string, unknown>>(gapfills).map((gapfill, index) => ({
        id: String(gapfill.id ?? extractRefId(gapfill.ref) ?? `gapfill-${index}`),
        integrated: (gapfill.integrated ?? gapfill.integrated_solution) ? 'Yes' : 'No',
        media: summarizeMediaRef(gapfill.media),
        timestamp: formatRelativeTimestamp(gapfill.rundate ?? gapfill.timestamp),
    }));
}

function stringifyDetailValue(value: unknown): string {
    if (value == null || value === '') return '-';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return '-';
        return value.map((entry) => stringifyDetailValue(entry)).join(', ');
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function extractDetailEntries(row: Record<string, unknown>): Array<{ key: string; value: string }> {
    const source = row.raw && typeof row.raw === 'object' ? row.raw as Record<string, unknown> : row;
    return Object.entries(source)
        .filter(([key]) => key !== 'raw')
        .map(([key, value]) => ({
            key,
            value: stringifyDetailValue(value),
        }));
}

function LegacySurfaceStatus({
    isPlantModel,
}: {
    isPlantModel: boolean;
}) {
    return (
        <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
            <AlertTitle>Legacy surface status</AlertTitle>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {isPlantModel && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label="Predictions tab" color="warning" />
                        <Typography variant="body2" color="text.secondary">
                            Plant-only legacy Predictions is not yet supported in v1-beta and is intentionally deferred.
                        </Typography>
                    </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label="Dynamic pathway tabs" color="warning" />
                    <Typography variant="body2" color="text.secondary">
                        Legacy dynamic map tabs are represented by the Pathways tab summary in this UI and are deferred for full parity.
                    </Typography>
                </Box>
            </Box>
        </Alert>
    );
}

function VisualizeDataPanel({
    option,
    modelName,
    fbaRows,
    gapfillRows,
    expressionRows,
    fbaError,
    gapfillError,
}: {
    option: string;
    modelName: string;
    fbaRows: Record<string, unknown>[];
    gapfillRows: Record<string, unknown>[];
    expressionRows: Array<{ id: string; name: string; ids: string[] }>;
    fbaError: string | null;
    gapfillError: string | null;
}) {
    if (!option) return null;

    return (
        <Box
            sx={{
                mb: 4,
                p: 2.5,
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderLeft: '4px solid #66bb6a',
            }}
        >
            {option === 'FBA' && (
                <Box>
                    {fbaError ? (
                        <Typography variant="body2" color="error">
                            FBA data is currently unavailable: {fbaError}
                        </Typography>
                    ) : fbaRows.length === 0 ? (
                        <Typography variant="body1" color="text.secondary">
                            No FBA simulations for {modelName}.
                        </Typography>
                    ) : (
                        <Box sx={{ display: 'grid', gap: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1.1fr 0.8fr 1.5fr 1.2fr 1.2fr', gap: 1, fontWeight: 600 }}>
                                <Typography variant="body2">ID</Typography>
                                <Typography variant="body2">Objective</Typography>
                                <Typography variant="body2">Objective Function</Typography>
                                <Typography variant="body2">Media</Typography>
                                <Typography variant="body2">Time</Typography>
                            </Box>
                            <Divider />
                            {fbaRows.map((row) => (
                                <Box key={String(row.id)} sx={{ display: 'grid', gridTemplateColumns: '1.1fr 0.8fr 1.5fr 1.2fr 1.2fr', gap: 1 }}>
                                    <Typography variant="body2">{String(row.id ?? '-')}</Typography>
                                    <Typography variant="body2">{String(row.objective ?? '-')}</Typography>
                                    <Typography variant="body2">{String(row.objectiveFunction ?? 'N/A')}</Typography>
                                    <Typography variant="body2">{String(row.media ?? 'N/A')}</Typography>
                                    <Typography variant="body2">{String(row.timestamp ?? '-')}</Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            )}
            {option === 'GapFill' && (
                <Box>
                    {gapfillError ? (
                        <Typography variant="body2" color="error">
                            Gapfill data is currently unavailable: {gapfillError}
                        </Typography>
                    ) : gapfillRows.length === 0 ? (
                        <Typography variant="body1" color="text.secondary">
                            No gapfills for {modelName}.
                        </Typography>
                    ) : (
                        <Box sx={{ display: 'grid', gap: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 1.5fr 1.2fr', gap: 1, fontWeight: 600 }}>
                                <Typography variant="body2">ID</Typography>
                                <Typography variant="body2">Integrated?</Typography>
                                <Typography variant="body2">Media</Typography>
                                <Typography variant="body2">Time</Typography>
                            </Box>
                            <Divider />
                            {gapfillRows.map((row) => (
                                <Box key={String(row.id)} sx={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 1.5fr 1.2fr', gap: 1 }}>
                                    <Typography variant="body2">{String(row.id ?? '-')}</Typography>
                                    <Typography variant="body2">{String(row.integrated ?? '-')}</Typography>
                                    <Typography variant="body2">{String(row.media ?? 'N/A')}</Typography>
                                    <Typography variant="body2">{String(row.timestamp ?? '-')}</Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            )}
            {option === 'Expression' && (
                <Box>
                    {expressionRows.length === 0 ? (
                        <Typography variant="body1" color="text.secondary">
                            No expression data uploaded for {modelName}.
                        </Typography>
                    ) : (
                        <Box sx={{ display: 'grid', gap: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, fontWeight: 600 }}>
                                <Typography variant="body2">Expression Name</Typography>
                                <Typography variant="body2">IDs</Typography>
                            </Box>
                            <Divider />
                            {expressionRows.map((row) => (
                                <Box key={row.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
                                    <Typography variant="body2">{row.name}</Typography>
                                    <Typography variant="body2">{row.ids.length > 0 ? row.ids.join(', ') : '-'}</Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}

export default function ModelDetailPage({ params }: { params: Promise<{ path: string[] }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const urlSegments = useMemo(
        () => resolvedParams.path ?? [],
        [resolvedParams.path],
    );
    const decodedSegments = useMemo(
        () => urlSegments.map((segment) => decodeURIComponent(segment)),
        [urlSegments],
    );

    const lastSegment = decodedSegments[decodedSegments.length - 1]?.toLowerCase();
    const activeTab: TabKey = isTabKey(lastSegment) ? lastSegment : 'overview';
    const modelSegments = isTabKey(lastSegment) ? decodedSegments.slice(0, -1) : decodedSegments;
    const workspacePath = `/${modelSegments.join('/')}`;

    const workspaceCandidates = useMemo(() => {
        if (!workspacePath || workspacePath === '/') return [workspacePath];
        const base = workspacePath.endsWith('/') ? workspacePath.slice(0, -1) : workspacePath;
        return base.endsWith('/model') ? [base] : [base, `${base}/model`];
    }, [workspacePath]);

    const { data: modelData, isLoading, error } = useQuery({
        queryKey: ['modelDetail', USE_MODELSEED_API, USE_NEW_PROXY, ...workspaceCandidates],
        queryFn: async () => {
            const failures: string[] = [];
            if (USE_MODELSEED_API) {
                for (const candidate of workspaceCandidates) {
                    try {
                        const detail = await getModelDetailBundleFromApi(candidate);
                        return detail.data;
                    } catch (err) {
                        const reason = err instanceof Error ? err.message : 'Unknown model endpoint error';
                        failures.push(`model-api ${candidate}: ${reason}`);
                    }
                }
            }
            for (const candidate of workspaceCandidates) {
                try {
                    const result = await workspaceGet([candidate]);
                    const object = parseWorkspaceGetObject<Record<string, unknown>>(result);
                    if (object) return object;
                } catch (err) {
                    const reason = err instanceof Error ? err.message : 'Unknown workspace error';
                    failures.push(`workspace ${candidate}: ${reason}`);
                }
            }
            throw new Error(`Failed to load model object. Tried refs: ${failures.join(' | ')}`);
        },
        retry: 1,
    });

    const {
        data: modelEdits = [],
        error: modelEditsError,
        refetch: refetchModelEdits,
    } = useQuery({
        queryKey: ['modelEdits', USE_MODELSEED_API, workspaceCandidates[0]],
        enabled: USE_MODELSEED_API && workspaceCandidates.length > 0,
        queryFn: async () => {
            const edits = await listModelEditsFromApi(workspaceCandidates[0]);
            return Array.isArray(edits) ? edits : [];
        },
        retry: 0,
        staleTime: 30_000,
    });

    const { data: modelFba, error: modelFbaError } = useQuery({
        queryKey: ['modelFba', USE_MODELSEED_API, workspaceCandidates[0]],
        enabled: USE_MODELSEED_API && workspaceCandidates.length > 0,
        queryFn: async () => getModelFbaFromApi(workspaceCandidates[0]),
        retry: 0,
        staleTime: 30_000,
    });

    const { data: modelGapfills, error: modelGapfillsError } = useQuery({
        queryKey: ['modelGapfills', USE_MODELSEED_API, workspaceCandidates[0]],
        enabled: USE_MODELSEED_API && workspaceCandidates.length > 0,
        queryFn: async () => listModelGapfillsFromApi(workspaceCandidates[0]),
        retry: 0,
        staleTime: 30_000,
    });

    const [visualizeOption, setVisualizeOption] = useState('');
    const [paginationByTab, setPaginationByTab] = useState<Record<string, GridPaginationModel>>({});
    const [sortByTab, setSortByTab] = useState<Record<string, GridSortModel>>({});
    const [actionLoading, setActionLoading] = useState<'fba' | 'gapfill' | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [editReactionId, setEditReactionId] = useState('');
    const [editSummary, setEditSummary] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editMessage, setEditMessage] = useState<string | null>(null);
    const [detailDrawer, setDetailDrawer] = useState<{ title: string; row: Record<string, unknown> } | null>(null);

    if (error) {
        return (
            <Box sx={{ p: 4, maxWidth: '1400px', mx: 'auto' }}>
                <Typography color="error" variant="h6">
                    Error loading model: {workspacePath}
                </Typography>
                <Typography>Please verify the model exists and you have access permissions.</Typography>
            </Box>
        );
    }

    if (isLoading) {
        return (
            <Box sx={{ p: 10, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    const modelObject = parseWorkspaceGetObject<Record<string, unknown>>(modelData) ?? {};
    const modelName = String(modelObject.id ?? modelSegments[modelSegments.length - 1] ?? 'Unknown Model');
    const modelSpecies = String(modelObject.name ?? '');
    const tableConfig = buildTableConfig(modelObject);
    const fbaRows = extractFbaRows(modelFba);
    const gapfillRows = extractGapfillRows(modelGapfills);
    const expressionRows = extractExpressionRows(modelObject);
    const defaultMedia = workspacePath.includes('/plantseed/')
        ? '/chenry/public/modelsupport/media/PlantHeterotrophicMedia'
        : 'Complete';
    const isPlantModel = workspacePath.includes('/plantseed/')
        || String(modelObject.type ?? '').toLowerCase().includes('plant');

    const tabIndex = MODEL_TABS.findIndex((tab) => tab.key === activeTab);

    const genomeRef = String(modelObject.genome_ref ?? '');
    const modelMetadata: Array<{ label: string; value: ReactNode }> = [
        { label: 'Model ID', value: String(modelObject.id ?? modelName) },
        { label: 'Species', value: modelSpecies || '-' },
        { label: 'Source', value: String(modelObject.source ?? '-') },
        {
            label: 'Genome Ref',
            value: genomeRef
                ? (
                    <Link
                        href={toEncodedCatchallHref('/genome', genomeRef)}
                        style={{ color: '#00acc1', textDecoration: 'none' }}
                    >
                        {genomeRef}
                    </Link>
                )
                : '-',
        },
        { label: 'Type', value: String(modelObject.type ?? '-') },
        {
            label: 'Edits',
            value: modelEditsError
                ? (modelEditsError instanceof Error
                    && modelEditsError.message.includes('501')
                    ? 'Not supported by backend yet'
                    : 'Unavailable')
                : String(modelEdits.length),
        },
    ];

    const editHistoryRows = modelEdits.map((edit, index) => {
        const timestamp =
            typeof edit.timestamp === 'string'
                ? edit.timestamp
                : typeof edit.rundate === 'string'
                    ? edit.rundate
                    : '';
        const removed = asArray<unknown>(edit.reactions_removed).length;
        const added = asArray<unknown>(edit.reactions_added).length;
        const modified = asArray<unknown>(edit.reactions_modified).length;
        const biomassChanged = asArray<unknown>(edit.biomass_changed).length;

        return {
            id: String(edit.id ?? `edit-${index}`),
            timestamp,
            user: String(edit.user ?? edit.owner ?? '-'),
            operation: [added > 0 && 'add', removed > 0 && 'remove', modified > 0 && 'modify', biomassChanged > 0 && 'biomass']
                .filter(Boolean)
                .join(', ') || 'update',
            summary: `${added} added, ${removed} removed, ${modified} modified, ${biomassChanged} biomass updates`,
        };
    });

    const editHistoryColumns: GridColDef<Record<string, unknown>>[] = [
        {
            field: 'timestamp',
            headerName: 'Timestamp',
            width: 220,
            valueGetter: (value) => (value ? new Date(String(value)).toLocaleString() : '-'),
        },
        { field: 'user', headerName: 'User', width: 220 },
        { field: 'operation', headerName: 'Operation', width: 180 },
        { field: 'summary', headerName: 'Summary', flex: 1, minWidth: 280 },
    ];

    const openDetailDrawer = (kind: 'reaction' | 'compound', row: Record<string, unknown>) => {
        const itemName = String(row.name ?? row.id ?? '');
        setDetailDrawer({
            title: kind === 'reaction'
                ? `Reaction ${itemName || row.id || ''}`
                : `Compound ${itemName || row.id || ''}`,
            row,
        });
    };

    const reactionColumns: GridColDef<Record<string, unknown>>[] = [
        ...tableConfig.reactions.columns,
        {
            field: 'details',
            headerName: 'Details',
            width: 120,
            sortable: false,
            filterable: false,
            renderCell: ({ row }) => (
                <Button
                    size="small"
                    onClick={(event) => {
                        event.stopPropagation();
                        openDetailDrawer('reaction', row);
                    }}
                >
                    View
                </Button>
            ),
        },
    ];

    const compoundColumns: GridColDef<Record<string, unknown>>[] = [
        ...tableConfig.compounds.columns,
        {
            field: 'details',
            headerName: 'Details',
            width: 120,
            sortable: false,
            filterable: false,
            renderCell: ({ row }) => (
                <Button
                    size="small"
                    onClick={(event) => {
                        event.stopPropagation();
                        openDetailDrawer('compound', row);
                    }}
                >
                    View
                </Button>
            ),
        },
    ];

    const handleTabChange = (_event: React.SyntheticEvent, nextIndex: number) => {
        const tab = MODEL_TABS[nextIndex];
        if (!tab) return;
        const basePath = `/model${workspacePath}`;
        const nextPath = tab.key === 'overview' ? basePath : `${basePath}/${tab.key}`;
        router.push(nextPath);
    };

    const submitModelJob = async (kind: 'fba' | 'gapfill') => {
        setActionLoading(kind);
        setActionMessage(null);
        try {
            const payload =
                kind === 'fba'
                    ? await submitFbaJobFromApi({
                        model: workspaceCandidates[0],
                        media: defaultMedia,
                        media_supplement: [],
                    })
                    : await submitGapfillJobFromApi({
                        model: workspaceCandidates[0],
                        media: defaultMedia,
                    });

            const jobId = extractTrackedJobId(payload);
            if (jobId) {
                trackJob({
                    id: jobId,
                    kind,
                    label: `${modelName} (${kind.toUpperCase()})`,
                    modelId: modelName,
                    relatedRef: workspacePath,
                    submittedAt: new Date().toISOString(),
                });
            }
            setActionMessage(
                jobId
                    ? `${kind === 'fba' ? 'FBA' : 'Gapfill'} job submitted. Job ID: ${jobId}`
                    : `${kind === 'fba' ? 'FBA' : 'Gapfill'} job submitted.`,
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : `Failed to submit ${kind} job`;
            setActionMessage(message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSubmitEdit = async () => {
        const trimmedReactionId = editReactionId.trim();
        if (!trimmedReactionId) {
            setEditMessage('Reaction ID is required to submit an edit.');
            return;
        }

        setEditSubmitting(true);
        setEditMessage(null);
        try {
            await editModelFromApi({
                model: workspaceCandidates[0],
                reactions_to_remove: [trimmedReactionId],
                reactions_to_add: [],
                reactions_to_modify: [],
                biomass_changes: [],
                summary: editSummary.trim() || undefined,
            });
            await refetchModelEdits();
            setEditMessage(`Edit request submitted for reaction ${trimmedReactionId}.`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit model edit';
            setEditMessage(
                message.includes('501')
                    ? 'Model editing is not supported yet on this backend deployment.'
                    : message,
            );
        } finally {
            setEditSubmitting(false);
        }
    };

    return (
        <Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 4 } }}>
            <ModelDetailHeader
                modelName={modelName}
                visualizeOption={visualizeOption}
                onVisualizeChange={setVisualizeOption}
                onRunFba={() => void submitModelJob('fba')}
                onRunGapfill={() => void submitModelJob('gapfill')}
                actionLoading={actionLoading}
                actionMessage={actionMessage}
            />

            <Box
                sx={{
                    mb: 3,
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}
            >
                <DownloadModelMenu
                    modelRef={workspaceCandidates[0]}
                    modelId={modelName}
                    buttonLabel="Download options"
                    helperText="Export this model as SBML, JSON, or TSV."
                />
            </Box>

            <VisualizeDataPanel
                option={visualizeOption}
                modelName={modelName}
                fbaRows={fbaRows}
                gapfillRows={gapfillRows}
                expressionRows={expressionRows}
                fbaError={modelFbaError instanceof Error ? modelFbaError.message : null}
                gapfillError={modelGapfillsError instanceof Error ? modelGapfillsError.message : null}
            />

            <LegacySurfaceStatus isPlantModel={isPlantModel} />

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                    {MODEL_TABS.map((tab, index) => (
                        <Tab key={tab.key} label={tab.label} {...a11yProps(index)} />
                    ))}
                </Tabs>
            </Box>

            {MODEL_TABS.map((tab, index) => (
                <TabPanel key={tab.key} value={tabIndex} index={index}>
                    {tab.key === 'overview' ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr' }, rowGap: 1.5, columnGap: 2 }}>
                            {modelMetadata.map((row) => (
                                <Box key={row.label} sx={{ display: 'contents' }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                        {row.label}
                                    </Typography>
                                    <Typography variant="body2">
                                        {row.value}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    ) : tab.key === 'edits' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}>
                            <Typography variant="h6">Edit Model</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Submit a basic model edit request. The first supported workflow here is removing a reaction by ID, subject to backend support on this deployment.
                            </Typography>
                            <TextField
                                label="Reaction ID to remove"
                                value={editReactionId}
                                onChange={(event) => setEditReactionId(event.target.value)}
                                placeholder="rxn00001_c0"
                                fullWidth
                            />
                            <TextField
                                label="Edit summary"
                                value={editSummary}
                                onChange={(event) => setEditSummary(event.target.value)}
                                placeholder="Optional note for this change"
                                fullWidth
                                multiline
                                minRows={2}
                            />
                            {editMessage && (
                                <Typography
                                    variant="body2"
                                    color={editMessage.includes('submitted') ? 'success.main' : 'error'}
                                >
                                    {editMessage}
                                </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    onClick={() => void handleSubmitEdit()}
                                    disabled={editSubmitting || !editReactionId.trim()}
                                >
                                    {editSubmitting ? 'Submitting Edit...' : 'Submit Edit'}
                                </Button>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" sx={{ mb: 1.5 }}>
                                    Edit History
                                </Typography>
                                {modelEditsError ? (
                                    <Typography variant="body2" color="text.secondary">
                                        {modelEditsError instanceof Error && modelEditsError.message.includes('501')
                                            ? 'Edit history is not supported yet on this backend deployment.'
                                            : 'Edit history is currently unavailable.'}
                                    </Typography>
                                ) : editHistoryRows.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        No edits recorded for this model yet.
                                    </Typography>
                                ) : (
                                    <DataGrid<Record<string, unknown>>
                                        rows={editHistoryRows}
                                        columns={editHistoryColumns}
                                        pageSizeOptions={[10, 25, 50]}
                                        paginationModel={paginationByTab.edits ?? { page: 0, pageSize: 10 }}
                                        onPaginationModelChange={(model) =>
                                            setPaginationByTab((prev) => ({ ...prev, edits: model }))
                                        }
                                        sortModel={sortByTab.edits ?? [{ field: 'timestamp', sort: 'desc' }]}
                                        onSortModelChange={(model) =>
                                            setSortByTab((prev) => ({ ...prev, edits: model }))
                                        }
                                        hideFooter
                                        disableColumnMenu
                                        disableRowSelectionOnClick
                                        autoHeight
                                        sx={{
                                            mt: 1,
                                            border: '1px solid #e0e0e0',
                                            backgroundColor: '#fff',
                                            '& .MuiDataGrid-columnHeaders': {
                                                backgroundColor: '#f5f5f5',
                                                borderBottom: '1px solid #ddd',
                                            },
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    ) : (
                        <>
                            <DataGrid<Record<string, unknown>>
                                rows={tableConfig[tab.key].rows}
                                columns={
                                    tab.key === 'reactions'
                                        ? reactionColumns
                                        : tab.key === 'compounds'
                                            ? compoundColumns
                                            : tableConfig[tab.key].columns
                                }
                                pageSizeOptions={[10, 25, 50, 100]}
                                paginationModel={paginationByTab[tab.key] ?? { page: 0, pageSize: 25 }}
                                onPaginationModelChange={(model) =>
                                    setPaginationByTab((prev) => ({ ...prev, [tab.key]: model }))
                                }
                                sortModel={sortByTab[tab.key] ?? []}
                                onSortModelChange={(model) =>
                                    setSortByTab((prev) => ({ ...prev, [tab.key]: model }))
                                }
                                showToolbar
                                slots={{ toolbar: DataControlHeader }}
                                slotProps={{
                                    toolbar: { showQuickFilter: true },
                                }}
                                hideFooter
                                disableColumnMenu
                                getRowId={(row) => String(row.id ?? '')}
                                onRowClick={
                                    tab.key === 'reactions'
                                        ? ({ row }) => openDetailDrawer('reaction', row)
                                        : tab.key === 'compounds'
                                            ? ({ row }) => openDetailDrawer('compound', row)
                                            : undefined
                                }
                                disableRowSelectionOnClick
                                autoHeight
                                sx={{
                                    border: '1px solid #e0e0e0',
                                    backgroundColor: '#fff',
                                    '& .MuiDataGrid-columnHeaders': {
                                        backgroundColor: '#f5f5f5',
                                        borderBottom: '1px solid #ddd',
                                    },
                                    '& .MuiDataGrid-row:hover': {
                                        cursor: tab.key === 'reactions' || tab.key === 'compounds' ? 'pointer' : 'default',
                                    },
                                }}
                            />
                        </>
                    )}
                </TabPanel>
            ))}

            <Drawer
                anchor="right"
                open={Boolean(detailDrawer)}
                onClose={() => setDetailDrawer(null)}
            >
                <Box sx={{ width: { xs: 320, md: 420 }, p: 3, display: 'grid', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                        <Typography variant="h6">{detailDrawer?.title ?? 'Details'}</Typography>
                        <Button onClick={() => setDetailDrawer(null)} sx={{ textTransform: 'none' }}>
                            Close
                        </Button>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.25 }}>
                        {(detailDrawer ? extractDetailEntries(detailDrawer.row) : []).map((entry) => (
                            <Box key={entry.key} sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1.5 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                    {entry.key}
                                </Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                    {entry.value}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Drawer>
        </Box>
    );
}
