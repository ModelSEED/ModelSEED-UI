'use client';

import { use, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Link from 'next/link';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';

import { getModelFbaFromApi } from '@/lib/api/modelseed';
import { useAuth } from '@/components/auth/AuthProvider';
import { workspaceGet, workspaceLs, workspaceDownloadUrl, parseWorkspaceGetObject } from '@/lib/api/workspace';
import { USE_MODELSEED_API } from '@/lib/api/config';
import DataControlHeader from '@/components/layout/DataControlHeader';

/* ---------- types ---------- */

interface FbaReactionFlux {
    id: string;
    reaction: string;
    name: string;
    flux: number;
    min: number;
    max: number;
    class: string;
    equation?: string;
}

interface FbaExchangeFlux {
    id: string;
    compound: string;
    name: string;
    flux: number;
    min: number;
    max: number;
    class: string;
}

interface FbaPathwayMap {
    id: string;
    name: string;
    rxnCount: number;
    cpdCount: number;
    mapPath: string;
    imagePath: string;
}

interface FbaMapTabState {
    id: string;
    name: string;
    mapData: Record<string, unknown> | null;
    imageData: string | null;
    loading: boolean;
    error: string | null;
}

interface MapReaction {
    id: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rxns: string[];
}

const LEGACY_MAP_ROOTS = ['/nconrad/public/maps', '/chenry/public/maps'];
const BASE_FBA_TAB_COUNT = 3;

/* ---------- helpers ---------- */

function extractModelRef(fbaPath: string): string {
    // Legacy FBA object paths are like /<user>/modelseed/<Model>/fba/fba.0
    // Folder-level paths may end with /fba. Both should resolve to the model path.
    const normalized = normalizeWorkspaceRef(fbaPath);
    if (normalized.toLowerCase().endsWith('/fba')) {
        return normalized.slice(0, -('/fba'.length));
    }

    const fbaIdx = normalized.toLowerCase().lastIndexOf('/fba/');
    if (fbaIdx > 0) return normalized.substring(0, fbaIdx);

    // Smarter fallback: if '/modelseed/' exists, the model is the segment immediately following it.
    const segments = fbaPath.split('/').filter(Boolean);
    const msIdx = segments.findIndex(s => s.toLowerCase() === 'modelseed');
    if (msIdx >= 0 && segments.length > msIdx + 1) {
        return '/' + segments.slice(0, msIdx + 2).join('/');
    }

    // Fallback: strip last two segments (object id + container)
    if (segments.length >= 3) return '/' + segments.slice(0, -2).join('/');
    return normalized;
}

function extractFbaName(fbaPath: string): string {
    const parts = fbaPath.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'FBA';
}

function extractModelName(fbaPath: string): string {
    const modelRef = extractModelRef(fbaPath);
    const parts = modelRef.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'Model';
}

function normalizeWorkspaceRef(value: string): string {
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
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

function isFbaContainerRef(ref: string): boolean {
    const normalized = normalizeWorkspaceRef(ref).toLowerCase();
    return normalized.endsWith('/fba');
}

function isFbaObjectData(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const data = value as Record<string, unknown>;
    return (
        Array.isArray(data.FBAReactionVariables)
        || Array.isArray(data.fba_reaction_variables)
        || Array.isArray(data.FBACompoundVariables)
        || Array.isArray(data.fba_compound_variables)
        || 'objective' in data
        || 'objective_value' in data
        || 'status' in data
    );
}

function resolveWorkspaceLsRef(entry: unknown[]): string {
    const name = String(entry[0] ?? '').trim();
    const basePath = normalizeWorkspaceRef(String(entry[2] ?? ''));
    if (!basePath && !name) return '';
    if (!basePath) return normalizeWorkspaceRef(name);

    // Workspace.ls entry[2] is parent path; append object name to build full ref.
    if (name) {
        const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
        return normalizeWorkspaceRef(`${normalizedBase}${name}`);
    }

    return basePath;
}

function extractFbaObjectRefsFromLs(payload: Record<string, unknown[]>): string[] {
    const refs: Array<{ ref: string; ts: number }> = [];
    for (const value of Object.values(payload)) {
        if (!Array.isArray(value)) continue;
        for (const entry of value) {
            if (!Array.isArray(entry)) continue;
            const type = String(entry[1] ?? '').toLowerCase();
            if (type !== 'fba') continue;
            const ref = resolveWorkspaceLsRef(entry);
            if (!ref || isFbaContainerRef(ref)) continue;
            const ts = Number.isFinite(new Date(String(entry[3] ?? '')).getTime())
                ? new Date(String(entry[3] ?? '')).getTime()
                : 0;
            refs.push({ ref, ts });
        }
    }

    refs.sort((a, b) => b.ts - a.ts);
    return dedupeRefs(refs.map((item) => item.ref));
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

function countCsvValues(value: unknown): number {
    if (typeof value !== 'string' || value.trim().length === 0) return 0;
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .length;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? value as T[] : [];
}

function toKeggRoot(mapRoot: string): string {
    return mapRoot.replace(/\/maps\/?$/, '/kegg').replace(/\/+$/, '');
}

function extractLsEntries(payload: Record<string, unknown[]>): unknown[][] {
    for (const value of Object.values(payload)) {
        if (Array.isArray(value)) {
            return value as unknown[][];
        }
    }
    return [];
}

function parsePathwayMapsFromLs(payload: Record<string, unknown[]>, mapRoot: string): FbaPathwayMap[] {
    const normalizedRoot = mapRoot.replace(/\/+$/, '');
    const keggRoot = toKeggRoot(normalizedRoot);
    const rows = extractLsEntries(payload);

    return rows
        .filter((entry): entry is unknown[] => Array.isArray(entry))
        .map((entry) => {
            const id = String(entry[0] ?? '').trim();
            if (!id) return null;
            const metadata = asRecord(entry[7]);
            const name = String(metadata.name ?? id);

            return {
                id,
                name,
                rxnCount: countCsvValues(metadata.reaction_ids),
                cpdCount: countCsvValues(metadata.compound_ids),
                mapPath: `${normalizedRoot}/${id}`,
                imagePath: `${keggRoot}/${id}.png`,
            } satisfies FbaPathwayMap;
        })
        .filter((item): item is FbaPathwayMap => Boolean(item));
}

function pickFbaObject(payload: unknown, workspacePath: string, fbaName: string): Record<string, unknown> | null {
    const targetRef = normalizeWorkspaceRef(workspacePath);
    const targetName = fbaName.toLowerCase();

    if (!payload) return null;

    const candidates: Record<string, unknown>[] = [];
    if (Array.isArray(payload)) {
        for (const item of payload) {
            if (item && typeof item === 'object') {
                candidates.push(item as Record<string, unknown>);
            }
        }
    } else if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        candidates.push(record);
        const nested = [record.fbas, record.results, record.data];
        for (const group of nested) {
            for (const item of asArray<Record<string, unknown>>(group)) {
                candidates.push(item);
            }
        }
    }

    for (const candidate of candidates) {
        const ref = normalizeWorkspaceRef(String(candidate.ref ?? candidate.path ?? candidate.workspace_ref ?? ''));
        const id = String(candidate.id ?? candidate.name ?? '').toLowerCase();
        if (ref && ref === targetRef) return candidate;
        if (id && id === targetName) return candidate;
        if (ref && ref.endsWith(`/${fbaName}`)) return candidate;
    }

    return candidates[0] ?? null;
}

function normalizeMapReactionIds(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}

function parseMapReactions(mapData: Record<string, unknown> | null): MapReaction[] {
    if (!mapData) return [];
    return asArray<Record<string, unknown>>(mapData.reactions).map((reaction, index) => ({
        id: String(reaction.id ?? `rxn-${index}`),
        name: String(reaction.name ?? reaction.id ?? ''),
        x: Number(reaction.x ?? 0),
        y: Number(reaction.y ?? 0),
        w: Math.max(12, Number(reaction.w ?? 28)),
        h: Math.max(8, Number(reaction.h ?? 14)),
        rxns: normalizeMapReactionIds(reaction.rxns),
    }));
}

function mapCanvasSize(reactions: MapReaction[]): { width: number; height: number } {
    if (reactions.length === 0) {
        return { width: 900, height: 1100 };
    }

    let maxX = 900;
    let maxY = 1000;

    for (const reaction of reactions) {
        maxX = Math.max(maxX, reaction.x + reaction.w * 2 + 60);
        maxY = Math.max(maxY, reaction.y + reaction.h * 2 + 60);
    }

    return {
        width: Math.ceil(maxX),
        height: Math.ceil(maxY),
    };
}

function baseReactionId(value: string): string {
    return value.replace(/_[a-z]\d*$/i, '');
}

function buildFluxByReaction(rxnFluxes: FbaReactionFlux[]): Map<string, number> {
    const fluxes = new Map<string, number>();
    for (const row of rxnFluxes) {
        const key = baseReactionId(row.reaction);
        const existing = fluxes.get(key);
        if (existing == null || Math.abs(row.flux) > Math.abs(existing)) {
            fluxes.set(key, row.flux);
        }
    }
    return fluxes;
}

function mapReactionFlux(reactionIds: string[], fluxByReaction: Map<string, number>): number | null {
    let selected: number | null = null;
    for (const reactionId of reactionIds) {
        const flux = fluxByReaction.get(baseReactionId(reactionId));
        if (flux == null) continue;
        if (selected == null || Math.abs(flux) > Math.abs(selected)) {
            selected = flux;
        }
    }
    return selected;
}

function fluxColor(flux: number | null, maxAbsFlux: number): string {
    if (flux == null) return 'rgba(255, 255, 255, 0.2)';
    const ratio = Math.min(1, Math.abs(flux) / Math.max(1e-6, maxAbsFlux));
    const alpha = 0.3 + ratio * 0.65;
    if (flux >= 0) {
        return `rgba(230, 57, 70, ${alpha.toFixed(3)})`;
    }
    return `rgba(69, 123, 157, ${alpha.toFixed(3)})`;
}

function toImageSrc(data: string | null): string | null {
    if (!data) return null;
    const trimmed = data.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:image')) return trimmed;
    return `data:image/png;base64,${trimmed}`;
}

function parseReactionFluxes(data: Record<string, unknown>): FbaReactionFlux[] {
    const vars = (data.FBAReactionVariables ?? data.fba_reaction_variables) as Record<string, unknown>[] | undefined;
    if (!Array.isArray(vars)) return [];
    return vars.map((v, idx) => {
        const rxnRef = String(v.modelreaction_ref ?? v.reaction_ref ?? v.ref ?? '');
        const rxnId = rxnRef.split('/').pop() ?? `rxn-${idx}`;
        return {
            id: rxnId + '-' + idx,
            reaction: rxnId,
            name: String(v.name ?? rxnId),
            flux: Number(v.value ?? v.flux ?? 0),
            min: Number(v.lowerBound ?? v.min ?? 0),
            max: Number(v.upperBound ?? v.max ?? 0),
            class: String(v.class ?? v.variableType ?? ''),
            equation: v.equation ? String(v.equation) : undefined,
        };
    });
}

function parseExchangeFluxes(data: Record<string, unknown>): FbaExchangeFlux[] {
    const vars = (data.FBACompoundVariables ?? data.fba_compound_variables) as Record<string, unknown>[] | undefined;
    if (!Array.isArray(vars)) return [];
    return vars.map((v, idx) => {
        const cpdRef = String(v.modelcompound_ref ?? v.compound_ref ?? v.ref ?? '');
        const cpdId = cpdRef.split('/').pop() ?? `cpd-${idx}`;
        return {
            id: cpdId + '-' + idx,
            compound: cpdId,
            name: String(v.name ?? cpdId),
            flux: Number(v.value ?? v.flux ?? 0),
            min: Number(v.lowerBound ?? v.min ?? 0),
            max: Number(v.upperBound ?? v.max ?? 0),
            class: String(v.class ?? v.variableType ?? ''),
        };
    });
}

/* ---------- component ---------- */

export default function FbaPage({ params }: { params: Promise<{ path: string[] }> }) {
    const { method: authMethod } = useAuth();
    const resolvedParams = use(params);
    const workspacePath = `/${resolvedParams.path.join('/')}`;
    const modelRef = extractModelRef(workspacePath);
    const fbaName = extractFbaName(workspacePath);
    const modelName = extractModelName(workspacePath);

    const [tabIndex, setTabIndex] = useState(0);
    const [rxnPagination, setRxnPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [rxnSort, setRxnSort] = useState<GridSortModel>([]);
    const [exchPagination, setExchPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [exchSort, setExchSort] = useState<GridSortModel>([]);
    const [mapPagination, setMapPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [mapSort, setMapSort] = useState<GridSortModel>([]);
    const [mapTabs, setMapTabs] = useState<FbaMapTabState[]>([]);

    const { apiCandidates, workspaceCandidates } = useMemo(() => {
        const base = workspacePath.endsWith('/') ? workspacePath.slice(0, -1) : workspacePath;
        const modelBase = modelRef.endsWith('/') ? modelRef.slice(0, -1) : modelRef;
        
        const expandedWs = expandOwnerRef(base, authMethod);
        const wsBases = [expandedWs];
        if (expandedWs !== base) wsBases.push(base);

        const expandedModel = expandOwnerRef(modelBase, authMethod);
        const modelBases = [expandedModel];
        if (expandedModel !== modelBase) modelBases.push(modelBase);

        const wsCandidates: string[] = [];
        for (const b of wsBases) {
            wsCandidates.push(b);
            if (!b.endsWith('/model')) wsCandidates.push(`${b}/model`);
        }

        return {
            apiCandidates: dedupeRefs(modelBases),
            workspaceCandidates: dedupeRefs(wsCandidates),
        };
    }, [workspacePath, modelRef, authMethod]);

    const { data: fbaData, isLoading, error } = useQuery({
        queryKey: ['fbaDetail', workspacePath, modelRef],
        queryFn: async () => {
            // Try model-level FBA from API first using base paths
            if (USE_MODELSEED_API) {
                for (const candidate of apiCandidates) {
                    try {
                        const result = await getModelFbaFromApi(candidate);
                        const selected = pickFbaObject(result, workspacePath, fbaName);
                        if (selected && typeof selected === 'object' && isFbaObjectData(selected)) return selected;
                    } catch {
                        // Fall through to workspace.
                    }
                }
            }

            // Fallback: fetch FBA object directly from workspace with variations
            const directObjectRefs: string[] = [...workspaceCandidates];
            for (const candidate of workspaceCandidates) {
                if (isFbaContainerRef(candidate)) {
                    try {
                        const lsPayload = await workspaceLs([candidate]);
                        directObjectRefs.push(...extractFbaObjectRefsFromLs(lsPayload));
                    } catch {
                        // Ignore ls failure.
                    }
                }
            }

            for (const objectRef of dedupeRefs(directObjectRefs)) {
                try {
                    const wsData = await workspaceGet([objectRef]);
                    const parsed = parseWorkspaceGetObject<unknown>(wsData);
                    if (parsed && typeof parsed === 'object' && isFbaObjectData(parsed)) {
                        return parsed as Record<string, unknown>;
                    }

                    // Shock-backed objects may return only a URL from workspace/get.
                    const downloaded = await downloadWorkspaceObjectJson(objectRef);
                    if (downloaded && isFbaObjectData(downloaded)) return downloaded;
                } catch {
                    const downloaded = await downloadWorkspaceObjectJson(objectRef);
                    if (downloaded && isFbaObjectData(downloaded)) return downloaded;
                }
            }

            return null;
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: pathwayMaps = [], isLoading: isLoadingPathways, error: pathwayError } = useQuery({
        queryKey: ['fbaPathwayMaps'],
        queryFn: async () => {
            const seen = new Map<string, FbaPathwayMap>();
            for (const root of LEGACY_MAP_ROOTS) {
                const candidates = [root, `${root}/`];
                for (const candidate of candidates) {
                    try {
                        const lsPayload = await workspaceLs([candidate]);
                        const maps = parsePathwayMapsFromLs(lsPayload, root);
                        for (const map of maps) {
                            if (!seen.has(map.id)) {
                                seen.set(map.id, map);
                            }
                        }
                        break;
                    } catch {
                        // Try the next candidate root.
                    }
                }
            }

            return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
        },
        staleTime: 30 * 60 * 1000,
    });

    const rxnFluxes = useMemo(
        () => (fbaData ? parseReactionFluxes(fbaData as Record<string, unknown>) : []),
        [fbaData],
    );
    const exchFluxes = useMemo(
        () => (fbaData ? parseExchangeFluxes(fbaData as Record<string, unknown>) : []),
        [fbaData],
    );

    const fluxByReaction = useMemo(() => buildFluxByReaction(rxnFluxes), [rxnFluxes]);
    const maxAbsFlux = useMemo(() => {
        let maxAbs = 1;
        for (const flux of fluxByReaction.values()) {
            maxAbs = Math.max(maxAbs, Math.abs(flux));
        }
        return maxAbs;
    }, [fluxByReaction]);

    const rxnColumns: GridColDef<FbaReactionFlux>[] = useMemo(() => [
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
        { field: 'name', headerName: 'Name', width: 240 },
        { field: 'flux', headerName: 'Flux', width: 120, type: 'number' },
        { field: 'min', headerName: 'Min', width: 100, type: 'number' },
        { field: 'max', headerName: 'Max', width: 100, type: 'number' },
        { field: 'class', headerName: 'Class', width: 140 },
    ], []);

    const exchColumns: GridColDef<FbaExchangeFlux>[] = useMemo(() => [
        {
            field: 'compound',
            headerName: 'Compound',
            width: 160,
            renderCell: (p) => {
                const baseId = p.row.compound.replace(/_[a-z]\d*$/, '');
                return (
                    <Link href={`/biochem/compounds/${baseId}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                        {p.row.compound}
                    </Link>
                );
            },
        },
        { field: 'name', headerName: 'Name', width: 240 },
        { field: 'flux', headerName: 'Flux', width: 120, type: 'number' },
        { field: 'min', headerName: 'Min', width: 100, type: 'number' },
        { field: 'max', headerName: 'Max', width: 100, type: 'number' },
        { field: 'class', headerName: 'Class', width: 140 },
    ], []);

    const openMapTab = useCallback((map: FbaPathwayMap) => {
        let shouldLoad = false;

        setMapTabs((prev) => {
            const existingIdx = prev.findIndex((tab) => tab.id === map.id);
            if (existingIdx >= 0) {
                setTabIndex(BASE_FBA_TAB_COUNT + existingIdx);
                return prev;
            }

            shouldLoad = true;
            const next = [...prev, {
                id: map.id,
                name: map.name,
                mapData: null,
                imageData: null,
                loading: true,
                error: null,
            }];
            setTabIndex(BASE_FBA_TAB_COUNT + next.length - 1);
            return next;
        });

        if (!shouldLoad) return;

        void (async () => {
            try {
                const mapPayload = await workspaceGet([map.mapPath]);
                const mapData = parseWorkspaceGetObject<Record<string, unknown>>(mapPayload);

                let imageData: string | null = null;
                try {
                    const imagePayload = await workspaceGet([map.imagePath]);
                    const parsedImage = parseWorkspaceGetObject<string>(imagePayload);
                    imageData = typeof parsedImage === 'string' ? parsedImage : null;
                } catch {
                    imageData = null;
                }

                setMapTabs((prev) => prev.map((tab) => (
                    tab.id === map.id
                        ? {
                            ...tab,
                            loading: false,
                            mapData: mapData ?? null,
                            imageData,
                            error: null,
                        }
                        : tab
                )));
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load pathway map';
                setMapTabs((prev) => prev.map((tab) => (
                    tab.id === map.id
                        ? {
                            ...tab,
                            loading: false,
                            error: message,
                        }
                        : tab
                )));
            }
        })();
    }, []);

    const mapColumns: GridColDef<FbaPathwayMap>[] = useMemo(() => [
        {
            field: 'name',
            headerName: 'Name',
            width: 320,
            renderCell: (params) => (
                <Button
                    onClick={() => openMapTab(params.row)}
                    size="small"
                    sx={{ textTransform: 'none', justifyContent: 'flex-start', px: 0, minWidth: 0 }}
                >
                    {params.row.name}
                </Button>
            ),
        },
        { field: 'id', headerName: 'ID', width: 160 },
        { field: 'rxnCount', headerName: 'Rxns', width: 120, type: 'number' },
        { field: 'cpdCount', headerName: 'Cpds', width: 120, type: 'number' },
    ], [openMapTab]);

    const closeMapTab = (mapId: string) => {
        const removeIdx = mapTabs.findIndex((tab) => tab.id === mapId);
        if (removeIdx < 0) return;

        const removedTabIndex = BASE_FBA_TAB_COUNT + removeIdx;
        setMapTabs((prev) => prev.filter((tab) => tab.id !== mapId));
        setTabIndex((current) => {
            if (current === removedTabIndex) return 2;
            if (current > removedTabIndex) return current - 1;
            return current;
        });
    };

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
                    {fbaName}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    (for {modelName})
                </Typography>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }} />

            {isLoading && (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }} color="text.secondary">Loading FBA data…</Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 4 }}>
                    Failed to load FBA data: {(error as Error).message}
                </Alert>
            )}

            {!isLoading && !error && !fbaData && (
                <Alert severity="warning" sx={{ mt: 4 }}>
                    No FBA data found for this reference. The backend may not have the data available yet.
                </Alert>
            )}

            {fbaData && (
                <>
                    <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
                        <Tab label={`Reaction Fluxes (${rxnFluxes.length})`} />
                        <Tab label={`Exchange Fluxes (${exchFluxes.length})`} />
                        <Tab label={`Pathways (${pathwayMaps.length})`} />
                        {mapTabs.map((tab) => (
                            <Tab
                                key={tab.id}
                                label={(
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography component="span" variant="body2">
                                            {tab.name.length > 18 ? `${tab.name.slice(0, 18)}...` : tab.name}
                                        </Typography>
                                        <IconButton
                                            aria-label={`Close ${tab.name}`}
                                            size="small"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                closeMapTab(tab.id);
                                            }}
                                            sx={{ p: 0.25 }}
                                        >
                                            <CloseIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Box>
                                )}
                            />
                        ))}
                    </Tabs>

                    {tabIndex === 0 && (
                        <DataGrid<FbaReactionFlux>
                            rows={rxnFluxes}
                            columns={rxnColumns}
                            pageSizeOptions={[10, 25, 50, 100]}
                            paginationModel={rxnPagination}
                            onPaginationModelChange={setRxnPagination}
                            sortModel={rxnSort}
                            onSortModelChange={setRxnSort}
                            showToolbar
                            slots={{ toolbar: DataControlHeader }}
                            slotProps={{ toolbar: { showQuickFilter: true } }}
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                        />
                    )}

                    {tabIndex === 1 && (
                        <DataGrid<FbaExchangeFlux>
                            rows={exchFluxes}
                            columns={exchColumns}
                            pageSizeOptions={[10, 25, 50, 100]}
                            paginationModel={exchPagination}
                            onPaginationModelChange={setExchPagination}
                            sortModel={exchSort}
                            onSortModelChange={setExchSort}
                            showToolbar
                            slots={{ toolbar: DataControlHeader }}
                            slotProps={{ toolbar: { showQuickFilter: true } }}
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                        />
                    )}

                    {tabIndex === 2 && (
                        <>
                            {isLoadingPathways && (
                                <Box sx={{ py: 6, textAlign: 'center' }}>
                                    <CircularProgress size={26} />
                                    <Typography sx={{ mt: 1 }} color="text.secondary">
                                        Loading pathway maps...
                                    </Typography>
                                </Box>
                            )}

                            {pathwayError && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    Unable to load pathways: {(pathwayError as Error).message}
                                </Alert>
                            )}

                            {!isLoadingPathways && pathwayMaps.length === 0 && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    No pathway maps are available for this environment.
                                </Alert>
                            )}

                            {pathwayMaps.length > 0 && (
                                <DataGrid<FbaPathwayMap>
                                    rows={pathwayMaps}
                                    columns={mapColumns}
                                    pageSizeOptions={[10, 25, 50, 100]}
                                    paginationModel={mapPagination}
                                    onPaginationModelChange={setMapPagination}
                                    sortModel={mapSort}
                                    onSortModelChange={setMapSort}
                                    showToolbar
                                    slots={{ toolbar: DataControlHeader }}
                                    slotProps={{ toolbar: { showQuickFilter: true } }}
                                    disableRowSelectionOnClick
                                    getRowId={(row) => row.id}
                                    sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', minHeight: 400 }}
                                />
                            )}
                        </>
                    )}

                    {mapTabs.map((tab, index) => {
                        const panelIndex = BASE_FBA_TAB_COUNT + index;
                        if (tabIndex !== panelIndex) return null;

                        const reactions = parseMapReactions(tab.mapData);
                        const canvas = mapCanvasSize(reactions);
                        const imageSrc = toImageSrc(tab.imageData);

                        return (
                            <Box key={`panel-${tab.id}`} sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', p: 2 }}>
                                {tab.loading && (
                                    <Box sx={{ py: 6, textAlign: 'center' }}>
                                        <CircularProgress size={28} />
                                        <Typography sx={{ mt: 1 }} color="text.secondary">
                                            Loading {tab.name}...
                                        </Typography>
                                    </Box>
                                )}

                                {!tab.loading && tab.error && (
                                    <Alert severity="error">{tab.error}</Alert>
                                )}

                                {!tab.loading && !tab.error && (
                                    <>
                                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                            <Typography variant="subtitle1" fontWeight={600}>{tab.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Hover over a reaction box to inspect mapped reaction IDs and FBA flux.
                                            </Typography>
                                            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 18, height: 18, backgroundColor: 'rgba(230, 57, 70, 0.75)', border: '1px solid rgba(0,0,0,0.2)' }} />
                                                <Typography variant="caption">Positive flux</Typography>
                                                <Box sx={{ width: 18, height: 18, backgroundColor: 'rgba(69, 123, 157, 0.75)', border: '1px solid rgba(0,0,0,0.2)' }} />
                                                <Typography variant="caption">Negative flux</Typography>
                                            </Box>
                                        </Box>

                                        <Box sx={{ overflowX: 'auto', border: '1px solid #f0f0f0' }}>
                                            <Box
                                                sx={{
                                                    position: 'relative',
                                                    width: canvas.width,
                                                    height: canvas.height,
                                                    minWidth: '100%',
                                                    background: imageSrc ? 'transparent' : 'linear-gradient(180deg, #f8fbff 0%, #eef3f8 100%)',
                                                }}
                                            >
                                                {imageSrc && (
                                                    <Box
                                                        component="img"
                                                        src={imageSrc}
                                                        alt={`${tab.name} map`}
                                                        sx={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            width: canvas.width,
                                                            height: canvas.height,
                                                            objectFit: 'fill',
                                                        }}
                                                    />
                                                )}

                                                {reactions.map((reaction) => {
                                                    const flux = mapReactionFlux(reaction.rxns, fluxByReaction);
                                                    const title = [
                                                        `Map reaction: ${reaction.name || reaction.id}`,
                                                        `ModelSEED IDs: ${reaction.rxns.join(', ') || '-'}`,
                                                        `Flux: ${flux == null ? 'N/A' : flux.toFixed(6)}`,
                                                    ].join('\n');

                                                    return (
                                                        <Box
                                                            key={`${tab.id}-${reaction.id}`}
                                                            title={title}
                                                            sx={{
                                                                position: 'absolute',
                                                                left: reaction.x - reaction.w / 2 - 1,
                                                                top: reaction.y - reaction.h / 2 - 1,
                                                                width: reaction.w + 2,
                                                                height: reaction.h + 2,
                                                                border: '1px solid rgba(29, 53, 87, 0.7)',
                                                                backgroundColor: fluxColor(flux, maxAbsFlux),
                                                                borderRadius: 0.5,
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Box>
                        );
                    })}
                </>
            )}
        </Container>
    );
}
