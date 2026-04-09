'use client';

/**
 * Client-side job tracking for ModelSEED operations.
 * 
 * Provides localStorage-based tracking of submitted jobs (reconstruct, gapfill,
 * FBA, merge) so users can monitor job status across page reloads. Automatically
 * manages a rolling list of the most recent jobs.
 */

export interface TrackedJob {
    id: string;
    kind: 'reconstruct' | 'gapfill' | 'fba' | 'merge';
    label: string;
    modelId?: string;
    relatedRef?: string;
    submittedAt: string;
}

const TRACKED_JOBS_STORAGE_KEY = 'modelseed:tracked-jobs';

/** Maximum number of jobs to keep in localStorage (prevents unbounded growth). */
const MAX_TRACKED_JOBS = 25;

/**
 * Check if localStorage is available (client-side check).
 * 
 * @returns True if window and localStorage are defined
 */
function canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * List all currently tracked jobs from localStorage.
 * 
 * Returns jobs in reverse chronological order (most recent first).
 * Safe to call in SSR context (returns empty array).
 * 
 * @returns Array of tracked jobs, or empty array if none or in SSR
 * 
 * @example
 * ```typescript
 * const jobs = listTrackedJobs();
 * jobs.forEach(job => {
 *   console.log(`${job.label} (${job.kind}): ${job.id}`);
 * });
 * ```
 */
export function listTrackedJobs(): TrackedJob[] {
    if (!canUseStorage()) return [];
    try {
        const raw = localStorage.getItem(TRACKED_JOBS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed as TrackedJob[] : [];
    } catch {
        return [];
    }
}

/**
 * Write tracked jobs to localStorage with size limit.
 * 
 * @param jobs - Jobs to persist (will be trimmed to MAX_TRACKED_JOBS)
 */
function writeTrackedJobs(jobs: TrackedJob[]): void {
    if (!canUseStorage()) return;
    localStorage.setItem(TRACKED_JOBS_STORAGE_KEY, JSON.stringify(jobs.slice(0, MAX_TRACKED_JOBS)));
}

/**
 * Add or update a tracked job in localStorage.
 * 
 * If a job with the same ID already exists, it will be replaced with the new data.
 * Jobs are stored in reverse chronological order (most recent first).
 * Automatically maintains a maximum of MAX_TRACKED_JOBS entries.
 * 
 * @param job - Job to track
 * 
 * @example
 * ```typescript
 * const job: TrackedJob = {
 *   id: 'job-12345',
 *   kind: 'reconstruct',
 *   label: 'Reconstruct E. coli model',
 *   modelId: 'model-789',
 *   submittedAt: new Date().toISOString()
 * };
 * trackJob(job);
 * ```
 */
export function trackJob(job: TrackedJob): void {
    const existing = listTrackedJobs().filter((item) => item.id !== job.id);
    writeTrackedJobs([job, ...existing]);
}

/**
 * Remove a job from the tracked jobs list.
 * 
 * Use this when a job is dismissed or no longer needs tracking.
 * 
 * @param jobId - ID of the job to remove
 * 
 * @example
 * ```typescript
 * removeTrackedJob('job-12345');
 * ```
 */
export function removeTrackedJob(jobId: string): void {
    writeTrackedJobs(listTrackedJobs().filter((job) => job.id !== jobId));
}

/**
 * Extract job ID from various API response structures.
 * 
 * Handles different backend response formats by recursively searching for
 * common job ID field names (id, job_id, jobId, task_id, taskId, uuid).
 * Returns null if no recognizable ID is found.
 * 
 * @param payload - API response payload (can be string, object, or array)
 * @returns Extracted job ID string, or null if not found
 * 
 * @example
 * ```typescript
 * const response = await submitReconstructJobFromApi(params);
 * const jobId = extractTrackedJobId(response);
 * if (jobId) trackJob({ id: jobId, kind: 'reconstruct', ... });
 * ```
 */
export function extractTrackedJobId(payload: unknown): string | null {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) {
        // Recursively search array elements
        for (const item of payload) {
            const nested = extractTrackedJobId(item);
            if (nested) return nested;
        }
        return null;
    }
    if (typeof payload === 'object') {
        const candidate = payload as Record<string, unknown>;
        const directKeys = ['id', 'job_id', 'jobId', 'task_id', 'taskId', 'uuid'];
        for (const key of directKeys) {
            const value = candidate[key];
            if (typeof value === 'string' && value.length > 0) {
                return value;
            }
        }
        // Check nested 'result' field (common in JSON-RPC responses)
        if ('result' in candidate) {
            return extractTrackedJobId(candidate.result);
        }
    }
    return null;
}

/**
 * Check if a job status indicates terminal state (completed or failed).
 * 
 * Terminal statuses mean the job is no longer running and polling should stop.
 * 
 * @param status - Job status string (case-insensitive)
 * @returns True if status indicates job has finished (success or failure)
 * 
 * @example
 * ```typescript
 * if (isTerminalJobStatus(job.status)) {
 *   clearInterval(pollingInterval);
 *   console.log('Job finished');
 * }
 * ```
 */
export function isTerminalJobStatus(status: string | undefined): boolean {
    if (!status) return false;
    return ['completed', 'failed', 'error', 'cancelled', 'canceled', 'terminated'].includes(
        status.toLowerCase(),
    );
}

/**
 * Check if a job status indicates active/running state.
 * 
 * Active statuses mean the job is still in progress and polling should continue.
 * Returns true if status is undefined (assume active until proven otherwise).
 * 
 * @param status - Job status string
 * @returns True if job is still running or status is unknown
 * 
 * @example
 * ```typescript
 * if (isActiveJobStatus(job.status)) {
 *   console.log('Job is still running, continue polling');
 * }
 * ```
 */
export function isActiveJobStatus(status: string | undefined): boolean {
    if (!status) return true;
    return !isTerminalJobStatus(status);
}
