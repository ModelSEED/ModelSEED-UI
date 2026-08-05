import { describe, it, expect } from 'vitest';
import { EXPORT_OPTIONS } from '@/components/ui/DownloadModelMenu';

// Backend contract, verified live at https://modelseed.org/PMS/openapi.json (2026-08-05):
// "Export a model in the specified format.  Supported formats: json, sbml, cobrapy."
const API_SUPPORTED_FORMATS = ['json', 'sbml', 'cobrapy'];

describe('DownloadModelMenu EXPORT_OPTIONS contract', () => {
    it('never requests a format outside the API-supported set for kind:"api" options', () => {
        const apiOptions = EXPORT_OPTIONS.filter((option) => option.kind === 'api');
        expect(apiOptions.length).toBeGreaterThan(0);
        for (const option of apiOptions) {
            expect(API_SUPPORTED_FORMATS).toContain(option.format);
        }
    });

    it('never requests the unsupported "tsv" format from the API', () => {
        for (const option of EXPORT_OPTIONS) {
            if (option.kind === 'api') {
                expect(option.format).not.toBe('tsv');
            }
        }
    });

    it('has unique option keys', () => {
        const keys = EXPORT_OPTIONS.map((option) => option.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('includes both derived TSV table options', () => {
        const reactionsTsv = EXPORT_OPTIONS.find((option) => option.key === 'reactions-tsv');
        const compoundsTsv = EXPORT_OPTIONS.find((option) => option.key === 'compounds-tsv');

        expect(reactionsTsv).toBeDefined();
        expect(reactionsTsv?.kind).toBe('derived-tsv');
        expect(compoundsTsv).toBeDefined();
        expect(compoundsTsv?.kind).toBe('derived-tsv');
    });
});
