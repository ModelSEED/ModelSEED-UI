import { describe, expect, it } from 'vitest';
import {
    heavyAtomCount,
    isParsableFormula,
    parseFormulaInventory,
} from '@/lib/utils/chemicalFormula';

describe('parseFormulaInventory', () => {
    it('parses repeated symbols and implicit counts', () => {
        expect(parseFormulaInventory('CH3CH3')).toEqual({ C: 2, H: 6 });
        expect(parseFormulaInventory('H2O')).toEqual({ H: 2, O: 1 });
        expect(parseFormulaInventory('R')).toEqual({ R: 1 });
    });

    it('returns an empty inventory for unknown formula syntax', () => {
        for (const formula of [
            null,
            undefined,
            '',
            '  ',
            'C6H12O6(+)',
            '*',
            '2H2O',
            'cH4',
        ]) {
            expect(parseFormulaInventory(formula)).toEqual({});
        }
    });
});

describe('heavyAtomCount', () => {
    it('excludes hydrogen and treats unknown formulas as empty', () => {
        expect(heavyAtomCount('H')).toBe(0);
        expect(heavyAtomCount('H2O')).toBe(1);
        expect(heavyAtomCount('CO2')).toBe(3);
        expect(heavyAtomCount('H4N')).toBe(1);
        expect(heavyAtomCount('C2H3N2O3')).toBe(7);
        expect(heavyAtomCount('C6H12O6(+)')).toBe(0);
    });
});

describe('isParsableFormula', () => {
    it('distinguishes complete formula parses from unknown syntax', () => {
        expect(isParsableFormula('H2O')).toBe(true);
        expect(isParsableFormula('C2H3N2O3')).toBe(true);
        expect(isParsableFormula('H')).toBe(true);
        expect(isParsableFormula('R')).toBe(true);
        expect(isParsableFormula('C6H12O6(+)')).toBe(false);
        expect(isParsableFormula('2H2O')).toBe(false);
        expect(isParsableFormula('')).toBe(false);
        expect(isParsableFormula('   ')).toBe(false);
        expect(isParsableFormula(null)).toBe(false);
        expect(isParsableFormula(undefined)).toBe(false);
    });
});
