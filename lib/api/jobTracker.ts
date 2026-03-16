'use client';

export interface TrackedJob {
    id: string;
    kind: 'reconstruct' | 'gapfill' | 'fba' | 'merge';
    label: string;
    modelId?: string;
    relatedRef?: string;
    submittedAt: string;
}

const TRACKED_JOBS_STORAGE_KEY = 'modelseed:tracked-jobs';

function canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

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

function writeTrackedJobs(jobs: TrackedJob[]): void {
    if (!canUseStorage()) return;
    localStorage.setItem(TRACKED_JOBS_STORAGE_KEY, JSON.stringify(jobs.slice(0, 25)));
}

export function trackJob(job: TrackedJob): void {
    const existing = listTrackedJobs().filter((item) => item.id !== job.id);
    writeTrackedJobs([job, ...existing]);
}

export function removeTrackedJob(jobId: string): void {
    writeTrackedJobs(listTrackedJobs().filter((job) => job.id !== jobId));
}

export function extractTrackedJobId(payload: unknown): string | null {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) {
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
        if ('result' in candidate) {
            return extractTrackedJobId(candidate.result);
        }
    }
    return null;
}

export function isTerminalJobStatus(status: string | undefined): boolean {
    if (!status) return false;
    return ['completed', 'failed', 'error', 'cancelled', 'canceled', 'terminated'].includes(
        status.toLowerCase(),
    );
}

export function isActiveJobStatus(status: string | undefined): boolean {
    if (!status) return true;
    return !isTerminalJobStatus(status);
}
