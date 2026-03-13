// lib/api/modelseed.ts
/**
 * Thin client for the new ModelSEED REST backend (modelseed-api).
 *
 * This module intentionally mirrors the patterns used in lib/api/workspace.ts
 * and lib/api/auth.ts so that we can swap backends via configuration without
 * touching the UI components again.
 */

import { MODELSEED_API_URL, USE_MODELSEED_API } from './config';
import { withRawTokenAuth } from './requestAuth';

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

function buildQueryString(params: Record<string, string | undefined>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== '') query.set(key, value);
    }
    const encoded = query.toString();
    return encoded ? `?${encoded}` : '';
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

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
            `modelseed-api error ${response.status} on ${path}: ${text || response.statusText}`,
        );
    }

    return (await response.json()) as T;
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

export async function listPublicMediaFromApi(): Promise<ModelseedMediaSummary[]> {
    return listMediaGeneric('/api/media/public');
}

export async function listMyMediaFromApi(): Promise<ModelseedMediaSummary[]> {
    return listMediaGeneric('/api/media/mine');
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
        const summaries: ModelseedMediaSummary[] = [];

        for (const entries of Object.values(raw)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (!Array.isArray(entry)) continue;
                const [name, type, , modDate, id, , , metadata] = entry;
                const meta = metadata && typeof metadata === 'object'
                    ? (metadata as Record<string, unknown>)
                    : undefined;
                summaries.push({
                    id: id ? String(id) : String(name ?? ''),
                    name: String(name ?? ''),
                    type: type ? String(type) : undefined,
                    modDate: modDate ? String(modDate) : undefined,
                    isMinimal: (meta?.isMinimal ?? meta?.is_minimal) as boolean | string | undefined,
                    isDefined: (meta?.isDefined ?? meta?.is_defined) as boolean | string | undefined,
                });
            }
        }
        return summaries;
    } catch (err) {
        // If the backend returns 404/500, it might mean the endpoint isn't implemented/enabled
        // for this user or path. We log it and return an empty array to prevent a page crash.
        console.warn(`modelseed-api: ${path} returned an error:`, err);
        return [];
    }
}
