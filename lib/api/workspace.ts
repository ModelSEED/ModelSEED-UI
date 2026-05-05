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

// DEAD CODE REMOVED: callWorkspaceApi (legacy JSON-RPC fallback)
// This function was never called - all workspace operations now route through
// callWorkspaceRestApi. The legacy JSON-RPC support via USE_NEW_PROXY=false
// is no longer actively used. If legacy support is needed in the future,
// re-implement with proper routing logic in individual workspace functions.

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
 * Safely decode a URL-encoded path, handling double-encoding.
 * 
 * Decodes the path iteratively until it reaches a stable state,
 * which handles cases where paths are accidentally double-encoded.
 * 
 * @param path - Path string that may be URL-encoded
 * @returns Decoded path string
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

// DEAD CODE REMOVED: callWorkspaceApi (legacy JSON-RPC fallback)
// This function was never called - all workspace operations now route through
// callWorkspaceRestApi. The legacy JSON-RPC support via USE_NEW_PROXY=false
// is no longer actively used. If legacy support is needed in the future,
// re-implement with proper routing logic in individual workspace functions.

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
        
        const errorDetails = {
            status: response.status,
            statusMessage,
            backendMessage,
            payload,
        };

        // 401 unauthenticated responses are expected for signed-out sessions.
        if (response.status === 401) {
            console.info(`Workspace ${endpoint} unauthenticated:`, errorDetails);
        } else {
            console.error(`Workspace ${endpoint} error:`, errorDetails);
        }
        
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
 * List objects or directories in the workspace.
 * 
 * Retrieves directory listings for the specified workspace paths. Each path
 * maps to an array of workspace entry tuples containing metadata about files
 * and directories.
 * 
 * @param paths - Array of workspace directory paths to list (e.g., ['/username@patricbrc.org/models'])
 * @returns Dictionary mapping each path to an array of workspace entries
 * @throws {Error} When request fails or paths are invalid
 * 
 * @example
 * ```typescript
 * const listings = await workspaceLs(['/user@patricbrc.org/models']);
 * // listings['/user@patricbrc.org/models'] contains array of [name, type, path, modDate, id, ...]
 * ```
 */
export async function workspaceLs(paths: string[]): Promise<Record<string, unknown[]>> {
    // Always route through the new REST proxy (`/api/workspace/ls`).
    // Legacy JSON-RPC `Workspace.ls` is no longer used.
    // Decode paths to handle cases where they might be URL-encoded
    const decodedPaths = paths.map(p => safeDecodePath(p));
    return callWorkspaceRestApi<Record<string, unknown[]>>('ls', { paths: decodedPaths });
}

/**
 * Retrieve full contents of workspace objects.
 * 
 * Fetches the complete data for the specified workspace objects. Response
 * structure varies by object type (models, media, genomes, etc.).
 * 
 * @param objects - Array of workspace object paths (e.g., ['/user@patricbrc.org/models/MyModel'])
 * @returns Array of workspace object data (use parseWorkspaceGetObject to extract typed data)
 * @throws {Error} When request fails or objects don't exist
 * 
 * @example
 * ```typescript
 * const results = await workspaceGet(['/user@patricbrc.org/models/MyModel']);
 * const modelData = parseWorkspaceGetObject(results, 0);
 * ```
 */
export async function workspaceGet(objects: string[]): Promise<unknown[]> {
    // Always route through the new REST proxy (`/api/workspace/get`).
    // Legacy JSON-RPC `Workspace.get` is no longer used.
    // Decode paths to handle cases where they might be URL-encoded (e.g., from route params)
    const decodedObjects = objects.map(obj => safeDecodePath(obj));
    return callWorkspaceRestApi<unknown[]>('get', { objects: decodedObjects });
}

/**
 * Ensure USE_NEW_PROXY is enabled for operations requiring the REST proxy.
 * 
 * @param operation - Name of the operation being attempted
 * @throws {Error} When USE_NEW_PROXY is false
 */
function ensureProxyMode(operation: string): void {
    if (!USE_NEW_PROXY) {
        throw new Error(`${operation} requires USE_NEW_PROXY=true`);
    }
}

/**
 * Create a new workspace object.
 * 
 * Creates models, media, or other workspace objects via the REST proxy.
 * Requires USE_NEW_PROXY=true.
 * 
 * @param body - Creation request body (structure depends on object type)
 * @returns Response with created object metadata
 * @throws {Error} When USE_NEW_PROXY is false or creation fails
 */
export async function workspaceCreate(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceCreate');
    return callWorkspaceRestApi<Record<string, unknown>>('create', body);
}

/**
 * Delete workspace object(s).
 * 
 * Permanently removes objects from the workspace. Requires USE_NEW_PROXY=true.
 * 
 * @param body - Deletion request body with object paths
 * @returns Response confirming deletion
 * @throws {Error} When USE_NEW_PROXY is false or deletion fails
 */
export async function workspaceDelete(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceDelete');
    return callWorkspaceRestApi<Record<string, unknown>>('delete', body);
}

// DEAD CODE REMOVED: workspaceCopy
// This function had zero references in the codebase. If copy functionality
// is needed in the future, implement it with proper documentation and usage.

/**
 * Retrieve metadata for workspace objects.
 * 
 * Gets object metadata without fetching full contents. Requires USE_NEW_PROXY=true.
 * 
 * @param body - Metadata request body with object paths
 * @returns Object metadata
 * @throws {Error} When USE_NEW_PROXY is false or request fails
 */
export async function workspaceMetadata(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceMetadata');
    return callWorkspaceRestApi<Record<string, unknown>>('metadata', body);
}

/**
 * Update user-editable metadata fields on a workspace object.
 * 
 * Updates fields like name, description, or other metadata. Uses the
 * Workspace update_metadata RPC method via REST proxy. Requires USE_NEW_PROXY=true.
 * 
 * @param path - Workspace path of the object (e.g., '/user/modelseed/MyModel')
 * @param updates - Key-value pairs to update (e.g., { name: 'New Name', description: 'New description' })
 * @returns Response confirming update
 * @throws {Error} When USE_NEW_PROXY is false or update fails
 * 
 * @example
 * ```typescript
 * await workspaceUpdateMetadata('/user@patricbrc.org/models/Model1', {
 *   name: 'Updated Model Name',
 *   description: 'New description'
 * });
 * ```
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

/**
 * Manage workspace permissions.
 * 
 * Set or modify access permissions for workspace objects. Requires USE_NEW_PROXY=true.
 * 
 * @param body - Permissions request body
 * @returns Response with updated permissions
 * @throws {Error} When USE_NEW_PROXY is false or request fails
 */
export async function workspacePermissions(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspacePermissions');
    return callWorkspaceRestApi<Record<string, unknown>>('permissions', body);
}

/**
 * Generate a download URL for workspace object(s).
 * 
 * Creates a temporary download URL for exporting workspace data. Requires USE_NEW_PROXY=true.
 * 
 * @param body - Download request body with object paths
 * @returns Response with download URL
 * @throws {Error} When USE_NEW_PROXY is false or request fails
 */
export async function workspaceDownloadUrl(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    ensureProxyMode('workspaceDownloadUrl');
    return callWorkspaceRestApi<Record<string, unknown>>('download-url', body);
}
