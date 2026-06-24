import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatJobError, presentJobSubmitError } from '@/lib/utils/jobErrors';
import { ModelseedApiError } from '@/lib/api/modelseed';

describe('formatJobError', () => {
    it('returns undefined for empty inputs', () => {
        expect(formatJobError(null)).toBeUndefined();
        expect(formatJobError(undefined)).toBeUndefined();
        expect(formatJobError('')).toBeUndefined();
        expect(formatJobError('   ')).toBeUndefined();
    });

    it('translates the legacy _ERROR_Object not found!_ERROR_ wording', () => {
        const out = formatJobError("WorkspaceError('_ERROR_Object not found!_ERROR_')");
        expect(out).toContain('No model found');
        expect(out).toContain('reconstruct job');
        expect(out).not.toContain('_ERROR_');
    });

    it('embeds the model ref into the legacy-form message when provided', () => {
        const out = formatJobError(
            "WorkspaceError('_ERROR_Object not found!_ERROR_')",
            '/alice@patricbrc.org/modelseed/Ecoli/model',
        );
        expect(out).toContain("at '/alice@patricbrc.org/modelseed/Ecoli/model'");
    });

    it("handles a less-decorated 'Object not found' substring", () => {
        const out = formatJobError('Object not found', '/u/modelseed/x/model');
        expect(out).toContain("at '/u/modelseed/x/model'");
        expect(out).toContain('No model found');
    });

    it("passes through the new backend message unchanged", () => {
        const backendNew =
            "No model found at '/alice/modelseed/Ecoli/model'. Check that your " +
            'reconstruct job completed successfully and saved a model to this path, ' +
            'or pass a different ref.';
        const out = formatJobError(backendNew);
        expect(out).toContain('No model found');
        expect(out).toContain('reconstruct job');
        expect(out).not.toContain('_ERROR_');
    });

    it("leaves unrelated errors untouched", () => {
        expect(formatJobError('Token validation failed: bogus signer')).toBe(
            'Token validation failed: bogus signer',
        );
        expect(formatJobError('HTTPError("504 Gateway Timeout")')).toBe(
            'HTTPError("504 Gateway Timeout")',
        );
    });

    it('coerces non-string inputs via String()', () => {
        const err = new Error("WorkspaceError('_ERROR_Object not found!_ERROR_')");
        const out = formatJobError(err);
        expect(out).toContain('No model found');
    });
});

describe('presentJobSubmitError', () => {
    beforeEach(() => {
        vi.stubEnv('NEXT_PUBLIC_USE_MODELSEED_API', 'true');
        vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:8000');
    });
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('lifts structured backend detail onto the presented error', () => {
        const err = new ModelseedApiError(
            404,
            'modelseed-api /api/jobs/reconstruct failed (404): Genome not found',
            {
                detail: {
                    code: 'GENOME_NOT_FOUND',
                    message: 'Genome "9999999.9" could not be fetched from BV-BRC.',
                    hint: 'Check the genome ID is correct (BV-BRC format).',
                    field: 'genome',
                    retryable: false,
                },
            },
        );
        const out = presentJobSubmitError(err);
        expect(out.code).toBe('GENOME_NOT_FOUND');
        expect(out.message).toBe('Genome "9999999.9" could not be fetched from BV-BRC.');
        expect(out.hint).toBe('Check the genome ID is correct (BV-BRC format).');
        expect(out.field).toBe('genome');
        expect(out.retryable).toBe(false);
        expect(out.status).toBe(404);
        expect(out.isTokenExpired).toBe(false);
        expect(out.display).toContain('Genome');
        expect(out.display).toContain('Check the genome ID');
    });

    it('flags TOKEN_EXPIRED for the auth redirect path', () => {
        const err = new ModelseedApiError(401, 'failed (401)', {
            detail: {
                code: 'TOKEN_EXPIRED',
                message: 'Your PATRIC token has expired.',
                hint: 'Sign in again to continue.',
                field: null,
                retryable: false,
            },
        });
        expect(presentJobSubmitError(err).isTokenExpired).toBe(true);
    });

    it('treats a raw 401 with no structured body as expired (defensive)', () => {
        const err = new ModelseedApiError(401, 'failed (401)');
        const out = presentJobSubmitError(err);
        expect(out.isTokenExpired).toBe(true);
        expect(out.code).toBeUndefined();
    });

    it('falls back on plain Error.message when no detail is available', () => {
        const out = presentJobSubmitError(new Error('Network unreachable'));
        expect(out.message).toBe('Network unreachable');
        expect(out.code).toBeUndefined();
        expect(out.isTokenExpired).toBe(false);
        expect(out.display).toBe('Network unreachable');
    });

    it('humanizes legacy _ERROR_Object not found_ERROR_ via modelRef', () => {
        const out = presentJobSubmitError(
            new Error('_ERROR_Object not found!_ERROR_'),
            { modelRef: '/foo/bar/baz' },
        );
        expect(out.message).toContain('No model found');
        expect(out.message).toContain('/foo/bar/baz');
    });

    it('accepts plain strings safely', () => {
        const out = presentJobSubmitError('Something exploded');
        expect(out.message).toBe('Something exploded');
        expect(out.display).toBe('Something exploded');
    });
});
