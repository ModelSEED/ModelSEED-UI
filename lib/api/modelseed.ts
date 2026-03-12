// lib/api/modelseed.ts
/**
 * Thin client for the new ModelSEED REST backend (modelseed-api).
 *
 * This module intentionally mirrors the patterns used in lib/api/workspace.ts
 * and lib/api/auth.ts so that we can swap backends via configuration without
 * touching the UI components again.
 */

import { AUTH_STORAGE_KEY, type AuthResult } from './auth';
import { MODELSEED_API_URL, USE_MODELSEED_API } from './config';

interface ModelseedModelSummary {
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

interface ModelseedMediaSummary {
    id: string;
    name: string;
    isMinimal?: boolean | string;
    isDefined?: boolean | string;
    type?: string;
    modDate?: string;
}

function getStoredAuthClientSide(): AuthResult | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AuthResult;
    } catch {
        return null;
    }
}

async function modelseedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!USE_MODELSEED_API) {
        throw new Error('modelseed-api client called but USE_MODELSEED_API is false');
    }

    const auth = getStoredAuthClientSide();
    if (!auth?.token) {
        throw new Error('No auth token available for modelseed-api request');
    }

    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(init.headers as Record<string, string> | undefined),
        // modelseed-api expects the raw PATRIC token in the Authorization header
        Authorization: auth.token,
    };

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

export async function listUserMediaFromApi(): Promise<ModelseedMediaSummary[]> {
    // API currently exposes public media; if/when a user-specific endpoint appears,
    // this function can be switched over without touching the callers.
    //
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

    const raw = await modelseedFetch<RawMediaResponse>('/api/media/public');

    const summaries: ModelseedMediaSummary[] = [];

    for (const entries of Object.values(raw)) {
        if (!Array.isArray(entries)) continue;

        for (const entry of entries) {
            if (!Array.isArray(entry)) continue;

            const [name, type, _path, modDate, id, , , metadata] = entry;

            const meta = metadata && typeof metadata === 'object'
                ? (metadata as Record<string, unknown>)
                : undefined;

            const isMinimal = (meta?.isMinimal ?? meta?.is_minimal) as
                | boolean
                | string
                | undefined;
            const isDefined = (meta?.isDefined ?? meta?.is_defined) as
                | boolean
                | string
                | undefined;

            summaries.push({
                id: id ? String(id) : String(name ?? ''),
                name: String(name ?? ''),
                type: type ? String(type) : undefined,
                modDate: modDate ? String(modDate) : undefined,
                isMinimal,
                isDefined,
            });
        }
    }

    return summaries;
}

