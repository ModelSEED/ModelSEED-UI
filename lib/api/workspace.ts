// lib/api/workspace.ts
/**
 * Utility functions for speaking to the ModelSEED Workspace API
 * using JSON-RPC version 1.1.
 *
 * The endpoint is driven by `lib/api/config.ts` — toggle
 * `USE_NEW_PROXY` to route through the unified proxy.
 */

import { WORKSPACE_URL } from './config';
import { AUTH_STORAGE_KEY } from './auth';

export interface WorkspaceRpcRequest {
    version: '1.1';
    method: string;
    id: number;
    params: any[];
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

/**
 * Retrieve the stored auth token (client-side only).
 * Returns null on the server or when no session exists.
 */
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token ?? null;
    } catch {
        return null;
    }
}

/**
 * Perform a generic Workspace JSON-RPC call.
 * Routes through the endpoint defined in config.ts.
 * Automatically attaches the user's auth token when available.
 */
async function callWorkspaceApi<T>(method: string, params: any[]): Promise<T> {
    const request: WorkspaceRpcRequest = {
        version: '1.1',
        method,
        id: Math.floor(Math.random() * 100000),
        params,
    };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    // Inject auth token if available (raw token, no "Bearer " prefix — legacy compat)
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = token;
    }

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
async function callWorkspaceRestApi<T>(method: string, body: any): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = token;
    }

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

    return await response.json() as T;
}

/**
 * List objects or directories
 * Method: Workspace.ls
 * @param paths Array of workspace paths to list (e.g. ['/plantseed/plantseed/'])
 */
export async function workspaceLs(paths: string[]): Promise<Record<string, any>> {
    if (WORKSPACE_URL.includes('/api/')) {
        return callWorkspaceRestApi<Record<string, any>>('ls', { paths });
    }
    return callWorkspaceApi('Workspace.ls', [{ paths }]);
}

/**
 * Get contents of objects
 * Method: Workspace.get
 * @param objects Array of workspace paths to get (e.g. ['/plantseed/Data/annotation_overview'])
 */
export async function workspaceGet(objects: string[]): Promise<any[]> {
    if (WORKSPACE_URL.includes('/api/')) {
        return callWorkspaceRestApi<any[]>('get', { objects });
    }
    return callWorkspaceApi('Workspace.get', [{ objects }]);
}
