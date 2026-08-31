import { describe, expect, it } from 'vitest';
import { parseAtomMappings, type AtomMappingPair } from '@/lib/utils/atomMapping';
import { MAPPING_PALETTE, selectMappingColors } from '@/lib/utils/atomMappingColors';
import { buildAtomOrbitColorPlan } from '@/lib/utils/atomOrbitColors';

const pair = (left: string, right: string): AtomMappingPair => ({
    left: { compoundId: left, element: 'O', index: 1 }, right: { compoundId: right, element: 'O', index: 1 },
    leftAtoms: [{ compoundId: left, element: 'O', index: 1 }], rightAtoms: [{ compoundId: right, element: 'O', index: 1 }], hasSymmetryGroup: false, raw: '',
});

describe('buildAtomOrbitColorPlan', () => {
    it('constructs transitive groups in first-appearance order and cycles palette', () => {
        const plan = buildAtomOrbitColorPlan([pair('cpd00001', 'cpd00002'), pair('cpd00002', 'cpd00003'), pair('cpd00004', 'cpd00005')], []);
        expect(plan.groups.map((group) => group.groupId)).toEqual(['g1', 'g2']);
        expect(plan.groups.map((group) => group.color)).toEqual(selectMappingColors(2));
        const many = buildAtomOrbitColorPlan(Array.from({ length: MAPPING_PALETTE.length + 1 }, (_, i) => pair(`cpd${String(i + 100).padStart(5, '0')}`, `cpd${String(i + 200).padStart(5, '0')}`)), []);
        const selection = selectMappingColors(MAPPING_PALETTE.length + 1);
        expect(many.groups.map((group) => group.color)).toEqual(Array.from({ length: MAPPING_PALETTE.length + 1 }, (_, i) => selection[i % selection.length]));
    });

    it('colours exact water and refuses unmapped and missing structures', () => {
        const pairs = parseAtomMappings(['cpd00001:O#1=cpd00002:O#1']);
        const plan = buildAtomOrbitColorPlan(pairs, [
            { compoundId: 'cpd00001', inchi: 'InChI=1S/H2O/h1H2', graph: { elements: ['O'], bonds: [] } },
            { compoundId: 'cpd00067', inchi: 'InChI=1S/p+1', graph: { elements: ['H'], bonds: [] } },
            { compoundId: 'cpd00002' },
        ]);
        expect(plan.compounds.cpd00001).toMatchObject({ precision: 'exact-atom', coloredAtomCount: 1, atomColors: { 0: plan.groups[0].color }, bondColors: {} });
        expect(plan.compounds.cpd00067).toMatchObject({ precision: 'unresolved', reason: 'no-mapping' });
        expect(plan.compounds.cpd00002).toMatchObject({ precision: 'unresolved', reason: 'no-structure' });
    });

    it('uses InChI orbits, not local mapping positions, for cpd00009', () => {
        const pairs = parseAtomMappings([
            'cpd00001:O#1=cpd00009:(O#1;O#2;O#3;O#4)',
            'cpd00012:(O#1;O#2;O#3;O#4;O#5;O#6)=cpd00009:(O#1;O#2;O#3;O#4)',
            'cpd00012:(P#1;P#2)=cpd00009:P#1',
            'cpd00012:O#7=cpd00009:(O#1;O#2;O#3;O#4)',
        ]);
        const plan = buildAtomOrbitColorPlan(pairs, [{ compoundId: 'cpd00009', inchi: 'InChI=1S/H3O4P/c1-5(2,3)4', graph: { elements: ['O', 'P', 'O', 'O', 'O'], bonds: [[0, 1], [1, 2], [1, 3], [1, 4]] } }]);
        const result = plan.compounds.cpd00009;
        expect(result).toMatchObject({ precision: 'symmetry-orbit', coloredAtomCount: 5, bondColors: {} });
        expect([result.atomColors[0], result.atomColors[2], result.atomColors[3], result.atomColors[4]]).toEqual([plan.groups[0].color, plan.groups[0].color, plan.groups[0].color, plan.groups[0].color]);
        expect(result.atomColors[1]).toBe(plan.groups[1].color);
    });

    it('degrades only fully covered one-group elements and applies the bond rule', () => {
        const good = buildAtomOrbitColorPlan(parseAtomMappings(['cpd00001:(O#1;O#2)=cpd00002:(O#1;O#2)']), [{ compoundId: 'cpd00001', graph: { elements: ['O', 'O'], bonds: [[0, 1]] } }]);
        expect(good.compounds.cpd00001).toMatchObject({ precision: 'element-block', elementClaims: { O: 'g1' }, atomColors: { 0: selectMappingColors(1)[0], 1: selectMappingColors(1)[0] }, bondColors: { 0: selectMappingColors(1)[0] } });
        const merged = buildAtomOrbitColorPlan([pair('cpd00001', 'cpd00002'), { ...pair('cpd00001', 'cpd00003'), left: { compoundId: 'cpd00001', element: 'O', index: 2 }, leftAtoms: [{ compoundId: 'cpd00001', element: 'O', index: 2 }] }], [{ compoundId: 'cpd00001', graph: { elements: ['O', 'O'], bonds: [] } }]);
        expect(merged.compounds.cpd00001).toMatchObject({ precision: 'unresolved', reason: 'merged-groups' });
        const partial = buildAtomOrbitColorPlan(parseAtomMappings(['cpd00001:(O#1;O#2)=cpd00002:(O#1;O#2)']), [{ compoundId: 'cpd00001', graph: { elements: ['O', 'O', 'O', 'O'], bonds: [] } }]);
        expect(partial.compounds.cpd00001).toMatchObject({ precision: 'unresolved', reason: 'partial-coverage' });
    });

    it('requires contiguous element indices before claiming a degraded element block', () => {
        const invalid = buildAtomOrbitColorPlan(
            parseAtomMappings(['cpd00001:(O#1;O#3)=cpd00002:(O#1;O#2)']),
            [{ compoundId: 'cpd00001', graph: { elements: ['O', 'O'], bonds: [] } }],
        );
        expect(invalid.compounds.cpd00001).toMatchObject({
            precision: 'unresolved', reason: 'partial-coverage', coloredAtomCount: 0,
        });

        const valid = buildAtomOrbitColorPlan(
            parseAtomMappings(['cpd00001:(O#1;O#2)=cpd00002:(O#1;O#2)']),
            [{ compoundId: 'cpd00001', graph: { elements: ['O', 'O'], bonds: [] } }],
        );
        expect(valid.compounds.cpd00001).toMatchObject({
            precision: 'element-block', coloredAtomCount: 2,
            atomColors: { 0: selectMappingColors(1)[0], 1: selectMappingColors(1)[0] },
        });
    });

    it('drops invalid references, tolerates invalid inputs, and is deterministic', () => {
        const malformed = [{ ...pair('cpd00001', 'cpd00002'), leftAtoms: [{ compoundId: 'cpd00001', element: 'O', index: 99 }, { compoundId: 'cpd00001', element: 'O', index: 0 }, { compoundId: 'cpd00001', element: 'X', index: Number.NaN }], rightAtoms: [{ compoundId: 'cpd00002', element: 'O', index: 1 }] }];
        const input = [{ compoundId: 'cpd00001', inchi: 'InChI=1S/O4/c1-2-3-4', graph: { elements: ['O', 'O', 'O', 'O'], bonds: [[0, 1], [1, 2], [2, 3]] as Array<[number, number]> } }];
        const plan = buildAtomOrbitColorPlan(malformed, input);
        expect(plan.compounds.cpd00001).toMatchObject({ droppedRefCount: 1, coloredAtomCount: 0 });
        expect(buildAtomOrbitColorPlan(undefined as never, undefined as never)).toEqual({ groups: [], compounds: {}, precisionSummary: { 'exact-atom': 0, 'symmetry-orbit': 0, 'element-block': 0, unresolved: 0 } });
        expect(buildAtomOrbitColorPlan(malformed, input)).toEqual(plan);
    });
});
