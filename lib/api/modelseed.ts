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
    genome_id?: string;
    organism_name?: string;
    taxonomy?: string;
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

/**
 * Fetch genome annotation data from RAST.
 *
 * Tries José's modelseed-api endpoint first (GET /api/rast/genome),
 * then falls back to MSSS JSON-RPC (MSSeedSupportServer.getRastGenomeData).
 *
 * @param genomeId - RAST genome ID to fetch data for
 * @param jobId - Optional RAST job ID (needed for the modelseed-api endpoint)
 * @returns Promise resolving to genome data record
 */
export async function getRastGenomeData(genomeId: string, jobId?: string): Promise<Record<string, unknown>> {
    // Try José's modelseed-api endpoint first
    if (jobId) {
        try {
            const token = getStoredAuthUsername();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) {
                headers['Authorization'] = token;
            }
            const params = new URLSearchParams({ genome_id: genomeId, job_id: jobId });
            const res = await fetch(`/api/rast/genome?${params}`, { headers });
            if (res.ok) {
                const data: unknown = await res.json();
                if (data && typeof data === 'object') {
                    return data as Record<string, unknown>;
                }
            }
        } catch {
            // Fall through to MSSS
        }
    }

    // Fallback: MSSS JSON-RPC
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
            method: 'MSSeedSupportServer.getRastGenomeData',
            id: 'get-rast-genome-data',
            params: [{ genome: genomeId }],
        }),
    });

    const { payload: rawPayload, rawText } = await parseJsonResponse(response);
    const payload = rawPayload as RastJobsRpcResponse | null;

    if (!response.ok) {
        if (payload?.error) {
            throw new Error(payload.error.message || payload.error.error || 'RAST genome data fetch failed');
        }
        throw new Error(
            `RAST genome data fetch failed (${response.status})${rawText ? `: ${rawText}` : ''}`,
        );
    }

    if (!payload) {
        throw new Error('RAST genome data returned an empty or non-JSON response');
    }

    if (payload.error) {
        throw new Error(payload.error.message || payload.error.error || 'RAST genome data fetch failed');
    }

    const result = Array.isArray(payload.result) ? payload.result[0] : payload.result;
    if (!result || typeof result !== 'object') {
        throw new Error('Unexpected RAST genome data format');
    }

    return result as Record<string, unknown>;
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

/**
 * Structured error body emitted by modelseed-api pre-flight validation on
 * job-submit routes (`POST /api/jobs/{reconstruct,gapfill,fba,merge}`).
 *
 * FastAPI wraps this object in `{ detail: { ... } }`. See
 * docs/JOB_ERROR_UI_INTEGRATION.md in the modelseed-api repo.
 *
 * `code` is a stable SCREAMING_SNAKE_CASE identifier; treat as an open
 * enum (new codes may appear without a UI update).
 */
export interface ModelseedApiErrorDetail {
    code: string;
    message: string;
    hint?: string | null;
    field?: string | null;
    retryable?: boolean;
}

/**
 * Thrown by `modelseedFetch` on non-2xx responses. Carries the HTTP status
 * and (when present) the structured `detail` body so callers can render
 * `message` + `hint`, highlight the `field` input, or branch on `code`
 * (e.g. redirect to login on `TOKEN_EXPIRED`).
 */
export class ModelseedApiError extends Error {
    readonly status: number;
    readonly detail?: ModelseedApiErrorDetail;
    readonly rawText: string;
    readonly path: string;

    constructor(
        status: number,
        message: string,
        opts: { detail?: ModelseedApiErrorDetail; rawText?: string; path?: string } = {},
    ) {
        super(message);
        this.name = 'ModelseedApiError';
        this.status = status;
        this.detail = opts.detail;
        this.rawText = opts.rawText ?? '';
        this.path = opts.path ?? '';
    }
}

function extractApiErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const rec = payload as Record<string, unknown>;
    if (typeof rec.detail === 'string' && rec.detail) return rec.detail;
    if (rec.detail && typeof rec.detail === 'object') {
        const det = rec.detail as Record<string, unknown>;
        if (typeof det.message === 'string' && det.message) return det.message;
    }
    if (typeof rec.message === 'string' && rec.message) return rec.message;
    const err = rec.error;
    if (err && typeof err === 'object') {
        const rpcErr = err as Record<string, unknown>;
        if (typeof rpcErr.message === 'string' && rpcErr.message) return rpcErr.message;
        if (typeof rpcErr.error === 'string' && rpcErr.error) return rpcErr.error;
    }
    return null;
}

/**
 * Pull the structured pre-flight error body out of a FastAPI response.
 *
 * Returns null when the body isn't shaped like
 * `{ detail: { code, message, ... } }` — falls back on string parsing
 * via `extractApiErrorMessage` so legacy plain-string `detail` responses
 * still render their text.
 */
function extractApiErrorDetail(payload: unknown): ModelseedApiErrorDetail | null {
    if (!payload || typeof payload !== 'object') return null;
    const rec = payload as Record<string, unknown>;
    const det = rec.detail;
    if (!det || typeof det !== 'object' || Array.isArray(det)) return null;
    const obj = det as Record<string, unknown>;
    if (typeof obj.code !== 'string' || !obj.code) return null;
    if (typeof obj.message !== 'string' || !obj.message) return null;
    return {
        code: obj.code,
        message: obj.message,
        hint: typeof obj.hint === 'string' ? obj.hint : null,
        field: typeof obj.field === 'string' ? obj.field : null,
        retryable: typeof obj.retryable === 'boolean' ? obj.retryable : undefined,
    };
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
        const detail = extractApiErrorDetail(payload);
        const detailMessage = detail?.message ?? extractApiErrorMessage(payload);
        throw new ModelseedApiError(
            response.status,
            `modelseed-api ${path} failed (${response.status})${detailMessage ? `: ${detailMessage}` : rawText ? `: ${rawText}` : ''}`,
            { detail: detail ?? undefined, rawText, path },
        );
    }

    return payload as T;
}

/**
 * Safely parse a value as a number, handling edge cases like "N/A", empty strings, or invalid values.
 * Returns undefined if the value cannot be parsed as a finite number.
 */
function safeParseNumber(val: unknown): number | undefined {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '' || trimmed.toLowerCase() === 'n/a') return undefined;
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

/**
 * Process model summary data with defensive number parsing.
 * 
 * Handles edge cases like "N/A" values or invalid numbers in metadata
 * to prevent crashes from malformed backend data.
 * 
 * @param raw - Raw model data from API
 * @returns Typed ModelseedModelSummary with safe defaults
 */
function processModelSummary(raw: Record<string, unknown>): ModelseedModelSummary {
    return {
        ref: String(raw.ref ?? ''),
        id: String(raw.id ?? ''),
        name: String(raw.name ?? ''),
        status: raw.status != null ? String(raw.status) : undefined,
        num_genes: safeParseNumber(raw.num_genes),
        num_reactions: safeParseNumber(raw.num_reactions),
        num_compounds: safeParseNumber(raw.num_compounds),
        fba_count: safeParseNumber(raw.fba_count),
        unintegrated_gapfills: safeParseNumber(raw.unintegrated_gapfills),
        integrated_gapfills: safeParseNumber(raw.integrated_gapfills),
        rundate: raw.rundate != null ? String(raw.rundate) : undefined,
        genome_id: raw.genome_id != null ? String(raw.genome_id) : undefined,
        organism_name: raw.organism_name != null ? String(raw.organism_name) : undefined,
        taxonomy: raw.taxonomy != null ? String(raw.taxonomy) : undefined,
    };
}

/**
 * List all models owned by the authenticated user.
 * 
 * Fetches model summaries from the modelseed-api backend with defensive
 * parsing to handle malformed metadata gracefully.
 * 
 * @returns Promise resolving to array of model summaries
 * @throws {Error} When not authenticated or request fails
 * 
 * @example
 * ```typescript
 * const models = await listUserModelsFromApi();
 * models.forEach(model => {
 *   console.log(`${model.name}: ${model.num_reactions} reactions, ${model.num_genes} genes`);
 * });
 * ```
 */
export async function listUserModelsFromApi(): Promise<ModelseedModelSummary[]> {
    const rawModels = await modelseedFetch<Record<string, unknown>[]>('/api/models');
    
    // Process each model with defensive parsing to handle edge case metadata
    return rawModels.map((raw, index) => {
        try {
            return processModelSummary(raw);
        } catch (err) {
            console.warn(`Failed to process model at index ${index}:`, err, raw);
            // Return a minimal valid model object rather than crashing
            return {
                ref: String(raw.ref ?? ''),
                id: String(raw.id ?? `unknown-${index}`),
                name: String(raw.name ?? 'Unknown'),
            };
        }
    });
}

/**
 * Fetch full model data by workspace reference.
 * 
 * @param ref - Workspace reference path (e.g., '/user@patricbrc.org/models/MyModel')
 * @returns Promise resolving to model data object
 * @throws {Error} When model not found or request fails
 * 
 * @example
 * ```typescript
 * const modelData = await getModelDataFromApi('/user@patricbrc.org/models/EcoliModel');
 * console.log('Model has', modelData.modelreactions.length, 'reactions');
 * ```
 */
export async function getModelDataFromApi(ref: string): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>(
        `/api/models/data${buildQueryString({ ref: safeDecodePath(ref) })}`,
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
    try {
        return await modelseedFetch<Record<string, unknown>[]>(
            `/api/models/gapfills${buildQueryString({ ref: safeDecodePath(ref) })}`,
        );
    } catch (err) {
        // 404 means no gapfill data exists yet - this is expected for models without gapfill runs
        if (err instanceof Error && err.message.includes('(404)')) {
            return [];
        }
        throw err;
    }
}

export async function manageModelGapfillsFromApi(
    model: string,
    commands: Record<string, string>,
    selectedSolutions?: Record<string, number>,
): Promise<Record<string, unknown>> {
    return modelseedFetch<Record<string, unknown>>('/api/models/gapfills/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, commands, selected_solutions: selectedSolutions }),
    });
}

export async function getModelFbaFromApi(ref: string): Promise<Record<string, unknown>[] | null> {
    try {
        return await modelseedFetch<Record<string, unknown>[]>(
            `/api/models/fba${buildQueryString({ ref: safeDecodePath(ref) })}`,
        );
    } catch (err) {
        // 404 means no FBA data exists yet - this is expected for models without FBA runs
        if (err instanceof Error && err.message.includes('(404)')) {
            return null;
        }
        throw err;
    }
}

export async function getModelFbaDataFromApi(
    ref: string,
    fbaId: string,
): Promise<Record<string, unknown> | null> {
    try {
        return await modelseedFetch<Record<string, unknown>>(
            `/api/models/fba/data${buildQueryString({
                ref: safeDecodePath(ref),
                fba_id: safeDecodePath(fbaId),
            })}`,
        );
    } catch (err) {
        // 404 means no detail data exists yet for this FBA run
        if (err instanceof Error && err.message.includes('(404)')) {
            return null;
        }
        throw err;
    }
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
        `${MODELSEED_API_URL}/api/models/export?ref=${encodeURIComponent(safeDecodePath(ref))}&format=${format}`,
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
        `${MODELSEED_API_URL}/api/models?ref=${encodeURIComponent(safeDecodePath(ref))}`,
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
    const payload = await modelseedFetch<unknown>(`/api/jobs${buildQueryString(query)}`);

    if (Array.isArray(payload)) {
        return payload as ModelseedJobSummary[];
    }

    if (payload && typeof payload === 'object') {
        return Object.values(payload as Record<string, ModelseedJobSummary>);
    }

    return [];
}

/**
 * Submit a model reconstruction job.
 * 
 * Submits a genome-to-model reconstruction job to the backend queue.
 * Job completion can take minutes to hours depending on genome size.
 * 
 * @param payload - Reconstruction parameters (genome, model_name, template, gapfill, etc.)
 * @returns Promise resolving to job submission response (contains job ID)
 * @throws {Error} When not authenticated or submission fails
 * 
 * @example
 * ```typescript
 * const response = await submitReconstructJobFromApi({
 *   genome: '511145.12',
 *   model_name: 'EcoliModel',
 *   template: 'GramNegative',
 *   gapfill: true
 * });
 * const jobId = extractTrackedJobId(response);
 * trackJob({ id: jobId, kind: 'reconstruct', label: 'E. coli reconstruction', ... });
 * ```
 */
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
    payload: { ids: string[]; action: string } | Record<string, unknown>,
): Promise<Record<string, unknown>> {
    const body =
        Array.isArray((payload as { ids?: unknown }).ids)
            ? { jobs: (payload as { ids: string[] }).ids, action: (payload as { action: string }).action }
            : payload;

    return modelseedFetch<Record<string, unknown>>('/api/jobs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

/**
 * List RAST genome annotation jobs for the authenticated user.
 * 
 * Queries the modelseed_support backend for RAST genome jobs. Includes complex
 * fallback logic to handle different backend RPC method names and deployment
 * configurations. Returns empty array if backend is misconfigured rather than
 * crashing the UI.
 * 
 * @returns Promise resolving to array of RAST genome jobs
 * @throws {Error} When authentication fails or all RPC methods fail
 * 
 * @example
 * ```typescript
 * const genomes = await listRastGenomes();
 * genomes.forEach(genome => {
 *   console.log(`${genome.genome_name} (${genome.genome_id}) - ${genome.contig_count} contigs`);
 * });
 * ```
 */
export async function listRastGenomes(): Promise<RastGenomeJob[]> {
    // Try José's modelseed-api endpoint first via the local proxy.
    // Falls back to direct MSSS JSON-RPC if the proxy is unavailable.
    try {
        const token = getStoredAuthUsername();
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) {
            headers['Authorization'] = token;
        }
        const proxyRes = await fetch('/api/rast/jobs', { headers });
        if (proxyRes.ok) {
            const data: unknown = await proxyRes.json();
            if (Array.isArray(data)) {
                return (data as RawRastJob[])
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
                    });
            }
            // Some backends wrap in { jobs: [...] }
            const wrapped = data as Record<string, unknown>;
            if (wrapped.jobs && Array.isArray(wrapped.jobs)) {
                return (wrapped.jobs as RawRastJob[])
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
                    });
            }
        }
    } catch {
        // Proxy unavailable — fall through to MSSS
    }

    // Fallback: direct MSSS JSON-RPC (legacy path)
    const callRastList = async (method: string, params: Record<string, unknown>) => {
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
                params: [params],
            }),
        });
        const { payload: rawPayload, rawText } = await parseJsonResponse(response);
        const payload = rawPayload as RastJobsRpcResponse | null;

        if (!response.ok) {
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

    const candidateMethods = [
        'MSSeedSupportServer.list_rast_jobs',
        'msSupport.list_rast_jobs',
        'ms_fba.list_rast_jobs',
    ];
    const username = getStoredAuthUsername();
    const candidateParams: Record<string, unknown>[] = username
        ? [{ owner: username }, {}]
        : [{}];

    let payload: RastJobsRpcResponse | null = null;
    const methodErrors: string[] = [];

    for (const method of candidateMethods) {
        for (const params of candidateParams) {
            const attempt = await callRastList(method, params);
            if (attempt.error) {
                const message = attempt.error.message || attempt.error.error || '';
                const paramsLabel = 'owner' in params ? `owner=${String(params.owner)}` : 'owner=<none>';
                methodErrors.push(
                    `${method} (${paramsLabel}): ${message || `error code ${attempt.error.code ?? 'unknown'}`}`,
                );
                if (attempt.error.code === -32601) {
                    break;
                }
                if ((attempt.error.message || '').includes('selectall_arrayref')) {
                    continue;
                }
                throw new Error(message || `RAST list jobs RPC error (${attempt.error.code})`);
            }

            payload = attempt;
            break;
        }
        if (payload) {
            break;
        }
        const lastForMethod = methodErrors[methodErrors.length - 1] ?? '';
        if (lastForMethod.includes('error code -32601') || lastForMethod.includes('There is no method package')) {
            continue;
        }
    }

    if (!payload) {
        if (methodErrors.some((entry) => entry.includes('selectall_arrayref'))) {
            console.warn(
                'RAST list jobs backend returned selectall_arrayref errors. '
                + 'Returning empty list to keep Build Model UI responsive.',
            );
            return [];
        }
        throw new Error(
            `RAST list jobs method not available. Tried: ${candidateMethods.join(', ')}`
            + (methodErrors.length > 0 ? `. Errors: ${methodErrors.join(' | ')}` : ''),
        );
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
        });
}

/**
 * List public media formulations.
 * 
 * Retrieves the list of pre-defined public media available for FBA and gapfilling.
 * 
 * @returns Promise resolving to array of public media summaries
 * 
 * @example
 * ```typescript
 * const media = await listPublicMediaFromApi();
 * const complete = media.find(m => m.id === 'Complete');
 * ```
 */
export async function listPublicMediaFromApi(): Promise<ModelseedMediaSummary[]> {
    return listMediaGeneric('/api/media/public');
}

/**
 * List user's custom media formulations.
 * 
 * Retrieves media created by the authenticated user. Includes fallback logic
 * to search common workspace paths if primary endpoint returns empty results.
 * 
 * @returns Promise resolving to array of user media summaries
 * 
 * @example
 * ```typescript
 * const myMedia = await listMyMediaFromApi();
 * console.log(`You have ${myMedia.length} custom media formulations`);
 * ```
 */
export async function listMyMediaFromApi(): Promise<ModelseedMediaSummary[]> {
    return listMediaGeneric('/api/media/mine');
}

/**
 * Safely decode a path/ref string that might be URL-encoded.
 * Handles double-encoding by decoding until no change occurs.
 */
function safeDecodePath(path: string): string {
    try {
        let decoded = path;
        let prev = '';
        // Decode until stable (handles double-encoding)
        while (decoded !== prev) {
            prev = decoded;
            decoded = decodeURIComponent(decoded);
        }
        return decoded;
    } catch {
        return path; // If decoding fails, use original
    }
}

export async function exportMediaFromApi(ref: string): Promise<Record<string, unknown>> {
    // Decode ref to handle cases where it might already be URL-encoded
    // This prevents double-encoding when buildQueryString uses URLSearchParams
    const decodedRef = safeDecodePath(ref);
    return modelseedFetch<Record<string, unknown>>(
        `/api/media/export${buildQueryString({ ref: decodedRef })}`,
    );
}

export async function listModelEditsFromApi(ref: string): Promise<Record<string, unknown>[]> {
    try {
        return await modelseedFetch<Record<string, unknown>[]>(
            `/api/models/edits${buildQueryString({ ref: safeDecodePath(ref) })}`,
        );
    } catch (err) {
        // 404 means no edits exist yet - this is expected for models without edits
        if (err instanceof Error && err.message.includes('(404)')) {
            return [];
        }
        throw err;
    }
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
    for (const [folderPath, entries] of Object.entries(raw)) {
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
            
            // Construct the full path: prefer the tuple's path if it includes the name,
            // otherwise construct from folder path + name
            const nameStr = String(name ?? '');
            let fullPath = path ? String(path) : '';
            if (!fullPath || !fullPath.includes(nameStr)) {
                // Path is missing or doesn't include the media name - construct it
                const folder = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;
                fullPath = `${folder}/${nameStr}`;
            }
            
            summaries.push({
                id: id ? String(id) : nameStr,
                name: nameStr,
                ref: fullPath,
                type: type ? String(type) : undefined,
                modDate: modDate ? String(modDate) : undefined,
                isMinimal: (meta?.isMinimal ?? meta?.is_minimal) as boolean | string | undefined,
                isDefined: (meta?.isDefined ?? meta?.is_defined) as boolean | string | undefined,
            });
        }
    }
    return summaries;
}
