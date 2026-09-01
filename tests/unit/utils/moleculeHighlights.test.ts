import { describe, expect, it } from 'vitest';
import {
    applyAtomLabelColors,
    applyBondColors,
    buildExplicitAtomLabels,
    buildMoleculeHighlightPlan,
    elementInventoryFromMolJson,
    elementSymbolForAtomicNumber,
} from '@/lib/utils/moleculeHighlights';

const BOND_PATH = "<path class='bond-0 atom-0 atom-1' d='M 20.3,245.0 L 130.2,181.5' style='fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:2.0px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1' />";

describe('moleculeHighlights', () => {
    it('maps RDKit atomic numbers, including omitted carbon', () => {
        expect(elementSymbolForAtomicNumber(undefined)).toBe('C');
        expect(elementSymbolForAtomicNumber(8)).toBe('O');
        expect(elementSymbolForAtomicNumber(15)).toBe('P');
        expect(elementSymbolForAtomicNumber(999)).toBe('Z999');
    });

    it('includes implicit hydrogens in inventories', () => {
        expect(elementInventoryFromMolJson({
            molecules: [{ atoms: [{ z: 8, impHs: 2 }], bonds: [] }],
        })).toEqual({ O: 1, H: 2 });
    });

    it('treats omitted atomic numbers as carbon in inventories', () => {
        expect(elementInventoryFromMolJson({
            molecules: [{ atoms: [{}, {}, { z: 8 }, { z: 8 }], bonds: [] }],
        })).toEqual({ C: 2, O: 2 });
    });

    it('safely returns empty inventories and plans for malformed input', () => {
        for (const value of [null, 'x', {}, { molecules: [] }]) {
            expect(elementInventoryFromMolJson(value)).toEqual({});
            expect(buildMoleculeHighlightPlan(value, { O: '#ff0000' })).toEqual({
                atomColors: {}, bondColors: {},
            });
        }
    });

    describe('buildExplicitAtomLabels', () => {
        it('labels every carbon in a pure carbon chain', () => {
            expect(buildExplicitAtomLabels({ molecules: [{ atoms: [{}, {}, {}] }] })).toEqual({ 0: 'C', 1: 'C', 2: 'C' });
        });

        it('labels only carbon atoms in a mixed molecule', () => {
            expect(buildExplicitAtomLabels({ molecules: [{ atoms: [{}, { z: 8 }, { z: 7 }, {}] }] })).toEqual({ 0: 'C', 3: 'C' });
        });

        it('excludes charged and isotopic carbons', () => {
            expect(buildExplicitAtomLabels({ molecules: [{ atoms: [{}, { chg: 1 }, { isotope: 13 }] }] })).toEqual({ 0: 'C' });
        });

        it('returns no labels for unusable input', () => {
            for (const value of [null, 'x', {}, { molecules: [] }, { molecules: [{ atoms: [] }] }]) {
                expect(buildExplicitAtomLabels(value)).toEqual({});
            }
        });
    });

    it('colours only bonds between atoms with the same colour', () => {
        const plan = buildMoleculeHighlightPlan({
            molecules: [{
                atoms: [{ z: 8 }, { z: 8 }, {}, { z: 7 }],
                bonds: [{ atoms: [0, 1] }, { atoms: [1, 2] }, { atoms: [0, 3] }],
            }],
        }, { O: '#ff0000', N: '#0000ff' });

        expect(plan.atomColors).toEqual({ 0: '#ff0000', 1: '#ff0000', 3: '#0000ff' });
        expect(plan.bondColors).toEqual({ 0: '#ff0000' });
    });

    it('recolours atom label fill attributes and styles', () => {
        const fillAttribute = "<path class='atom-2' fill='#000000'/>";
        const fillStyle = "<path class='atom-3' style='fill:#000000;stroke:#000000'/>";
        expect(applyAtomLabelColors(fillAttribute, { 2: '#00ff00' })).toContain("fill='#00ff00'");
        expect(applyAtomLabelColors(fillStyle, { 3: '#abcdef' })).toContain('fill:#abcdef;stroke:#000000');
    });

    it('does not recolour bond tags or unmapped atom labels', () => {
        const bond = "<path class='bond-0 atom-0 atom-1' style='stroke:#000000'/>";
        const unmappedAtom = "<path class='atom-2' fill='#000000'/>";
        expect(applyAtomLabelColors(bond, { 0: '#00ff00' })).toBe(bond);
        expect(applyAtomLabelColors(unmappedAtom, { 1: '#00ff00' })).toBe(unmappedAtom);
    });

    it('returns the identical SVG for an empty atom colour map or SVG', () => {
        const atomLabel = "<path class='atom-2' fill='#000000'/>";
        expect(applyAtomLabelColors(atomLabel, {})).toBe(atomLabel);
        expect(applyAtomLabelColors('', { 2: '#00ff00' })).toBe('');
    });

    it('recolours a bond stroke without changing its path or fill', () => {
        const result = applyBondColors(BOND_PATH, { 0: '#00ff00' });
        expect(result).toContain('stroke:#00ff00');
        expect(result).toContain('fill:none');
        expect(result).toContain("d='M 20.3,245.0 L 130.2,181.5'");
    });

    it('does not confuse bond index prefixes', () => {
        const svg = "<path class='bond-30 atom-1 atom-2' style='stroke:#000000' />";
        expect(applyBondColors(svg, { 3: '#00ff00' })).toBe(svg);
    });

    it('returns the identical SVG for an empty colour map', () => {
        expect(applyBondColors(BOND_PATH, {})).toBe(BOND_PATH);
    });

    it('handles double-quoted class and style attributes', () => {
        const svg = '<path class="bond-0 atom-0 atom-1" style="fill:none;stroke:#000000" />';
        expect(applyBondColors(svg, { 0: '#abcdef' })).toContain('stroke:#abcdef');
    });

    it('recolours a heteroatom half-bond', () => {
        const svg = "<path class='bond-0 atom-0 atom-1' d='M 1,1 L 2,2' style='fill:none;fill-rule:evenodd;stroke:#FF0000;stroke-width:2.0px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1' />";
        const result = applyBondColors(svg, { 0: '#355214' });
        expect(result).toContain('stroke:#355214');
        expect(result).not.toContain('#FF0000');
    });

    it('recolours both halves of a bond', () => {
        const svg = `${BOND_PATH}<path class='bond-0 atom-0 atom-1' style='stroke:#0000FF' />`;
        const result = applyBondColors(svg, { 0: '#355214' });
        expect(result.match(/stroke:#355214/g)).toHaveLength(2);
    });

    it('recolours every hex stroke declaration in a bond style', () => {
        const svg = "<path class='bond-0 atom-0 atom-1' style='stroke:#FF0000;stroke:#0000FF' />";
        expect(applyBondColors(svg, { 0: '#355214' })).toBe(
            "<path class='bond-0 atom-0 atom-1' style='stroke:#355214;stroke:#355214' />",
        );
    });

    it('recolours standalone stroke attributes', () => {
        const svg = '<path class=\'bond-1 atom-2 atom-3\' stroke="#CC9900" />';
        expect(applyBondColors(svg, { 1: '#3FAA18' })).toContain('stroke="#3FAA18"');
    });

    it('leaves fills and atom label glyphs untouched', () => {
        const atomLabel = "<path class='atom-2' d='M 1 1' fill='#FF0000'/>";
        const bond = "<path class='bond-0 atom-0 atom-1' style='fill:none;stroke:#FF0000'/>";
        const result = applyBondColors(`${atomLabel}${bond}`, { 0: '#355214' });
        expect(result).toContain(atomLabel);
        expect(result).toContain('fill:none;stroke:#355214');
    });

    it('leaves non-hex bond strokes unchanged', () => {
        const svg = "<path class='bond-0 atom-0 atom-1' style='stroke:none' />";
        expect(applyBondColors(svg, { 0: '#355214' })).toBe(svg);
    });

    it('recolours lowercase hex bond strokes', () => {
        const svg = "<path class='bond-0 atom-0 atom-1' style='stroke:#ff0000' />";
        expect(applyBondColors(svg, { 0: '#355214' })).toContain('stroke:#355214');
    });
});
