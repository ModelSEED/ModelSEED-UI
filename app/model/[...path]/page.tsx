'use client';

import { use, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';

import { workspaceGet } from '@/lib/api/workspace';
import ModelDetailHeader from '@/components/ui/ModelDetailHeader';
import DataControlHeader from '@/components/layout/DataControlHeader';
import BiochemToolbar from '@/components/BiochemToolbar';

type TabKey =
    | 'overview'
    | 'reactions'
    | 'compounds'
    | 'genes'
    | 'compartments'
    | 'biomass'
    | 'pathways';

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

function toSearchableString(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item) => toSearchableString(item)).join(' ');
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map((item) => toSearchableString(item)).join(' ');
    return '';
}

function tableFilter(rows: Record<string, unknown>[], query: string): Record<string, unknown>[] {
    if (!query) return rows;
    const normalized = query.toLowerCase();
    return rows.filter((row) =>
        Object.values(row).some((value) => toSearchableString(value).toLowerCase().includes(normalized)),
    );
}

function unwrapWorkspaceObject(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') return {};
    const candidate = raw as Record<string, unknown>;
    const data = candidate.data;
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    return candidate;
}

function buildReactionRows(model: Record<string, unknown>): Record<string, unknown>[] {
    return asArray<Record<string, unknown>>(model.modelreactions ?? model.reactions).map((reaction, index) => ({
        id: String((reaction.id ?? extractRefId(reaction.reaction_ref)) || `rxn-${index}`),
        name: String(reaction.name ?? ''),
        direction: String(reaction.direction ?? ''),
        equation: String(reaction.definition ?? reaction.equation ?? ''),
        gapfilled: Boolean(reaction.is_gapfilled) ? 'Yes' : 'No',
    }));
}

function buildCompoundRows(model: Record<string, unknown>): Record<string, unknown>[] {
    return asArray<Record<string, unknown>>(model.modelcompounds ?? model.compounds).map((compound, index) => ({
        id: String((compound.id ?? extractRefId(compound.compound_ref)) || `cpd-${index}`),
        name: String(compound.name ?? ''),
        formula: String(compound.formula ?? ''),
        charge: Number(compound.charge ?? 0),
        compartment: String(compound.modelcompartment_ref ?? compound.compartment_ref ?? ''),
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

function buildTableConfig(model: Record<string, unknown>): Record<Exclude<TabKey, 'overview'>, DataTableConfig> {
    return {
        reactions: {
            rows: buildReactionRows(model),
            columns: [
                { field: 'id', headerName: 'ID', width: 210 },
                { field: 'name', headerName: 'Name', width: 260 },
                { field: 'direction', headerName: 'Direction', width: 120 },
                { field: 'equation', headerName: 'Equation', flex: 1, minWidth: 280 },
                { field: 'gapfilled', headerName: 'Gapfilled', width: 120 },
            ],
        },
        compounds: {
            rows: buildCompoundRows(model),
            columns: [
                { field: 'id', headerName: 'ID', width: 210 },
                { field: 'name', headerName: 'Name', width: 260 },
                { field: 'formula', headerName: 'Formula', width: 180 },
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
                { field: 'compound', headerName: 'Compound', width: 280 },
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

export default function ModelDetailPage({ params }: { params: Promise<{ path: string[] }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const urlSegments = resolvedParams.path ?? [];

    const lastSegment = urlSegments[urlSegments.length - 1]?.toLowerCase();
    const activeTab: TabKey = isTabKey(lastSegment) ? lastSegment : 'overview';
    const modelSegments = isTabKey(lastSegment) ? urlSegments.slice(0, -1) : urlSegments;
    const workspacePath = `/${modelSegments.join('/')}`;

    const workspaceCandidates = useMemo(() => {
        if (!workspacePath || workspacePath === '/') return [workspacePath];
        const base = workspacePath.endsWith('/') ? workspacePath.slice(0, -1) : workspacePath;
        return base.endsWith('/model') ? [base] : [base, `${base}/model`];
    }, [workspacePath]);

    const { data: modelData, isLoading, error } = useQuery({
        queryKey: ['workspaceGet', ...workspaceCandidates],
        queryFn: async () => {
            const failures: string[] = [];
            for (const candidate of workspaceCandidates) {
                try {
                    const result = await workspaceGet([candidate]);
                    const object = Array.isArray(result) ? (result[0] ?? result) : result;
                    if (object) return object;
                } catch (err) {
                    const reason = err instanceof Error ? err.message : 'Unknown workspace error';
                    failures.push(`${candidate}: ${reason}`);
                }
            }
            throw new Error(`Failed to load model object. Tried refs: ${failures.join(' | ')}`);
        },
        retry: 1,
    });

    const [visualizeOption, setVisualizeOption] = useState('');
    const [searchByTab, setSearchByTab] = useState<Record<string, string>>({});
    const [paginationByTab, setPaginationByTab] = useState<Record<string, GridPaginationModel>>({});
    const [sortByTab, setSortByTab] = useState<Record<string, GridSortModel>>({});

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

    const modelObject = unwrapWorkspaceObject(modelData);
    const modelName = String(modelObject.id ?? modelSegments[modelSegments.length - 1] ?? 'Unknown Model');
    const modelSpecies = String(modelObject.name ?? '');
    const tableConfig = buildTableConfig(modelObject);

    const tabIndex = MODEL_TABS.findIndex((tab) => tab.key === activeTab);

    const selectedTable = activeTab === 'overview' ? null : tableConfig[activeTab];
    const currentSearch = searchByTab[activeTab] ?? '';
    const filteredRows = selectedTable ? tableFilter(selectedTable.rows, currentSearch) : [];
    const paginationModel = paginationByTab[activeTab] ?? { page: 0, pageSize: 25 };
    const sortModel = sortByTab[activeTab] ?? [];

    const modelMetadata = [
        { label: 'Model ID', value: String(modelObject.id ?? modelName) },
        { label: 'Species', value: modelSpecies || '-' },
        { label: 'Source', value: String(modelObject.source ?? '-') },
        { label: 'Genome Ref', value: String(modelObject.genome_ref ?? '-') },
        { label: 'Type', value: String(modelObject.type ?? '-') },
    ];

    const handleTabChange = (_event: React.SyntheticEvent, nextIndex: number) => {
        const tab = MODEL_TABS[nextIndex];
        if (!tab) return;
        const basePath = `/model${workspacePath}`;
        const nextPath = tab.key === 'overview' ? basePath : `${basePath}/${tab.key}`;
        router.push(nextPath);
    };

    return (
        <Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 4 } }}>
            <ModelDetailHeader
                modelName={modelName}
                visualizeOption={visualizeOption}
                onVisualizeChange={setVisualizeOption}
            />

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
                    ) : (
                        <>
                            <DataControlHeader
                                placeholder={tab.searchPlaceholder}
                                searchValue={searchByTab[tab.key] ?? ''}
                                onSearchChange={(value) =>
                                    setSearchByTab((prev) => ({ ...prev, [tab.key]: value }))
                                }
                                totalRows={tab.key === activeTab ? filteredRows.length : tableConfig[tab.key].rows.length}
                            />
                            <DataGrid<Record<string, unknown>>
                                rows={tab.key === activeTab ? filteredRows : tableConfig[tab.key].rows}
                                columns={tableConfig[tab.key].columns}
                                pageSizeOptions={[10, 25, 50, 100]}
                                paginationModel={tab.key === activeTab ? paginationModel : (paginationByTab[tab.key] ?? { page: 0, pageSize: 25 })}
                                onPaginationModelChange={(model) =>
                                    setPaginationByTab((prev) => ({ ...prev, [tab.key]: model }))
                                }
                                sortModel={tab.key === activeTab ? sortModel : (sortByTab[tab.key] ?? [])}
                                onSortModelChange={(model) =>
                                    setSortByTab((prev) => ({ ...prev, [tab.key]: model }))
                                }
                                showToolbar
                                slots={{ toolbar: BiochemToolbar }}
                                disableRowSelectionOnClick
                                autoHeight
                                sx={{
                                    border: '1px solid #e0e0e0',
                                    backgroundColor: '#fff',
                                    '& .MuiDataGrid-columnHeaders': {
                                        backgroundColor: '#f5f5f5',
                                        borderBottom: '1px solid #ddd',
                                    },
                                }}
                            />
                        </>
                    )}
                </TabPanel>
            ))}
        </Box>
    );
}
