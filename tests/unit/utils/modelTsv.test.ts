import { describe, it, expect } from 'vitest';
import {
    compartmentFromId,
    buildCompoundsTsv,
    buildReactionsTsv,
    type ModelExportJson,
} from '@/lib/utils/modelTsv';

describe('modelTsv', () => {
    describe('compartmentFromId', () => {
        it('extracts the compartment suffix from a compound id', () => {
            expect(compartmentFromId('cpd00443_c0')).toBe('c0');
        });

        it('extracts the compartment suffix from a reaction id', () => {
            expect(compartmentFromId('rxn02201_e0')).toBe('e0');
        });

        it('returns "" when there is no compartment suffix', () => {
            expect(compartmentFromId('cpd00001')).toBe('');
        });

        it('returns "" for undefined', () => {
            expect(compartmentFromId(undefined)).toBe('');
        });

        it('returns "" for null', () => {
            expect(compartmentFromId(null)).toBe('');
        });
    });

    describe('buildCompoundsTsv', () => {
        it('has the exact header row', () => {
            const model: ModelExportJson = {
                compounds: [{ id: 'cpd00443_c0', name: 'ABEE [c0]', formula: 'C7H6NO2', charge: -1 }],
            };
            const [header] = buildCompoundsTsv(model).split('\n');
            expect(header).toBe('id\tname\tformula\tcharge\tcompartment');
        });

        it('renders a compound row with the derived compartment', () => {
            const model: ModelExportJson = {
                compounds: [{ id: 'cpd00443_c0', name: 'ABEE [c0]', formula: 'C7H6NO2', charge: -1 }],
            };
            const [, row] = buildCompoundsTsv(model).split('\n');
            expect(row).toBe('cpd00443_c0\tABEE [c0]\tC7H6NO2\t-1\tc0');
        });

        it('renders charge: 0 as "0", not an empty cell', () => {
            const model: ModelExportJson = {
                compounds: [{ id: 'cpd00001_c0', name: 'H2O', formula: 'H2O', charge: 0 }],
            };
            const [, row] = buildCompoundsTsv(model).split('\n');
            expect(row.split('\t')[3]).toBe('0');
        });

        it('throws when compounds is missing', () => {
            expect(() => buildCompoundsTsv({})).toThrow('This model has no compounds to export.');
        });

        it('throws when compounds is empty', () => {
            expect(() => buildCompoundsTsv({ compounds: [] })).toThrow('This model has no compounds to export.');
        });
    });

    describe('buildReactionsTsv', () => {
        it('has the exact header row', () => {
            const model: ModelExportJson = {
                reactions: [{ id: 'rxn00001_c0', direction: '>', name: 'Test', equation: 'A => B', gpr: 'gene1' }],
            };
            const [header] = buildReactionsTsv(model).split('\n');
            expect(header).toBe('id\tdirection\tcompartment\tgpr\tname\tequation\tpathways');
        });

        it('does not quote a reaction name containing a comma (tab delimiter)', () => {
            const model: ModelExportJson = {
                reactions: [
                    {
                        id: 'rxn00001_c0',
                        direction: '>',
                        name: 'Alpha, Beta Synthase',
                        equation: 'A + B => C',
                        gpr: 'gene1',
                    },
                ],
            };
            const [, row] = buildReactionsTsv(model).split('\n');
            const cells = row.split('\t');
            expect(cells[4]).toBe('Alpha, Beta Synthase');
            expect(cells[4]).not.toContain('"');
        });

        it('joins pathway names with "|", falling back to id when name is empty, de-duplicated', () => {
            const model: ModelExportJson = {
                reactions: [
                    {
                        id: 'rxn00001_c0',
                        direction: '>',
                        pathways: [
                            { source: 'MetaCyc', id: 'PWY-1', name: 'alpha' },
                            { source: 'KEGG', id: 'map001', name: '' },
                        ],
                    },
                ],
            };
            const [, row] = buildReactionsTsv(model).split('\n');
            const cells = row.split('\t');
            expect(cells[6]).toBe('alpha|map001');
        });

        it('renders empty cells for missing name/gpr/equation, with the full column count', () => {
            const model: ModelExportJson = {
                reactions: [{ id: 'rxn00001_c0', direction: '>' }],
            };
            const [, row] = buildReactionsTsv(model).split('\n');
            const cells = row.split('\t');
            expect(cells).toHaveLength(7);
            expect(cells[3]).toBe(''); // gpr
            expect(cells[4]).toBe(''); // name
            expect(cells[5]).toBe(''); // equation
            expect(cells[6]).toBe(''); // pathways
        });

        it('throws when reactions is missing', () => {
            expect(() => buildReactionsTsv({})).toThrow('This model has no reactions to export.');
        });

        it('throws when reactions is empty', () => {
            expect(() => buildReactionsTsv({ reactions: [] })).toThrow('This model has no reactions to export.');
        });
    });
});
