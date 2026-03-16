// lib/api/modelseed.ts
/**
 * Thin client for the new ModelSEED REST backend (modelseed-api).
 *
 * This module intentionally mirrors the patterns used in lib/api/workspace.ts
 * and lib/api/auth.ts so that we can swap backends via configuration without
 * touching the UI components again.
 */

import {
    MODELSEED_API_URL,
    MODELSEED_SUPPORT_URL,
    USE_MODELSEED_API,
    USE_NEW_PROXY,
    WORKSPACE_URL,
} from './config';
import { getStoredAuthUsername, withRawTokenAuth } from './requestAuth';

export interface ModelseedModelSummary {
    ref: string;
    id: string;
    name: string;
    status?: string;
    num_genes?: number;
    num_reactions?: number;
    num_compounds?: number;
    fba_count?: number;
    unintegrated_gapfills?: number;
    integrated_gapfills?: number;
    rundate?: string;
}

export interface ModelseedMediaSummary {
    id: string;
    name: string;
    ref?: string;
    isMinimal?: boolean | string;
    isDefined?: boolean | string;
    type?: string;
    modDate?: string;
}

export interface ModelseedJobSummary {
    id: string;
    status?: string;
    type?: string;
    app?: string;
    created_at?: string;
    completed_at?: string;
    [key: string]: unknown;
}

export interface RastGenomeJob {
    id: string;
    genome_id: string;
    genome_name: string;
    contig_count?: number;
    mod_time?: string;
    type: 'Genome';
}

export interface ModelDetailBundle {
    ref: string;
    data: Record<string, unknown>;
    gapfills: Record<string, unknown>[];
    fba: Record<string, unknown> | Record<string, unknown>[] | null;
}

function buildQueryString(params: Record<string, string | undefined>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== '') query.set(key, value);
    }
    const encoded = query.toString();
    return encoded ? `?${encoded}` : '';
}

function extractApiErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const rec = payload as Record<string, unknown>;
    if (typeof rec.detail === 'string' && rec.detail) return rec.detail;
    if (typeof rec.message === 'string' && rec.message) return rec.message;
    const err = rec.error;
    if (err && typeof err === 'object') {
        const rpcErr = err as Record<string, unknown>;
        if (typeof rpcErr.message === 'string' && rpcErr.message) return rpcErr.message;
        if (typeof rpcErr.error === 'string' && rpcErr.error) return rpcErr.error;
    }
    return null;
}

async function parseJsonResponse(response: Response): Promise<{ payload: unknown; rawText: string }> {
    const rawText = await response.text().catch(() => '');
    if (!rawText) return { payload: null, rawText: '' };
    try {
        return { payload: JSON.parse(rawText) as unknown, rawText };
    } catch {
        return { payload: { raw: rawText }, rawText };
    }
}

async function modelseedFetch<T>(path: string, init: RequestInit = {}, requireAuth = true): Promise<T> {
    if (!USE_MODELSEED_API) {
        throw new Error('modelseed-api client called but USE_MODELSEED_API is false');
    }

    const baseHeaders: Record<string, string> = {
        Accept: 'application/json',
        ...(init.headers as Record<string, string> | undefined),
    };
    const headers = withRawTokenAuth(baseHeaders, requireAuth);

    const response = await fetch(`${MODELSEED_API_URL}${path}`, {
        ...init,
        headers,
    });

    const { payload, rawText } = await parseJsonResponse(response);

    if (!response.ok) {
        const detail = extractApiErrorMessage(payload);
        throw new Error(
            `modelseed-api ${path} failed (${response.status})${detail ? `: ${detail}` : rawText ? `: ${rawText}` : ''}`,
        );
    }

    return payload as T;
}

export async function listUserModelsFromApi(): Promise<ModelseedModelSummary[]> {
    return modelseedFetch<ModelseedModelSummary[]>('/api/models');
}

export async function getModelDataFromApi(ref: string): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>(
        `/api/models/data${buildQueryString({ ref })}`,
    );
}

export async function copyModelFromApi(
    payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>('/api/models/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function listModelGapfillsFromApi(ref: string): Promise<Record<string, unknown>[]> {
    return modelseedFetch<Record<string, unknown>[]>(
        `/api/models/gapfills${buildQueryString({ ref })}`,
    );
}

export async function manageModelGapfillsFromApi(
    payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>('/api/models/gapfills/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function getModelFbaFromApi(ref: string): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>(
        `/api/models/fba${buildQueryString({ ref })}`,
    );
}

export async function getModelDetailBundleFromApi(ref: string): Promise<ModelDetailBundle> {
    const [data, gapfills, fba] = await Promise.all([
        getModelDataFromApi(ref),
        listModelGapfillsFromApi(ref).catch(() => []),
        getModelFbaFromApi(ref).catch(() => null),
    ]);
    return {
        ref,
        data,
        gapfills,
        fba,
    };
}

/**
 * Returns a Blob containing the exported model file.
 * formats: 'sbml' | 'json' | 'tsv'
 */
export async function exportModelFromApi(ref: string, format: string): Promise<Blob> {
    const response = await fetch(
        `${MODELSEED_API_URL}/api/models/export?ref=${encodeURIComponent(ref)}&format=${format}`,
        {
            headers: {
                ...withRawTokenAuth({}, true),
            },
        },
    );

    if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
}

/**
 * Deletes a model from the workspace via the modelseed-api proxy.
 */
export async function deleteModelFromApi(ref: string): Promise<void> {
    const response = await fetch(
        `${MODELSEED_API_URL}/api/models?ref=${encodeURIComponent(ref)}`,
        {
            method: 'DELETE',
            headers: withRawTokenAuth({}, true),
        },
    );

    if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
    }
}

export async function getJobsFromApi(ids: string[]): Promise<ModelseedJobSummary[]> {
    const query = ids.length > 0 ? { ids: ids.join(',') } : {};
    return modelseedFetch<ModelseedJobSummary[]>(
        `/api/jobs${buildQueryString(query)}`,
    );
}

export async function submitReconstructJobFromApi(
    payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>('/api/jobs/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function submitGapfillJobFromApi(
    payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>('/api/jobs/gapfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function submitFbaJobFromApi(
    payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>('/api/jobs/fba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function manageJobFromApi(
    payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>('/api/jobs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function submitMergeJobFromApi(
    payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>('/api/jobs/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

interface RastJobsRpcResponse {
    result?: unknown;
    error?: {
        code?: number;
        message?: string;
        error?: string;
    };
}

type RawRastJob = {
    id?: unknown;
    genome_id?: unknown;
    genome_name?: unknown;
    contig_count?: unknown;
    mod_time?: unknown;
    type?: unknown;
};

export async function listRastGenomes(): Promise<RastGenomeJob[]> {
    const callRastList = async (method: string) => {
        const response = await fetch(MODELSEED_SUPPORT_URL, {
            method: 'POST',
            headers: withRawTokenAuth(
                {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                true,
            ),
            body: JSON.stringify({
                version: '1.1',
                method,
                id: 'list-rast-genomes',
                params: [{}],
            }),
        });
        const { payload: rawPayload, rawText } = await parseJsonResponse(response);
        const payload = rawPayload as RastJobsRpcResponse | null;

        if (!response.ok) {
            // Some deployments return RPC JSON error payloads with HTTP 500.
            // Preserve payload so caller can apply compatibility fallbacks.
            if (payload?.error) {
                return payload;
            }
            throw new Error(
                `RAST list jobs ${method} failed (${response.status})${rawText ? `: ${rawText}` : ''}`,
            );
        }

        if (!payload) {
            throw new Error('RAST list jobs returned an empty or non-JSON response');
        }

        return payload;
    };

    let payload = await callRastList('msSupport.list_rast_jobs');
    if (
        payload.error?.code === -32601 &&
        (payload.error.message?.includes("package named 'msSupport'") ||
            payload.error.message?.includes("package named \"msSupport\""))
    ) {
        // Some deployments expose this on a different package name.
        // Note: JSON-RPC 1.1 requires the "Service.method" shape.
        payload = await callRastList('ms_fba.list_rast_jobs');
        if (payload.error?.code === -32601) {
            payload = await callRastList('msFBA.list_rast_jobs');
        }
    }
    if (payload.error) {
        throw new Error(payload.error.message || payload.error.error || 'RAST list jobs RPC error');
    }

    const rawResult = payload.result;
    const jobsArray = Array.isArray(rawResult)
        ? (Array.isArray(rawResult[0]) ? rawResult[0] : rawResult)
        : [];

    return jobsArray
        .filter((item): item is RawRastJob => item != null && typeof item === 'object')
        .filter((job) => String(job.type ?? '') === 'Genome')
        .map((job) => {
            const id = String(job.id ?? '');
            const genomeId = String(job.genome_id ?? '');
            return {
                id,
                genome_id: genomeId,
                genome_name: String(job.genome_name ?? genomeId ?? id),
                contig_count:
                    typeof job.contig_count === 'number'
                        ? job.contig_count
                        : Number.isFinite(Number(job.contig_count))
                            ? Number(job.contig_count)
                            : undefined,
                mod_time: job.mod_time ? String(job.mod_time) : undefined,
                type: 'Genome',
            } satisfies RastGenomeJob;
        })
        .filter((job) => job.genome_id.length > 0 || job.id.length > 0);
}

export async function listPublicMediaFromApi(): Promise<ModelseedMediaSummary[]> {
    return listMediaGeneric('/api/media/public');
}

export async function listMyMediaFromApi(): Promise<ModelseedMediaSummary[]> {
    const primary = await listMediaGeneric('/api/media/mine');
    if (primary.length > 0) return primary;

    if (!USE_NEW_PROXY) return primary;
    const username = getStoredAuthUsername();
    if (!username) return primary;

    try {
        const fallbackPaths = [
            `/${username}/media`,
            `/${username}/modelseed/media`,
        ];
        for (const path of fallbackPaths) {
            const viaWorkspace = await listMediaViaWorkspaceLs(path);
            if (viaWorkspace.length > 0) return viaWorkspace;
        }
        return primary;
    } catch (err) {
        console.warn('modelseed-api: fallback /api/workspace/ls media lookup failed:', err);
        return primary;
    }
}

export async function exportMediaFromApi(ref: string): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>(
        `/api/media/export${buildQueryString({ ref })}`,
    );
}

export async function listModelEditsFromApi(ref: string): Promise<Record<string, unknown>[]> {
    return modelseedFetch<Record<string, unknown>[]>(
        `/api/models/edits${buildQueryString({ ref })}`,
    );
}

export async function editModelFromApi(
    payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    // Route currently exists for forward-compatibility and may return 501 on some deployments.
    return modelseedFetch<Record<string, unknown>>('/api/models/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

async function listMediaGeneric(path: string): Promise<ModelseedMediaSummary[]> {
    // The Poplar deployment returns a dictionary of workspace paths to arrays of
    // positional workspace tuples, rather than a flat list of objects. Each entry
    // looks like:
    //
    // [
    //   name,          // 0
    //   type,          // 1
    //   path,          // 2
    //   modDate,       // 3
    //   id,            // 4
    //   owner,         // 5 (ignored here)
    //   wsIdOrSize,    // 6 (ignored here)
    //   metadata,      // 7 (optional object with flags)
    //   ...
    // ]
    //
    // We flatten all arrays across all paths and map them into ModelseedMediaSummary.

    type RawMediaEntry = [
        name: string,
        type: string,
        path: string,
        modDate: string,
        id: string,
        owner?: string,
        wsIdOrSize?: number,
        metadata?: Record<string, unknown>,
        // allow trailing fields we do not currently use
        ...unknown[]
    ];

    type RawMediaResponse = Record<string, RawMediaEntry[]>;

    try {
        const raw = await modelseedFetch<RawMediaResponse>(path);
        return mapRawMediaResponse(raw);
    } catch (err) {
        // If the backend returns 404/500, it might mean the endpoint isn't implemented/enabled
        // for this user or path. We log it and return an empty array to prevent a page crash.
        console.warn(`modelseed-api: ${path} returned an error:`, err);
        return [];
    }
}

async function listMediaViaWorkspaceLs(path: string): Promise<ModelseedMediaSummary[]> {
    const response = await fetch(`${WORKSPACE_URL}/ls`, {
        method: 'POST',
        headers: withRawTokenAuth(
            {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            true,
        ),
        body: JSON.stringify({ paths: [path] }),
    });

    const { payload, rawText } = await parseJsonResponse(response);
    if (!response.ok) {
        const detail = extractApiErrorMessage(payload);
        throw new Error(
            `workspace media ls failed (${response.status})${detail ? `: ${detail}` : rawText ? `: ${rawText}` : ''}`,
        );
    }

    const unwrapped = (
        payload &&
        typeof payload === 'object' &&
        'result' in (payload as Record<string, unknown>) &&
        Array.isArray((payload as { result?: unknown[] }).result)
    )
        ? (payload as { result: unknown[] }).result[0]
        : payload;

    if (!unwrapped || typeof unwrapped !== 'object') return [];
    return mapRawMediaResponse(unwrapped as Record<string, unknown[]>);
}

function mapRawMediaResponse(raw: Record<string, unknown[]>): ModelseedMediaSummary[] {
    const summaries: ModelseedMediaSummary[] = [];
    for (const entries of Object.values(raw)) {
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
            if (!Array.isArray(entry)) continue;
            const [name, type, path, modDate, id, , , metadata] = entry as [
                unknown,
                unknown,
                unknown,
                unknown,
                unknown,
                unknown?,
                unknown?,
                unknown?,
            ];
            const meta = metadata && typeof metadata === 'object'
                ? (metadata as Record<string, unknown>)
                : undefined;
            summaries.push({
                id: id ? String(id) : String(name ?? ''),
                name: String(name ?? ''),
                ref: path ? String(path) : undefined,
                type: type ? String(type) : undefined,
                modDate: modDate ? String(modDate) : undefined,
                isMinimal: (meta?.isMinimal ?? meta?.is_minimal) as boolean | string | undefined,
                isDefined: (meta?.isDefined ?? meta?.is_defined) as boolean | string | undefined,
            });
        }
    }
    return summaries;
}
