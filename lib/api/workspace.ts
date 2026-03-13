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

    if (!response.ok) {
        throw new Error(`Workspace API HTTP error! status: ${response.status}`);
    }

    const data: WorkspaceRpcResponse<T> = await response.json();

    if (data.error) {
        throw new Error(`Workspace API error: ${data.error.message}`);
    }

    if (!data.result) {
        throw new Error('Workspace API returned no result');
    }

    return data.result[0];
}

/**
 * Perform a REST call to the new modelseed-api (Poplar) Workspace endpoints.
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

    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail ?? `Workspace REST error! status: ${response.status}`);
    }

    const payload = await response.json() as unknown;
    return unwrapWorkspaceResponse<T>(payload);
}

/**
 * List objects or directories
 * Method: Workspace.ls
 * @param paths Array of workspace paths to list (e.g. ['/plantseed/plantseed/'])
 */
export async function workspaceLs(paths: string[]): Promise<Record<string, unknown[]>> {
    if (USE_NEW_PROXY) {
        return callWorkspaceRestApi<Record<string, unknown[]>>('ls', { paths });
    }
    return callWorkspaceApi('Workspace.ls', [{ paths }]);
}

/**
 * Get contents of objects
 * Method: Workspace.get
 * @param objects Array of workspace paths to get (e.g. ['/plantseed/Data/annotation_overview'])
 */
export async function workspaceGet(objects: string[]): Promise<unknown[]> {
    if (USE_NEW_PROXY) {
        return callWorkspaceRestApi<unknown[]>('get', { objects });
    }
    return callWorkspaceApi('Workspace.get', [{ objects }]);
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

export async function workspacePermissions(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspacePermissions');
    return callWorkspaceRestApi<Record<string, unknown>>('permissions', body);
}

export async function workspaceDownloadUrl(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceDownloadUrl');
    return callWorkspaceRestApi<Record<string, unknown>>('download-url', body);
}
