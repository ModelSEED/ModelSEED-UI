// lib/api/workspace.ts
/**
 * Utility functions for speaking to the ModelSEED Workspace API
 * using JSON-RPC version 1.1.
 *
 * The endpoint is driven by `lib/api/config.ts` — toggle
 * `USE_NEW_PROXY` to route through the unified proxy.
 */

import { USE_NEW_PROXY, WORKSPACE_URL } from './config';
import { withRawTokenAuth } from './requestAuth';

export interface WorkspaceRpcRequest {
    version: '1.1';
    method: string;
    id: number;
    params: unknown[];
}

export interface WorkspaceRpcResponse<T> {
    version: '1.1';
    result?: T[]; // The response is typically an array where result[0] is the main payload
    error?: {
        name: string;
        code: number;
        message: string;
        error: string;
    };
    id: number;
}

type WorkspaceGetTuple = [unknown, unknown, ...unknown[]];

function extractWorkspaceErrorMessage(payload: unknown): string | null {
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

async function parseJsonResponse(response: Response): Promise<unknown> {
    const raw = await response.text().catch(() => '');
    if (!raw) return null;
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return { raw };
    }
}

function unwrapWorkspaceResponse<T>(payload: unknown): T {
    if (
        payload &&
        typeof payload === 'object' &&
        'result' in payload &&
        Array.isArray((payload as WorkspaceRpcResponse<T>).result)
    ) {
        return ((payload as WorkspaceRpcResponse<T>).result?.[0]) as T;
    }
    return payload as T;
}

export function parseWorkspaceGetObject<T = unknown>(payload: unknown, index = 0): T | null {
    const unwrapped = unwrapWorkspaceResponse<unknown>(payload);

    let candidate: unknown = unwrapped;
    if (Array.isArray(unwrapped)) {
        const entry = unwrapped[index] ?? unwrapped[0];
        if (Array.isArray(entry)) {
            const tuple = entry as WorkspaceGetTuple;
            candidate = tuple.length > 1 ? tuple[1] : tuple[0];
        } else {
            candidate = entry;
        }
    }

    if (candidate && typeof candidate === 'object' && 'data' in (candidate as Record<string, unknown>)) {
        candidate = (candidate as { data?: unknown }).data;
    }

    if (typeof candidate === 'string') {
        try {
            return JSON.parse(candidate) as T;
        } catch {
            return candidate as T;
        }
    }

    if (candidate == null) return null;
    return candidate as T;
}

/**
 * Perform a generic Workspace JSON-RPC call.
 * Routes through the endpoint defined in config.ts.
 * Automatically attaches the user's auth token when available.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Legacy JSON-RPC fallback, retained for USE_NEW_PROXY=false mode
async function callWorkspaceApi<T>(method: string, params: unknown[]): Promise<T> {
    const request: WorkspaceRpcRequest = {
        version: '1.1',
        method,
        id: Math.floor(Math.random() * 100000),
        params,
    };

    const baseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    const headers = withRawTokenAuth(baseHeaders);

    const response = await fetch(WORKSPACE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        // next caches fetch by default in some configurations, let's allow it but revalidate reasonably
        next: { revalidate: 3600 }
    });

    const payload = await parseJsonResponse(response);
    if (!response.ok) {
        const backendMessage = extractWorkspaceErrorMessage(payload);
        const statusMessage = STATUS_MESSAGES[response.status] || 'Request failed';
        
        // Log full error details for debugging
        console.error(`Workspace JSON-RPC ${method} error:`, {
            status: response.status,
            statusMessage,
            backendMessage,
            payload,
        });
        
        const userMessage = backendMessage
            ? `${statusMessage} - ${backendMessage}`
            : statusMessage;
        
        throw new Error(
            `Workspace ${method} failed (${response.status}): ${userMessage}`,
        );
    }

    const data = payload as WorkspaceRpcResponse<T>;

    if (data.error) {
        throw new Error(`Workspace API error: ${data.error.message}`);
    }

    if (!data.result) {
        throw new Error('Workspace API returned no result');
    }

    return data.result[0];
}

/**
 * User-friendly descriptions for common HTTP status codes from the Poplar backend.
 */
const STATUS_MESSAGES: Record<number, string> = {
    400: 'Bad request - check input parameters',
    401: 'Authentication required',
    403: 'Permission denied - you don\'t have access to this resource',
    404: 'Object not found - the requested resource does not exist',
    422: 'Invalid request format',
    500: 'Internal server error - please try again later',
    502: 'Upstream service unavailable - backend is temporarily unavailable',
    503: 'Service unavailable - please try again later',
};

/**
 * Safely decode a path string that might be URL-encoded.
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

/**
 * Perform a REST call to the new modelseed-api (Poplar) Workspace endpoints.
 * Returns proper HTTP status codes (404/403/502) with meaningful error messages.
 */
async function callWorkspaceRestApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const baseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    const headers = withRawTokenAuth(baseHeaders);

    // method 'ls' -> '/api/workspace/ls'
    const endpoint = method.toLowerCase().replace('workspace.', '');
    const url = `${WORKSPACE_URL}/${endpoint}`;

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    const payload = await parseJsonResponse(response);
    if (!response.ok) {
        const backendMessage = extractWorkspaceErrorMessage(payload);
        const statusMessage = STATUS_MESSAGES[response.status] || 'Request failed';
        
        // Log full error details for debugging
        console.error(`Workspace ${endpoint} error:`, {
            status: response.status,
            statusMessage,
            backendMessage,
            payload,
        });
        
        // Construct user-friendly error message
        const userMessage = backendMessage
            ? `${statusMessage} - ${backendMessage}`
            : statusMessage;
        
        throw new Error(
            `Workspace ${endpoint} failed (${response.status}): ${userMessage}`,
        );
    }

    return unwrapWorkspaceResponse<T>(payload);
}

/**
 * List objects or directories
 * Method: Workspace.ls
 * @param paths Array of workspace paths to list (e.g. ['/plantseed/plantseed/'])
 */
export async function workspaceLs(paths: string[]): Promise<Record<string, unknown[]>> {
    // Always route through the new REST proxy (`/api/workspace/ls`).
    // Legacy JSON-RPC `Workspace.ls` is no longer used.
    // Decode paths to handle cases where they might be URL-encoded
    const decodedPaths = paths.map(p => safeDecodePath(p));
    return callWorkspaceRestApi<Record<string, unknown[]>>('ls', { paths: decodedPaths });
}

/**
 * Get contents of objects
 * Method: Workspace.get
 * @param objects Array of workspace paths to get (e.g. ['/plantseed/Data/annotation_overview'])
 */
export async function workspaceGet(objects: string[]): Promise<unknown[]> {
    // Always route through the new REST proxy (`/api/workspace/get`).
    // Legacy JSON-RPC `Workspace.get` is no longer used.
    // Decode paths to handle cases where they might be URL-encoded (e.g., from route params)
    const decodedObjects = objects.map(obj => safeDecodePath(obj));
    return callWorkspaceRestApi<unknown[]>('get', { objects: decodedObjects });
}

function ensureProxyMode(operation: string): void {
    if (!USE_NEW_PROXY) {
        throw new Error(`${operation} requires USE_NEW_PROXY=true`);
    }
}

export async function workspaceCreate(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceCreate');
    return callWorkspaceRestApi<Record<string, unknown>>('create', body);
}

export async function workspaceDelete(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceDelete');
    return callWorkspaceRestApi<Record<string, unknown>>('delete', body);
}

export async function workspaceCopy(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceCopy');
    return callWorkspaceRestApi<Record<string, unknown>>('copy', body);
}

export async function workspaceMetadata(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceMetadata');
    return callWorkspaceRestApi<Record<string, unknown>>('metadata', body);
}

/**
 * Update user-editable metadata fields on a workspace object.
 * Uses the Workspace `update_metadata` RPC method via REST proxy.
 * @param path Workspace path of the object (e.g. '/user/modelseed/MyModel')
 * @param updates Key-value pairs to update (e.g. { name: 'New Name', description: 'desc' })
 */
export async function workspaceUpdateMetadata(
    path: string,
    updates: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceUpdateMetadata');
    return callWorkspaceRestApi<Record<string, unknown>>('update-metadata', {
        objects: [[path, updates]],
    });
}

export async function workspacePermissions(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspacePermissions');
    return callWorkspaceRestApi<Record<string, unknown>>('permissions', body);
}

export async function workspaceDownloadUrl(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceDownloadUrl');
    return callWorkspaceRestApi<Record<string, unknown>>('download-url', body);
}
