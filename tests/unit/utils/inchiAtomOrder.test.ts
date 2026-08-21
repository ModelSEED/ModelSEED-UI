import { describe, expect, it } from 'vitest';
import {
    buildInchiAtomOrbits,
    canonicalIndexForElementRef,
    hillCanonicalElements,
    parseInchiConnections,
} from '@/lib/utils/inchiAtomOrder';

const phosphateInchi = 'InChI=1S/H3O4P/c1-5(2,3)4/h(H3,1,2,3,4)';
const phosphateGraph = {
    elements: ['O', 'P', 'O', 'O', 'O'],
    bonds: [[0, 1], [1, 2], [1, 3], [1, 4]] as Array<[number, number]>,
};

function edgeSet(edges: Array<[number, number]> | undefined): string[] {
    return (edges ?? []).map(([left, right]) => `${left}-${right}`).sort();
}

describe('hillCanonicalElements', () => {
    it('expands formulae in canonical Hill heavy-atom order', () => {
        expect(hillCanonicalElements('H3O4P')).toEqual(['O', 'O', 'O', 'O', 'P']);
        expect(hillCanonicalElements('C5H9NO4')).toEqual(['C', 'C', 'C', 'C', 'C', 'N', 'O', 'O', 'O', 'O']);
        expect(hillCanonicalElements('CO2')).toEqual(['C', 'O', 'O']);
        expect(hillCanonicalElements('C2H3ClO')).toEqual(['C', 'C', 'Cl', 'O']);
        expect(hillCanonicalElements('H2O')).toEqual(['O']);
    });
});

describe('parseInchiConnections', () => {
    it('parses both documented branch forms', () => {
        expect(edgeSet(parseInchiConnections('1-5(2,3)4'))).toEqual(['1-5', '2-5', '3-5', '4-5']);
        expect(edgeSet(parseInchiConnections('6-3(5(9)10)1-2-4(7)8'))).toEqual([
            '1-2', '1-3', '2-4', '3-5', '3-6', '4-7', '4-8', '5-10', '5-9',
        ]);
    });
});

describe('buildInchiAtomOrbits', () => {
    it('maps cpd00009 phosphorus to its RDKit local index without false colouring', () => {
        const result = buildInchiAtomOrbits(phosphateInchi, phosphateGraph);
        expect(result).toMatchObject({
            ok: true,
            solutionCount: 24,
            canonicalElements: ['O', 'O', 'O', 'O', 'P'],
            exact: false,
        });
        if (!result.ok) return;
        expect(result.orbits[4]).toEqual([1]);
        expect(result.orbits.slice(0, 4)).toEqual([[0, 2, 3, 4], [0, 2, 3, 4], [0, 2, 3, 4], [0, 2, 3, 4]]);
        expect(canonicalIndexForElementRef(result.canonicalElements, 'P', 1)).toBe(5);
        expect(result.orbits[canonicalIndexForElementRef(result.canonicalElements, 'P', 1)! - 1]).toEqual([1]);
    });

    it('handles CO2 symmetry', () => {
        const result = buildInchiAtomOrbits('InChI=1S/CO2/c2-1-3', {
            elements: ['O', 'C', 'O'], bonds: [[0, 1], [1, 2]],
        });
        expect(result).toMatchObject({ ok: true, solutionCount: 2 });
        if (result.ok) expect(result.orbits).toEqual([[1], [0, 2], [0, 2]]);
    });

    it('handles a single heavy atom with no /c layer', () => {
        expect(buildInchiAtomOrbits('InChI=1S/H2O/h1H2', { elements: ['O'], bonds: [] }))
            .toEqual(expect.objectContaining({ ok: true, orbits: [[0]], exact: true }));
    });

    it('reports a genuinely exact graph', () => {
        const result = buildInchiAtomOrbits('InChI=1S/CNO/c1-2-3', {
            elements: ['N', 'C', 'O'], bonds: [[0, 1], [0, 2]],
        });
        expect(result).toEqual(expect.objectContaining({ ok: true, exact: true, orbits: [[1], [0], [2]] }));
    });

    it('returns each exact failure reason', () => {
        const oneO = { elements: ['O'], bonds: [] as Array<[number, number]> };
        const cases: Array<[string | undefined, typeof oneO, object | undefined, string]> = [
            [undefined, oneO, undefined, 'no-inchi'],
            ['', oneO, undefined, 'no-inchi'],
            ['XLYOFNOQVPJJNP-UHFFFAOYSA-N', oneO, undefined, 'no-inchi'],
            ['InChI=1S/Na.Cl/c1-2', oneO, undefined, 'multi-component'],
            ['InChI=1S/CO2/c1;2', oneO, undefined, 'multi-component'],
            ['InChI=1S/CO2/c1?2', oneO, undefined, 'unsupported-inchi'],
            ['InChI=1S/p+1', { elements: ['H'], bonds: [] }, undefined, 'unsupported-inchi'],
            ['InChI=1S/CO2/c2-1-3', oneO, undefined, 'atom-count-mismatch'],
            ['InChI=1S/CO2/c2-1-3', { elements: ['C', 'N', 'O'], bonds: [[0, 1], [1, 2]] }, undefined, 'element-count-mismatch'],
            ['InChI=1S/CO2/c2-1-3', { elements: ['O', 'C', 'O'], bonds: [] }, undefined, 'bond-count-mismatch'],
            ['InChI=1S/CO2/c2-1-3', { elements: ['O', 'C', 'O'], bonds: [[0, 3], [0, 1]] }, undefined, 'bond-count-mismatch'],
            ['InChI=1S/C2NO/c1-2-3-4', { elements: ['C', 'N', 'C', 'O'], bonds: [[0, 1], [1, 2], [2, 3]] }, undefined, 'no-isomorphism'],
            [phosphateInchi, phosphateGraph, { maxSteps: 1 }, 'search-exhausted'],
            [phosphateInchi, phosphateGraph, { maxSolutions: 2 }, 'search-exhausted'],
            [phosphateInchi, phosphateGraph, { maxAtoms: 2 }, 'too-large'],
        ];
        for (const [inchi, graph, options, reason] of cases) {
            expect(buildInchiAtomOrbits(inchi, graph, options)).toEqual({ ok: false, reason });
        }
    });

    it('is deterministic', () => {
        expect(buildInchiAtomOrbits(phosphateInchi, phosphateGraph))
            .toEqual(buildInchiAtomOrbits(phosphateInchi, phosphateGraph));
    });
});
