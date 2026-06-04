import { describe, it, expect } from 'vitest';
import { formatJobError } from '@/lib/utils/jobErrors';

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
