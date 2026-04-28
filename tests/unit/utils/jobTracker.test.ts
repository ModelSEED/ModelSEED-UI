import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    listTrackedJobs,
    trackJob,
    removeTrackedJob,
    extractTrackedJobId,
    isTerminalJobStatus,
    isActiveJobStatus,
    TrackedJob,
} from '@/lib/api/jobTracker';

describe('jobTracker', () => {
    const mockLocalStorage: Record<string, string> = {};

    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
            setItem: vi.fn((key: string, value: string) => {
                mockLocalStorage[key] = value;
            }),
            removeItem: vi.fn((key: string) => {
                delete mockLocalStorage[key];
            }),
            clear: vi.fn(() => {
                Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
            }),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    });

    describe('listTrackedJobs', () => {
        it('returns empty array when no jobs stored', () => {
            const jobs = listTrackedJobs();
            expect(jobs).toEqual([]);
        });

        it('returns stored jobs', () => {
            const testJobs: TrackedJob[] = [
                { id: 'job1', kind: 'fba', label: 'FBA Test', submittedAt: '2024-01-01' },
            ];
            mockLocalStorage['modelseed:tracked-jobs'] = JSON.stringify(testJobs);
            
            const jobs = listTrackedJobs();
            expect(jobs).toHaveLength(1);
            expect(jobs[0].id).toBe('job1');
        });

        it('returns empty array on invalid JSON', () => {
            mockLocalStorage['modelseed:tracked-jobs'] = 'invalid-json{';
            const jobs = listTrackedJobs();
            expect(jobs).toEqual([]);
        });
    });

    describe('trackJob', () => {
        it('adds new job to storage', () => {
            const job: TrackedJob = {
                id: 'new-job',
                kind: 'gapfill',
                label: 'Gapfill Model',
                submittedAt: '2024-01-01',
            };
            
            trackJob(job);
            
            expect(localStorage.setItem).toHaveBeenCalled();
            const stored = JSON.parse(mockLocalStorage['modelseed:tracked-jobs']);
            expect(stored).toHaveLength(1);
            expect(stored[0].id).toBe('new-job');
        });

        it('adds job to beginning of list', () => {
            const existingJob: TrackedJob = {
                id: 'existing',
                kind: 'fba',
                label: 'Existing FBA',
                submittedAt: '2024-01-01',
            };
            mockLocalStorage['modelseed:tracked-jobs'] = JSON.stringify([existingJob]);

            const newJob: TrackedJob = {
                id: 'new-job',
                kind: 'gapfill',
                label: 'New Gapfill',
                submittedAt: '2024-01-02',
            };
            
            trackJob(newJob);
            
            const stored = JSON.parse(mockLocalStorage['modelseed:tracked-jobs']);
            expect(stored).toHaveLength(2);
            expect(stored[0].id).toBe('new-job');
            expect(stored[1].id).toBe('existing');
        });

        it('replaces existing job with same id', () => {
            const existingJob: TrackedJob = {
                id: 'job1',
                kind: 'fba',
                label: 'Old Label',
                submittedAt: '2024-01-01',
            };
            mockLocalStorage['modelseed:tracked-jobs'] = JSON.stringify([existingJob]);

            const updatedJob: TrackedJob = {
                id: 'job1',
                kind: 'fba',
                label: 'New Label',
                submittedAt: '2024-01-02',
            };
            
            trackJob(updatedJob);
            
            const stored = JSON.parse(mockLocalStorage['modelseed:tracked-jobs']);
            expect(stored).toHaveLength(1);
            expect(stored[0].label).toBe('New Label');
        });
    });

    describe('removeTrackedJob', () => {
        it('removes job by id', () => {
            const jobs: TrackedJob[] = [
                { id: 'job1', kind: 'fba', label: 'FBA', submittedAt: '2024-01-01' },
                { id: 'job2', kind: 'gapfill', label: 'Gapfill', submittedAt: '2024-01-01' },
            ];
            mockLocalStorage['modelseed:tracked-jobs'] = JSON.stringify(jobs);

            removeTrackedJob('job1');

            const stored = JSON.parse(mockLocalStorage['modelseed:tracked-jobs']);
            expect(stored).toHaveLength(1);
            expect(stored[0].id).toBe('job2');
        });

        it('handles removing non-existent job', () => {
            const jobs: TrackedJob[] = [
                { id: 'job1', kind: 'fba', label: 'FBA', submittedAt: '2024-01-01' },
            ];
            mockLocalStorage['modelseed:tracked-jobs'] = JSON.stringify(jobs);

            removeTrackedJob('nonexistent');

            const stored = JSON.parse(mockLocalStorage['modelseed:tracked-jobs']);
            expect(stored).toHaveLength(1);
        });
    });

    describe('extractTrackedJobId', () => {
        it('extracts id from string', () => {
            expect(extractTrackedJobId('my-job-id')).toBe('my-job-id');
        });

        it('extracts id from object with id property', () => {
            expect(extractTrackedJobId({ id: 'job-123' })).toBe('job-123');
        });

        it('extracts job_id from object', () => {
            expect(extractTrackedJobId({ job_id: 'job-456' })).toBe('job-456');
        });

        it('extracts uuid from object', () => {
            expect(extractTrackedJobId({ uuid: 'uuid-789' })).toBe('uuid-789');
        });

        it('extracts from nested result object', () => {
            expect(extractTrackedJobId({ result: { id: 'nested-id' } })).toBe('nested-id');
        });

        it('extracts from array', () => {
            expect(extractTrackedJobId(['job-from-array'])).toBe('job-from-array');
        });

        it('returns null for empty payload', () => {
            expect(extractTrackedJobId(null)).toBeNull();
            expect(extractTrackedJobId(undefined)).toBeNull();
        });

        it('returns null for object without valid id', () => {
            expect(extractTrackedJobId({ other: 'value' })).toBeNull();
        });
    });

    describe('isTerminalJobStatus', () => {
        it('returns true for completed status', () => {
            expect(isTerminalJobStatus('completed')).toBe(true);
            expect(isTerminalJobStatus('Completed')).toBe(true);
            expect(isTerminalJobStatus('COMPLETED')).toBe(true);
        });

        it('returns true for failed status', () => {
            expect(isTerminalJobStatus('failed')).toBe(true);
            expect(isTerminalJobStatus('error')).toBe(true);
        });

        it('returns true for cancelled status', () => {
            expect(isTerminalJobStatus('cancelled')).toBe(true);
            expect(isTerminalJobStatus('canceled')).toBe(true);
        });

        it('returns true for terminated status', () => {
            expect(isTerminalJobStatus('terminated')).toBe(true);
        });

        it('returns false for active statuses', () => {
            expect(isTerminalJobStatus('running')).toBe(false);
            expect(isTerminalJobStatus('pending')).toBe(false);
            expect(isTerminalJobStatus('queued')).toBe(false);
        });

        it('returns false for undefined', () => {
            expect(isTerminalJobStatus(undefined)).toBe(false);
        });
    });

    describe('isActiveJobStatus', () => {
        it('returns false for terminal statuses', () => {
            expect(isActiveJobStatus('completed')).toBe(false);
            expect(isActiveJobStatus('failed')).toBe(false);
        });

        it('returns true for active statuses', () => {
            expect(isActiveJobStatus('running')).toBe(true);
            expect(isActiveJobStatus('pending')).toBe(true);
        });

        it('returns true for undefined', () => {
            expect(isActiveJobStatus(undefined)).toBe(true);
        });
    });
});
