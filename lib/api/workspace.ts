// lib/api/workspace.ts
/**
 * Utility functions for speaking to the ModelSEED Workspace API
 * using JSON-RPC version 1.1
 */

const WORKSPACE_URL = 'https://p3.theseed.org/services/Workspace';

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
 * Perform a generic Workspace JSON-RPC call
 */
async function callWorkspaceApi<T>(method: string, params: any[]): Promise<T> {
    const request: WorkspaceRpcRequest = {
        version: '1.1',
        method,
        id: Math.floor(Math.random() * 100000), // Random ID for the request
        params,
    };

    const response = await fetch(WORKSPACE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
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
 * List objects or directories
 * Method: Workspace.ls
 * @param paths Array of workspace paths to list (e.g. ['/plantseed/plantseed/'])
 */
export async function workspaceLs(paths: string[]): Promise<Record<string, any>> {
    return callWorkspaceApi('Workspace.ls', [{ paths }]);
}

/**
 * Get contents of objects
 * Method: Workspace.get
 * @param objects Array of workspace paths to get (e.g. ['/plantseed/Data/annotation_overview'])
 */
export async function workspaceGet(objects: string[]): Promise<any[]> {
    return callWorkspaceApi('Workspace.get', [{ objects }]);
}
