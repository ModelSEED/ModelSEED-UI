import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { GridFilterModel } from '@mui/x-data-grid';
import { filterRowsWithGridModel } from '@/lib/hooks/useToolbarGridFiltering';

describe('grid filtering helpers', () => {
    beforeEach(() => {
        vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('supports OR logic for column filters', async () => {
        const { filterDocsByGridModel } = await import('@/lib/api/biochem');
        const rows = [
            { id: 'm1', status: 'queued', type: 'model' },
            { id: 'm2', status: 'completed', type: 'media' },
            { id: 'm3', status: 'failed', type: 'job' },
        ];

        const filtered = filterDocsByGridModel(
            rows,
            [
                { field: 'status', operator: 'equals', value: 'queued' },
                { field: 'type', operator: 'equals', value: 'media' },
            ],
            undefined,
            'or',
        );

        expect(filtered.map((row) => row.id)).toEqual(['m1', 'm2']);
    });

    it('applies quick search terms with AND logic by default', () => {
        const rows = [
            { id: 'm1', name: 'Escherichia coli model', source: 'PATRIC' },
            { id: 'm2', name: 'Bacillus model', source: 'RAST' },
            { id: 'm3', name: 'Escherichia reference', source: 'PlantSEED' },
        ];

        const model: GridFilterModel = {
            items: [],
            quickFilterValues: ['escherichia model'],
        };

        const filtered = filterRowsWithGridModel(rows, model, {
            quickSearchFields: ['name', 'source'],
        });

        expect(filtered.map((row) => row.id)).toEqual(['m1']);
    });

    it('combines column filters with quick search', () => {
        const rows = [
            { id: 'm1', name: 'Athaliana Model', domain: 'plant', status: 'completed' },
            { id: 'm2', name: 'Athaliana Draft', domain: 'plant', status: 'queued' },
            { id: 'm3', name: 'Bacillus Model', domain: 'microbe', status: 'completed' },
        ];

        const model: GridFilterModel = {
            items: [{ field: 'status', operator: 'equals', value: 'completed' }],
            quickFilterValues: ['athaliana'],
        };

        const filtered = filterRowsWithGridModel(rows, model, {
            quickSearchFields: ['name', 'domain'],
        });

        expect(filtered.map((row) => row.id)).toEqual(['m1']);
    });
});
