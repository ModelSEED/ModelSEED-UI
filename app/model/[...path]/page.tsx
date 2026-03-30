'use client';

import { use, useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
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
import Stack from '@mui/material/Stack';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel, GridRowSelectionModel } from '@mui/x-data-grid';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';

import { useAuth } from '@/components/auth/AuthProvider';
import { parseWorkspaceGetObject, workspaceGet, workspaceLs } from '@/lib/api/workspace';
import { USE_MODELSEED_API, USE_NEW_PROXY } from '@/lib/api/config';
import {
    editModelFromApi,
    getModelDetailBundleFromApi,
    getModelFbaFromApi,
    getJobsFromApi,
    listModelEditsFromApi,
    listModelGapfillsFromApi,
    submitFbaJobFromApi,
    submitGapfillJobFromApi,
} from '@/lib/api/modelseed';
import {
    extractTrackedJobId,
    isTerminalJobStatus,
    listTrackedJobs,
    removeTrackedJob,
    trackJob,
    type TrackedJob,
} from '@/lib/api/jobTracker';
import ModelDetailHeader from '@/components/ui/ModelDetailHeader';
import DownloadModelMenu from '@/components/ui/DownloadModelMenu';
import DataControlHeader from '@/components/layout/DataControlHeader';
import ChemicalEquation from '@/components/ui/ChemicalEquation';
import { formatFormula } from '@/components/utils/formatFormula';
import AddReactionsDialog from '@/components/ui/AddReactionsDialog';

type TabKey =
    | 'overview'
    | 'reactions'
    | 'compounds'
    | 'genes'
    | 'compartments'
    | 'biomass'
    | 'pathways'
    | 'fba'
    | 'gapfill'
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
    { key: 'fba', label: 'FBA', searchPlaceholder: 'Search FBA results...' },
    { key: 'gapfill', label: 'Gapfill', searchPlaceholder: 'Search gapfill results...' },
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

function decodePathSegment(segment: string): string {
    let current = segment;
    try {
        // Decode repeatedly to normalize values that may already be percent-encoded.
        while (true) {
            const decoded = decodeURIComponent(current);
            if (decoded === current) break;
            current = decoded;
        }
    } catch {
        // If decode fails, keep the original segment.
    }
    return current;
}

function toEncodedCatchallHref(prefix: string, workspaceRef: string): string {
    const clean = workspaceRef.startsWith('/') ? workspaceRef.slice(1) : workspaceRef;
    const encoded = clean
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(decodePathSegment(segment)))
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
            functions: gene.functions ? toSearchableString(gene.functions) : 'N/A',
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
        functions: 'View details',
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
    const biomasses = asArray<Record<string, unknown>>(
        model.biomasses ?? 
        model.biomass ?? 
        model.modelbiomasses ?? 
        model.biomass_reactions ?? 
        model.model_biomasses ??
        model.biomass_reaction ?? 
        model.modelbiomassreaction ?? 
        []
    );
    if (biomasses.length === 0) {
        // Fallback: search reactions for ones with 'biomass' in their ID or name
        const reactionRows = asArray<Record<string, unknown>>(model.modelreactions ?? model.reactions);
        const autoBiomasses = reactionRows.filter((rxn) => {
            const id = String(rxn.id ?? '').toLowerCase();
            const name = String(rxn.name ?? '').toLowerCase();
            return id.includes('biomass') || name.includes('biomass');
        });
        
        if (autoBiomasses.length > 0) {
            autoBiomasses.forEach((rxn) => {
                rows.push({
                    id: String(rxn.id ?? ''),
                    biomass: String(rxn.id ?? 'Biomass'),
                    compound: '---',
                    name: String(rxn.name ?? 'Biomass reaction'),
                    coefficient: 0,
                    compartment: '',
                });
            });
        }
        return rows;
    }
    biomasses.forEach((biomass, biomassIndex) => {
        const biomassId = String(biomass.id ?? biomass.label ?? biomass.name ?? `bio-${biomassIndex}`);
        let compounds = asArray<Record<string, unknown>>(
            biomass.biomasscompounds ?? 
            biomass.modelbiomasscompounds ?? 
            biomass.biomass_compounds ?? 
            biomass.modelbiomass_compounds ??
            biomass.model_biomass_compounds ??
            []
        );
        
        // Handle array of arrays format: [[cpd_id, coefficient, ""], ...]
        const rawCompounds = biomass.compounds;
        if (Array.isArray(rawCompounds) && rawCompounds.length > 0 && Array.isArray(rawCompounds[0])) {
            compounds = rawCompounds.map((c: unknown[]) => ({
                compound_id: Array.isArray(c) ? c[0] : '',
                coefficient: Array.isArray(c) ? c[1] : 0,
                compartment: Array.isArray(c) ? c[2] : '',
            }));
        }
        
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
            const compoundId = String(compound.compound_id ?? compound.modelcompound_ref ?? compound.compound_ref ?? compound.compound_id ?? '');
            rows.push({
                id: `${biomassId}-${compoundIndex}`,
                biomass: biomassId,
                compound: compoundId,
                name: compoundId ? `Compound ${compoundId}` : '',
                coefficient: Number(compound.coefficient ?? compound.coefficent ?? 0),
                compartment: String(compound.modelcompartment_ref ?? compound.compartment_ref ?? compound.compartment ?? ''),
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
        fba: {
            rows: [],
            columns: [
                { field: 'id', headerName: 'ID', width: 180 },
                { field: 'objective', headerName: 'Objective', width: 140 },
                { field: 'objectiveFunction', headerName: 'Objective Function', width: 200 },
                { field: 'media', headerName: 'Media', width: 180 },
                { field: 'timestamp', headerName: 'Time', width: 180 },
            ],
        },
        gapfill: {
            rows: [],
            columns: [
                { field: 'id', headerName: 'ID', width: 180 },
                { field: 'media', headerName: 'Media', width: 200 },
                { field: 'integrated', headerName: 'Integrated', width: 120 },
                { field: 'rundate', headerName: 'Date', width: 180 },
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

function normalizeWorkspaceRef(value: unknown): string {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function hasFbaPayloadFields(fba: Record<string, unknown>): boolean {
    const keys = [
        'id',
        'ref',
        'path',
        'objective',
        'objective_function',
        'media',
        'rundate',
        'timestamp',
        'FBAReactionVariables',
    ];

    return keys.some((key) => {
        if (!(key in fba)) return false;
        const value = fba[key];
        if (Array.isArray(value)) return value.length > 0;
        return value != null && String(value).trim().length > 0;
    });
}

function extractRefs(value: unknown): string[] {
    if (!value) return [];

    if (Array.isArray(value)) {
        const refs: string[] = [];
        for (const entry of value) {
            if (typeof entry === 'string') {
                const ref = normalizeWorkspaceRef(entry);
                if (ref) refs.push(ref);
                continue;
            }

            if (entry && typeof entry === 'object') {
                const record = entry as Record<string, unknown>;
                const ref = normalizeWorkspaceRef(record.ref ?? record.path ?? record.workspace_ref);
                if (ref) {
                    refs.push(ref);
                } else if (typeof record.id === 'string' && record.id) {
                    refs.push(record.id);
                }
            }
        }
        return refs;
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const ref = normalizeWorkspaceRef(record.ref ?? record.path ?? record.workspace_ref);
        if (ref) return [ref];
    }

    return [];
}

function dedupeRefs(refs: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ref of refs) {
        const normalized = normalizeWorkspaceRef(ref);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        out.push(normalized);
    }
    return out;
}

function ownerAliasRef(ref: string, authMethod?: string | null): string {
    if (authMethod === 'PATRIC') return ref;
    const normalized = normalizeWorkspaceRef(ref);
    if (!normalized) return '';
    const match = normalized.match(/^\/([^/@]+)@[^/]+\/(.*)$/);
    if (!match) return normalized;
    return `/${match[1]}/${match[2]}`;
}

function expandOwnerRef(ref: string, authMethod?: string | null): string {
    if (authMethod !== 'PATRIC') return ref;
    const normalized = normalizeWorkspaceRef(ref);
    if (!normalized) return '';
    const match = normalized.match(/^\/([^/@]+)\/modelseed\/(.+)$/);
    if (!match) return normalized;
    return `/${match[1]}@patricbrc.org/modelseed/${match[2]}`;
}

interface WorkspaceListingEntry {
    ref: string;
    id: string;
    type: string;
    timestamp: string;
}

function resolveWorkspaceLsRef(entry: unknown[]): string {
    const name = String(entry[0] ?? '').trim();
    const basePath = normalizeWorkspaceRef(entry[2]);
    if (!basePath && !name) return '';
    if (!basePath) return normalizeWorkspaceRef(name);

    // Workspace.ls returns parent folder path in entry[2], not full object path.
    if (name) {
        const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
        return normalizeWorkspaceRef(`${normalizedBase}${name}`);
    }

    return basePath;
}

function isContainerRef(ref: string, kind: 'fba' | 'gapfill'): boolean {
    const normalized = normalizeWorkspaceRef(ref).toLowerCase();
    if (!normalized) return false;
    if (kind === 'fba') {
        return normalized.endsWith('/fba');
    }
    return normalized.endsWith('/gapfill') || normalized.endsWith('/gapfilling');
}

function extractEntriesFromWorkspaceListing(
    payload: Record<string, unknown[]>,
    kind: 'fba' | 'gapfill',
): WorkspaceListingEntry[] {
    const entries: WorkspaceListingEntry[] = [];
    for (const value of Object.values(payload)) {
        if (!Array.isArray(value)) continue;
        for (const entry of value) {
            if (!Array.isArray(entry)) continue;

            const type = String(entry[1] ?? '').toLowerCase();
            if (!type || type.includes('folder')) continue;
            if (kind === 'fba' && type !== 'fba') continue;
            if (kind === 'gapfill' && !(type === 'gapfill' || type === 'gapfilling')) continue;

            const name = String(entry[0] ?? '');
            const ref = resolveWorkspaceLsRef(entry);
            if (!ref) continue;

            const id = name || ref.split('/').filter(Boolean).pop() || '';
            entries.push({
                ref,
                id,
                type,
                timestamp: formatRelativeTimestamp(entry[3]),
            });
        }
    }

    const deduped = new Map<string, WorkspaceListingEntry>();
    for (const entry of entries) {
        deduped.set(entry.ref, entry);
    }
    return Array.from(deduped.values());
}

function makeRowFromRef(ref: string, kind: 'fba' | 'gapfill', index: number): Record<string, unknown> {
    const normalized = normalizeWorkspaceRef(ref) || String(ref);
    const fallbackId = `${kind}-${index}`;
    const id = normalized.split('/').filter(Boolean).pop() || fallbackId;

    if (kind === 'fba') {
        return {
            id,
            ref: normalized,
            objective: '-',
            objectiveFunction: 'N/A',
            media: 'N/A',
            timestamp: '-',
        };
    }

    return {
        id,
        ref: normalized,
        integrated: '-',
        media: 'N/A',
        timestamp: '-',
    };
}

function normalizeJobStatus(status: string | undefined): string | undefined {
    if (!status) return undefined;
    const normalized = status.toLowerCase();
    if (normalized === 'complete') return 'completed';
    if (normalized === 'canceled') return 'cancelled';
    return normalized;
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

function extractFbaRows(
    fbaData: Record<string, unknown>[] | Record<string, unknown> | null | undefined,
    modelObject?: Record<string, unknown>,
    fallbackEntries: WorkspaceListingEntry[] = [],
): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    const seenRefs = new Set<string>();

    if (fbaData) {
        let rawRows: Record<string, unknown>[] = [];
        if (Array.isArray(fbaData)) {
            rawRows = fbaData;
        } else {
            const nestedCandidates = [
                asArray<Record<string, unknown>>(fbaData.fbas),
                asArray<Record<string, unknown>>(fbaData.results),
                asArray<Record<string, unknown>>(fbaData.data),
            ];
            const nestedRows = nestedCandidates.find((candidate) => candidate.length > 0) ?? [];
            rawRows = nestedRows.length > 0 ? nestedRows : (hasFbaPayloadFields(fbaData) ? [fbaData] : []);
        }

        for (let index = 0; index < rawRows.length; index += 1) {
            const fba = rawRows[index];
            const ref = normalizeWorkspaceRef(fba.ref ?? fba.path ?? fba.workspace_ref);
            if (ref && isContainerRef(ref, 'fba')) continue;
            const id = String(fba.id ?? extractRefId(ref) ?? `fba-${index}`);
            if (!ref && id.toLowerCase() === 'fba') continue;
            if (ref) seenRefs.add(ref);

            rows.push({
                id,
                ref,
                objective: String(fba.objective ?? '-'),
                objectiveFunction: String(fba.objective_function ?? 'N/A'),
                media: summarizeMediaRef(fba.media),
                timestamp: formatRelativeTimestamp(fba.timestamp ?? fba.rundate),
            });
        }
    }

    const modelRefs = modelObject
        ? [
            ...extractRefs(modelObject.fba_refs),
            ...extractRefs(modelObject.fbas),
            ...extractRefs(modelObject.fba),
        ]
        : [];

    const fallbackRefs = fallbackEntries.map((entry) => entry.ref);
    const allRefs = dedupeRefs([...modelRefs, ...fallbackRefs]);
    const nonContainerRefs = allRefs.filter((ref) => !isContainerRef(ref, 'fba'));
    const refsToUse = nonContainerRefs.length > 0 ? nonContainerRefs : allRefs;

    const fallbackByRef = new Map<string, WorkspaceListingEntry>(
        fallbackEntries.map((entry) => [entry.ref, entry]),
    );

    for (let index = 0; index < refsToUse.length; index += 1) {
        const ref = refsToUse[index];
        if (!ref || seenRefs.has(ref)) continue;

        const fallback = fallbackByRef.get(ref);
        if (fallback) {
            rows.push({
                id: fallback.id || makeRowFromRef(ref, 'fba', index).id,
                ref,
                objective: '-',
                objectiveFunction: 'N/A',
                media: 'N/A',
                timestamp: fallback.timestamp || '-',
            });
        } else {
            rows.push(makeRowFromRef(ref, 'fba', index));
        }
    }

    const deduped = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
        const key = String(row.ref ?? row.id ?? '');
        if (!key) continue;
        deduped.set(key, row);
    }

    return Array.from(deduped.values());
}

function extractGapfillRows(
    gapfills: Record<string, unknown>[] | undefined,
    modelObject?: Record<string, unknown>,
    fallbackEntries: WorkspaceListingEntry[] = [],
): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    const seenRefs = new Set<string>();

    for (const [index, gapfill] of asArray<Record<string, unknown>>(gapfills).entries()) {
        const ref = normalizeWorkspaceRef(gapfill.ref ?? gapfill.path ?? gapfill.workspace_ref);
        if (ref && isContainerRef(ref, 'gapfill')) continue;
        const id = String(gapfill.id ?? extractRefId(ref) ?? `gapfill-${index}`);
        if (!ref && (id.toLowerCase() === 'gapfill' || id.toLowerCase() === 'gapfilling')) continue;
        if (ref) seenRefs.add(ref);

        rows.push({
            id,
            ref,
            integrated: (gapfill.integrated ?? gapfill.integrated_solution) ? 'Yes' : 'No',
            media: summarizeMediaRef(gapfill.media),
            timestamp: formatRelativeTimestamp(gapfill.rundate ?? gapfill.timestamp),
        });
    }

    const modelRefs = modelObject
        ? [
            ...extractRefs(modelObject.gapfill_refs),
            ...extractRefs(modelObject.gapfilling_refs),
            ...extractRefs(modelObject.gapfills),
            ...extractRefs(modelObject.gapfillings),
        ]
        : [];

    const fallbackRefs = fallbackEntries.map((entry) => entry.ref);
    const allRefs = dedupeRefs([...modelRefs, ...fallbackRefs]);
    const nonContainerRefs = allRefs.filter((ref) => !isContainerRef(ref, 'gapfill'));
    const refsToUse = nonContainerRefs.length > 0 ? nonContainerRefs : allRefs;

    const fallbackByRef = new Map<string, WorkspaceListingEntry>(
        fallbackEntries.map((entry) => [entry.ref, entry]),
    );

    for (let index = 0; index < refsToUse.length; index += 1) {
        const ref = refsToUse[index];
        if (!ref || seenRefs.has(ref)) continue;

        const fallback = fallbackByRef.get(ref);
        if (fallback) {
            rows.push({
                id: fallback.id || makeRowFromRef(ref, 'gapfill', index).id,
                ref,
                integrated: '-',
                media: 'N/A',
                timestamp: fallback.timestamp || '-',
            });
        } else {
            rows.push(makeRowFromRef(ref, 'gapfill', index));
        }
    }

    const deduped = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
        const key = String(row.ref ?? row.id ?? '');
        if (!key) continue;
        deduped.set(key, row);
    }

    return Array.from(deduped.values());
}

function stringifyDetailValue(value: unknown): string {
    if (value == null || value === '') return '-';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return 'None';
        return value.map((entry) => stringifyDetailValue(entry)).join(', ');
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }
    return String(value);
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

interface ExternalLinkItem {
    name: string;
    url: string;
}

function extractExternalLinks(model: Record<string, unknown>): ExternalLinkItem[] {
    const links: ExternalLinkItem[] = [];

    // Add explicit genome links if metadata exists
    const genomeId = String(model.genome_id ?? '').trim();
    if (genomeId) {
        if (genomeId.includes('rast')) {
            links.push({
                name: 'RAST Genome',
                url: `https://rast.nmpdr.org/rast.cgi?page=GenomeView&genome=${genomeId}`,
            });
        } else {
            // Default to PATRIC (BV-BRC) link for standard genome IDs
            links.push({
                name: 'PATRIC Genome',
                url: `https://www.bv-brc.org/view/Genome/${genomeId}`,
            });
        }
    }

    const candidates = [
        model.links,
        model.external_links,
        model.organism_links,
    ];

    for (const candidate of candidates) {
        if (!Array.isArray(candidate)) continue;
        const candidateLinks = candidate
            .map((entry) => {
                if (!entry || typeof entry !== 'object') return null;
                const record = entry as Record<string, unknown>;
                const url = String(record.url ?? record.href ?? '').trim();
                if (!url) return null;
                const name = String(record.name ?? record.label ?? url).trim();
                return { name, url };
            })
            .filter((entry): entry is ExternalLinkItem => Boolean(entry));
        
        // Use candidate links if we don't have better ones yet
        if (candidateLinks.length > 0) {
            links.push(...candidateLinks);
            break;
        }
    }
    return links;
}

function OrganismLinksCard({
    model,
}: {
    model: Record<string, unknown>;
}) {
    const imageUrl = String(model.image ?? model.image_url ?? model.organism_image ?? '').trim();
    const organismName = String(model.organism_name ?? model.organism ?? model.scientific_name ?? model.name ?? '').trim();
    const taxonomy = String(model.taxonomy ?? '').trim();
    const genomeId = String(model.genome_id ?? '').trim();
    const links = extractExternalLinks(model);

    return (
        <Box
            sx={{
                p: 2.5,
                border: '1px solid #e0e0e0',
                borderRadius: 1.5,
                backgroundColor: '#fff',
                minWidth: 320,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                Organism & Taxonomy
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                {imageUrl && (
                    <Box
                        component="img"
                        src={imageUrl}
                        alt={organismName || 'Organism image'}
                        sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, border: '1px solid #eee' }}
                    />
                )}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
                        {organismName || 'Organism metadata unavailable'}
                    </Typography>
                    {genomeId && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 500 }}>
                            Genome ID: {genomeId}
                        </Typography>
                    )}
                </Box>
            </Box>

            {taxonomy && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Taxonomy
                    </Typography>
                    <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                        {taxonomy}
                    </Typography>
                </Box>
            )}

            <Divider sx={{ my: 1.5, opacity: 0.6 }} />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                External Resources
            </Typography>
            {links.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {links.map((link) => (
                        <Button
                            key={`${link.name}-${link.url}`}
                            component="a"
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            variant="outlined"
                            size="small"
                            sx={{
                                py: 0.5,
                                px: 1,
                                height: 24,
                                fontSize: '0.7rem',
                                textTransform: 'none',
                                borderColor: 'info.light',
                                color: 'info.main',
                                '&:hover': {
                                    borderColor: 'info.main',
                                    backgroundColor: 'info.50',
                                }
                            }}
                        >
                            {link.name}
                        </Button>
                    ))}
                </Box>
            ) : (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No external portal links available.
                </Typography>
            )}
        </Box>
    );
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
                        Legacy dynamic pathway maps are available from the FBA detail page via Visualize {'>'} FBA links.
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
                                    <Typography variant="body2">
                                        {typeof row.ref === 'string' && row.ref
                                            ? (
                                                <Link
                                                    href={toEncodedCatchallHref('/fba', row.ref)}
                                                    style={{ color: '#00acc1', textDecoration: 'none' }}
                                                >
                                                    {String(row.id ?? '-')}
                                                </Link>
                                            )
                                            : String(row.id ?? '-')}
                                    </Typography>
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
                                    <Typography variant="body2">
                                        {typeof row.ref === 'string' && row.ref
                                            ? (
                                                <Link
                                                    href={toEncodedCatchallHref('/gapfill', row.ref)}
                                                    style={{ color: '#00acc1', textDecoration: 'none' }}
                                                >
                                                    {String(row.id ?? '-')}
                                                </Link>
                                            )
                                            : String(row.id ?? '-')}
                                    </Typography>
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
    const { method: authMethod } = useAuth();
    const resolvedParams = use(params);
    const [loadingTooLong, setLoadingTooLong] = useState(false);
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
    const modelRootPath = workspacePath.endsWith('/model')
        ? workspacePath.slice(0, -('/model'.length))
        : workspacePath;
    const modelRootCandidates = useMemo(
        () => dedupeRefs([modelRootPath, ownerAliasRef(modelRootPath, authMethod), expandOwnerRef(modelRootPath, authMethod)]),
        [modelRootPath, authMethod],
    );

    const workspaceCandidates = useMemo(() => {
        if (!workspacePath || workspacePath === '/') return [workspacePath];
        const base = workspacePath.endsWith('/') ? workspacePath.slice(0, -1) : workspacePath;
        return base.endsWith('/model') ? [base] : [base, `${base}/model`];
    }, [workspacePath]);

    const { data: modelData, isLoading, error, refetch: refetchModelData } = useQuery({
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
        staleTime: 60_000, // Cache for 1 minute
    });

    // Track loading timeout - show error message after 15 seconds
    useEffect(() => {
        if (!isLoading) {
            setLoadingTooLong(false);
            return;
        }
        const timeout = setTimeout(() => setLoadingTooLong(true), 15_000);
        return () => clearTimeout(timeout);
    }, [isLoading]);

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

    const modelFbaRef = useMemo(() => {
        // Only fetch FBA if we're on a specific model, not a folder
        // A model path should have at least 3 segments and NOT end with /modelseed
        const segments = workspacePath.split('/').filter(Boolean);
        if (segments.length >= 3 && !workspacePath.toLowerCase().endsWith('/modelseed')) {
            const modelPath = workspacePath.endsWith('/model') ? workspacePath : `${workspacePath}/model`;
            return modelPath;
        }
        return null;
    }, [workspacePath]);

    const { data: modelFba, error: modelFbaError, refetch: refetchModelFba } = useQuery({
        queryKey: ['modelFba', USE_MODELSEED_API, modelFbaRef],
        enabled: USE_MODELSEED_API && modelFbaRef !== null,
        queryFn: async () => getModelFbaFromApi(modelFbaRef!),
        retry: 0,
        staleTime: 0,
    });

    const { data: modelGapfills, error: modelGapfillsError, refetch: refetchModelGapfills } = useQuery({
        queryKey: ['modelGapfills', USE_MODELSEED_API, modelFbaRef],
        enabled: USE_MODELSEED_API && modelFbaRef !== null,
        queryFn: async () => listModelGapfillsFromApi(modelFbaRef!),
        retry: 0,
        staleTime: 0,
    });

    const { data: workspaceFbaEntries = [], refetch: refetchWorkspaceFbaRefs } = useQuery({
        queryKey: ['modelWorkspaceFbaRefs', ...modelRootCandidates],
        enabled: modelRootCandidates.length > 0,
        queryFn: async () => {
            const candidates = dedupeRefs(modelRootCandidates.flatMap((root) => [
                `${root}/fba`,
                `${root}/FBA`,
            ]));
            const entries: WorkspaceListingEntry[] = [];
            for (const path of candidates) {
                try {
                    const payload = await workspaceLs([path]);
                    entries.push(...extractEntriesFromWorkspaceListing(payload, 'fba'));
                } catch {
                    // Ignore missing folders and try next candidate.
                }
            }
            const byRef = new Map<string, WorkspaceListingEntry>();
            for (const entry of entries) byRef.set(entry.ref, entry);
            return Array.from(byRef.values());
        },
        staleTime: 0,
    });

    const { data: workspaceGapfillEntries = [], refetch: refetchWorkspaceGapfillRefs } = useQuery({
        queryKey: ['modelWorkspaceGapfillRefs', ...modelRootCandidates],
        enabled: modelRootCandidates.length > 0,
        queryFn: async () => {
            const candidates = dedupeRefs(modelRootCandidates.flatMap((root) => [
                `${root}/gapfill`,
                `${root}/gapfilling`,
                `${root}/Gapfill`,
            ]));
            const entries: WorkspaceListingEntry[] = [];
            for (const path of candidates) {
                try {
                    const payload = await workspaceLs([path]);
                    entries.push(...extractEntriesFromWorkspaceListing(payload, 'gapfill'));
                } catch {
                    // Ignore missing folders and try next candidate.
                }
            }
            const byRef = new Map<string, WorkspaceListingEntry>();
            for (const entry of entries) byRef.set(entry.ref, entry);
            return Array.from(byRef.values());
        },
        staleTime: 0,
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
    // Enhanced editing states
    const [addReactionsOpen, setAddReactionsOpen] = useState(false);
    const [reactionsToAdd, setReactionsToAdd] = useState<{ id: string; name: string; equation?: string; direction?: string }[]>([]);
    const [selectedReactionsToRemove, setSelectedReactionsToRemove] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set<string>() });
    const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
    const lastTrackedStatusesRef = useRef(new Map<string, string | undefined>());

    // Hooks that must be before early returns
    const pathname = usePathname();
    const userDataTabs = [
        { label: 'My Models', href: '/my-models' },
        { label: 'My Media', href: '/myMedia' },
        { label: 'My Jobs', href: '/my-jobs' },
    ];
    const activeUserTab = useMemo(() => {
        const idx = userDataTabs.findIndex((t) => pathname.startsWith(t.href));
        return idx >= 0 ? idx : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- userDataTabs is stable
    }, [pathname]);
    const isUserDataModel = useMemo(() => {
        return true;
    }, []);

    useEffect(() => {
        const syncTrackedJobs = () => {
            setTrackedJobs(listTrackedJobs());
        };

        syncTrackedJobs();
        window.addEventListener('storage', syncTrackedJobs);
        return () => window.removeEventListener('storage', syncTrackedJobs);
    }, []);

    const trackedJobsForModel = useMemo(() => {
        return trackedJobs.filter((job) => {
            const jobRelatedRef = typeof job.relatedRef === 'string' ? job.relatedRef : '';
            const normalizedRef = jobRelatedRef.startsWith('/') ? jobRelatedRef : `/${jobRelatedRef}`;
            return normalizedRef === workspacePath;
        });
    }, [trackedJobs, workspacePath]);

    const trackedJobIds = useMemo(() => trackedJobsForModel.map((job) => job.id), [trackedJobsForModel]);

    const { data: trackedJobStatuses = [] } = useQuery({
        queryKey: ['modelDetailTrackedJobs', trackedJobIds],
        enabled: USE_MODELSEED_API && trackedJobIds.length > 0,
        queryFn: async () => getJobsFromApi(trackedJobIds),
        refetchInterval: trackedJobIds.length > 0 ? 5000 : false,
        staleTime: 0,
    });

    const trackedStatusById = useMemo(() => {
        const map = new Map<string, string | undefined>();
        for (const statusEntry of trackedJobStatuses) {
            if (!statusEntry || typeof statusEntry.id !== 'string') continue;
            map.set(statusEntry.id, normalizeJobStatus(statusEntry.status));
        }
        return map;
    }, [trackedJobStatuses]);

    useEffect(() => {
        if (trackedJobsForModel.length === 0) {
            lastTrackedStatusesRef.current.clear();
            return;
        }

        const nextStatuses = new Map<string, string | undefined>();
        const terminalJobIds: string[] = [];
        let shouldRefetchFba = false;
        let shouldRefetchGapfills = false;
        let shouldRefetchModel = false;

        for (const job of trackedJobsForModel) {
            const currentStatus = trackedStatusById.get(job.id);
            const previousStatus = lastTrackedStatusesRef.current.get(job.id);
            const becameTerminal = Boolean(
                currentStatus
                && isTerminalJobStatus(currentStatus)
                && !isTerminalJobStatus(previousStatus),
            );

            if (becameTerminal) {
                terminalJobIds.push(job.id);
                shouldRefetchModel = true;
                if (currentStatus === 'completed') {
                    if (job.kind === 'fba') shouldRefetchFba = true;
                    if (job.kind === 'gapfill') shouldRefetchGapfills = true;
                }
            }

            nextStatuses.set(job.id, currentStatus);
        }

        lastTrackedStatusesRef.current = nextStatuses;

        if (shouldRefetchFba) {
            void refetchModelFba();
            void refetchWorkspaceFbaRefs();
        }
        if (shouldRefetchGapfills) {
            void refetchModelGapfills();
            void refetchWorkspaceGapfillRefs();
        }
        if (shouldRefetchModel) {
            void refetchModelData();
        }

        if (terminalJobIds.length > 0) {
            for (const jobId of terminalJobIds) {
                removeTrackedJob(jobId);
            }
            setTrackedJobs(listTrackedJobs());
        }
    }, [
        trackedJobsForModel,
        trackedStatusById,
        refetchModelData,
        refetchModelFba,
        refetchModelGapfills,
        refetchWorkspaceFbaRefs,
        refetchWorkspaceGapfillRefs,
    ]);

    // Enhanced edit handlers — MUST be before early returns to satisfy Rules of Hooks
    const handleAddReactions = useCallback((reactions: { id: string; name: string; equation?: string }[]) => {
        setReactionsToAdd((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const newRxns = reactions.filter((r) => !existingIds.has(r.id));
            return [...prev, ...newRxns];
        });
        setAddReactionsOpen(false);
    }, []);

    const handleRemovePendingReaction = useCallback((id: string) => {
        setReactionsToAdd((prev) => prev.filter((r) => r.id !== id));
    }, []);

    // Must be above early returns to satisfy Rules of Hooks
    const existingReactionIds = useMemo(() => {
        if (!modelData) return [];
        const obj = parseWorkspaceGetObject<Record<string, unknown>>(modelData) ?? {};
        const config = buildTableConfig(obj);
        return config.reactions.rows.map((r) => String(r.id ?? '').replace(/_[a-z]\d+$/, ''));
    }, [modelData]);

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
            <Box sx={{ p: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <CircularProgress />
                {loadingTooLong && (
                    <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>Loading is taking longer than expected</AlertTitle>
                            The model at <strong>{workspacePath}</strong> may not exist or the API may be unavailable.
                        </Alert>
                        <Button variant="outlined" onClick={() => router.push('/my-models')}>
                            Return to My Models
                        </Button>
                    </Box>
                )}
            </Box>
        );
    }

    const modelObject = parseWorkspaceGetObject<Record<string, unknown>>(modelData) ?? {};
    const modelName = String(modelObject.id ?? modelSegments[modelSegments.length - 1] ?? 'Unknown Model');
    const modelSpecies = String(modelObject.name ?? '');
    const tableConfig = buildTableConfig(modelObject);
    const fbaRows = extractFbaRows(modelFba, modelObject, workspaceFbaEntries);
    const gapfillRows = extractGapfillRows(modelGapfills, modelObject, workspaceGapfillEntries);
    const expressionRows = extractExpressionRows(modelObject);
    if (tableConfig.fba) {
        tableConfig.fba.rows = fbaRows;
    }
    if (tableConfig.gapfill) {
        tableConfig.gapfill.rows = gapfillRows;
    }
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

    const fbaColumns: GridColDef<Record<string, unknown>>[] = [
        {
            field: 'id',
            headerName: 'ID',
            width: 180,
            renderCell: (params) => {
                const fbaId = params.value;
                const fbaHref = `/fba${workspacePath}/fba/${fbaId}`;
                return (
                    <Link href={fbaHref} style={{ color: '#00acc1', textDecoration: 'none' }}>
                        {String(params.value ?? '')}
                    </Link>
                );
            },
        },
        { field: 'objective', headerName: 'Objective', width: 140 },
        { field: 'objectiveFunction', headerName: 'Objective Function', width: 200 },
        { field: 'media', headerName: 'Media', width: 180 },
        { field: 'timestamp', headerName: 'Time', width: 180 },
    ];

    const pathwayColumns: GridColDef<Record<string, unknown>>[] = [
        { field: 'id', headerName: 'ID', width: 180 },
        { field: 'name', headerName: 'Name', width: 300 },
        {
            field: 'reactions',
            headerName: 'Rxns',
            width: 120,
            type: 'number',
        },
        {
            field: 'compounds',
            headerName: 'Cpds',
            width: 120,
            type: 'number',
        },
    ];

    const handleTabChange = (_event: React.SyntheticEvent, nextIndex: number) => {
        const tab = MODEL_TABS[nextIndex];
        if (!tab) return;
        const basePath = `/model${workspacePath}`;
        const nextPath = tab.key === 'overview' ? basePath : `${basePath}/${tab.key}`;
        router.push(nextPath);
    };

    const submitModelJob = async (kind: 'fba' | 'gapfill', media?: string) => {
        setActionLoading(kind);
        setActionMessage(null);
        const selectedMedia = media || defaultMedia;
        try {
            const payload =
                kind === 'fba'
                    ? await submitFbaJobFromApi({
                        model: workspaceCandidates[0],
                        media: selectedMedia,
                        media_supplement: [],
                    })
                    : await submitGapfillJobFromApi({
                        model: workspaceCandidates[0],
                        template_type: 'gn',
                        media: selectedMedia,
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
                setTrackedJobs(listTrackedJobs());
            }
            setActionMessage(
                jobId
                    ? `${kind === 'fba' ? 'FBA' : 'Gapfill'} job submitted. Job ID: ${jobId}. Results will appear automatically when ready.`
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

    // handleAddReactions and handleRemovePendingReaction moved above early returns

    const handleSubmitBatchEdit = async () => {
        // GridRowSelectionModel is now { type: 'include', ids: Set<string> }
        const removeIds = selectedReactionsToRemove.type === 'include' 
            ? Array.from(selectedReactionsToRemove.ids).map(String).filter(Boolean)
            : [];
        const addIds = reactionsToAdd.map((r) => r.id);
        
        if (removeIds.length === 0 && addIds.length === 0) {
            setEditMessage('No reactions selected to add or remove.');
            return;
        }

        setEditSubmitting(true);
        setEditMessage(null);
        try {
            await editModelFromApi({
                model: workspaceCandidates[0],
                reactions_to_remove: removeIds,
                reactions_to_add: addIds.map((id) => ({ id, compartment: 'c0', direction: '=' })),
                reactions_to_modify: [],
                biomass_changes: [],
                summary: editSummary.trim() || `Added ${addIds.length} reactions, removed ${removeIds.length} reactions`,
            });
            await refetchModelEdits();
            setEditMessage(`Edit submitted: added ${addIds.length} reactions, removed ${removeIds.length} reactions.`);
            // Clear pending changes
            setReactionsToAdd([]);
            setSelectedReactionsToRemove({ type: 'include', ids: new Set<string>() });
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

    // Number of selected reactions to remove
    const numSelectedToRemove = selectedReactionsToRemove.type === 'include' 
        ? selectedReactionsToRemove.ids.size 
        : 0;

    // existingReactionIds moved above early returns

    return (
        <Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 4 } }}>
            <ModelDetailHeader
                modelName={modelName}
                visualizeOption={visualizeOption}
                onVisualizeChange={setVisualizeOption}
                onRunFba={(mediaId?: string, mediaName?: string) => void submitModelJob('fba', mediaName)}
                onRunGapfill={(mediaId?: string, mediaName?: string) => void submitModelJob('gapfill', mediaName)}
                actionLoading={actionLoading}
                actionMessage={actionMessage}
            />

            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                <OrganismLinksCard model={modelObject} />
                <Box sx={{ mt: 1 }}>
                    <DownloadModelMenu
                        modelRef={workspaceCandidates[0]}
                        modelId={modelName}
                        buttonLabel="Download options"
                        helperText="Export this model as SBML, JSON, or TSV."
                    />
                </Box>
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

            {isUserDataModel && (
                <Box
                    sx={{
                        backgroundColor: '#2D224E',
                        borderBottom: '1px solid #ccc',
                        px: 1.5,
                        mt: 2,
                    }}
                >
                    <Tabs
                        value={activeUserTab}
                        variant="scrollable"
                        scrollButtons="auto"
                        TabIndicatorProps={{ sx: { display: 'none' } }}
                        sx={{
                            minHeight: 48,
                            '& .MuiTab-root': {
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '1rem',
                                fontWeight: 400,
                                textTransform: 'none',
                                minHeight: 48,
                                borderRight: '1px solid #bbb',
                                px: 2.5,
                                '&.Mui-selected': {
                                    color: '#fff',
                                    fontWeight: 600,
                                },
                                '&:hover': {
                                    color: '#fff',
                                },
                            },
                        }}
                    >
                        {userDataTabs.map((tab) => (
                            <Tab
                                key={tab.label}
                                label={tab.label}
                                component={Link}
                                href={tab.href}
                            />
                        ))}
                    </Tabs>
                </Box>
            )}

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
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Enhanced Model Editor */}
                            <Box>
                                <Typography variant="h6" gutterBottom>Add Reactions</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Search and select reactions from the ModelSEED biochemistry database to add to this model.
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => setAddReactionsOpen(true)}
                                    >
                                        Add Reactions
                                    </Button>
                                    {reactionsToAdd.length > 0 && (
                                        <Chip 
                                            label={`${reactionsToAdd.length} pending`} 
                                            color="primary" 
                                            size="small" 
                                        />
                                    )}
                                </Stack>
                                {reactionsToAdd.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Reactions to add:
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {reactionsToAdd.map((rxn) => (
                                                <Chip
                                                    key={rxn.id}
                                                    label={`${rxn.id} - ${rxn.name}`}
                                                    onDelete={() => handleRemovePendingReaction(rxn.id)}
                                                    size="small"
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>

                            <Divider />

                            {/* Remove Reactions Section */}
                            <Box>
                                <Typography variant="h6" gutterBottom>Remove Reactions</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Select reactions from the model to remove. Changes are applied when you submit the edit.
                                </Typography>
                                <Box sx={{ height: 300 }}>
                                    <DataGrid<Record<string, unknown>>
                                        rows={tableConfig.reactions.rows}
                                        columns={[
                                            { field: 'id', headerName: 'ID', flex: 0.8 },
                                            { field: 'name', headerName: 'Name', flex: 1.5 },
                                            { field: 'direction', headerName: 'Dir', flex: 0.3 },
                                            { field: 'equation', headerName: 'Equation', flex: 2 },
                                        ]}
                                        checkboxSelection
                                        disableRowSelectionOnClick
                                        rowSelectionModel={selectedReactionsToRemove}
                                        onRowSelectionModelChange={setSelectedReactionsToRemove}
                                        pageSizeOptions={[10, 25, 50]}
                                        getRowId={(row) => String(row.id ?? '')}
                                        density="compact"
                                    />
                                </Box>
                                {numSelectedToRemove > 0 && (
                                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                        {numSelectedToRemove} reaction{numSelectedToRemove > 1 ? 's' : ''} selected for removal
                                    </Typography>
                                )}
                            </Box>

                            <Divider />

                            {/* Submit Section */}
                            <Box sx={{ maxWidth: 720 }}>
                                <Typography variant="h6" gutterBottom>Submit Changes</Typography>
                                <TextField
                                    label="Edit summary"
                                    value={editSummary}
                                    onChange={(event) => setEditSummary(event.target.value)}
                                    placeholder="Optional note for this change"
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    sx={{ mb: 2 }}
                                />
                                {editMessage && (
                                    <Alert 
                                        severity={editMessage.includes('submitted') || editMessage.includes('Edit submitted') ? 'success' : 'error'}
                                        sx={{ mb: 2 }}
                                    >
                                        {editMessage}
                                    </Alert>
                                )}
                                <Stack direction="row" spacing={2}>
                                    <Button
                                        variant="contained"
                                        onClick={() => void handleSubmitBatchEdit()}
                                        disabled={editSubmitting || (reactionsToAdd.length === 0 && numSelectedToRemove === 0)}
                                    >
                                        {editSubmitting ? 'Submitting...' : `Submit Edit (${reactionsToAdd.length} add, ${numSelectedToRemove} remove)`}
                                    </Button>
                                </Stack>
                            </Box>

                            <Divider />

                            {/* Legacy single reaction remove (kept for backwards compatibility) */}
                            <Box sx={{ maxWidth: 720 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Quick remove (legacy)
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <TextField
                                        label="Reaction ID to remove"
                                        value={editReactionId}
                                        onChange={(event) => setEditReactionId(event.target.value)}
                                        placeholder="rxn00001_c0"
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={() => void handleSubmitEdit()}
                                        disabled={editSubmitting || !editReactionId.trim()}
                                        size="small"
                                    >
                                        Remove
                                    </Button>
                                </Stack>
                            </Box>

                            <Divider />

                            {/* Edit History */}
                            <Box>
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

                            {/* Add Reactions Dialog */}
                            <AddReactionsDialog
                                open={addReactionsOpen}
                                onClose={() => setAddReactionsOpen(false)}
                                onAdd={handleAddReactions}
                                excludeIds={existingReactionIds}
                            />
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
                                            : tab.key === 'fba'
                                                ? fbaColumns
                                                : tab.key === 'pathways'
                                                    ? pathwayColumns
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
                <Box sx={{ width: { xs: 320, md: 420 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight={600}>{detailDrawer?.title ?? 'Details'}</Typography>
                        <Button onClick={() => setDetailDrawer(null)} sx={{ textTransform: 'none' }}>
                            Close
                        </Button>
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {(detailDrawer ? extractDetailEntries(detailDrawer.row) : []).map((entry) => (
                            <Box key={entry.key} sx={{ borderBottom: '1px solid #f0f0f0', pb: 1.5, '&:last-child': { borderBottom: 0 } }}>
                                <Typography 
                                    variant="caption" 
                                    color="primary" 
                                    fontWeight={800} 
                                    sx={{ 
                                        mb: 0.75, 
                                        display: 'block',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontSize: '0.65rem'
                                    }}
                                >
                                    {entry.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        wordBreak: 'break-word', 
                                        whiteSpace: 'pre-wrap', 
                                        color: 'text.primary', 
                                        lineHeight: 1.6,
                                        backgroundColor: entry.value.startsWith('{') || entry.value.startsWith('[') ? '#fcfcfc' : 'transparent',
                                        fontFamily: entry.value.startsWith('{') || entry.value.startsWith('[') ? 'monospace' : 'inherit',
                                        p: entry.value.startsWith('{') || entry.value.startsWith('[') ? 1 : 0,
                                        borderRadius: 0.5,
                                        fontSize: entry.value.startsWith('{') || entry.value.startsWith('[') ? '0.75rem' : '0.875rem'
                                    }}
                                >
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
