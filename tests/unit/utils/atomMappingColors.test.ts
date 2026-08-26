import { describe, expect, it } from 'vitest';
import { parseAtomMappings, type AtomMappingPair } from '@/lib/utils/atomMapping';
import {
    blockAssignment,
    buildAtomMappingColorPlan,
    elementColorsForCompound,
    MAPPING_PALETTE,
} from '@/lib/utils/atomMappingColors';

const REAL_ENTRIES = [
    'cpd00001:O#1=cpd00009:(O#1;O#2;O#3;O#4)',
    'cpd00012:(O#1;O#2;O#3;O#4;O#5;O#6)=cpd00009:(O#1;O#2;O#3;O#4)',
    'cpd00012:(P#1;P#2)=cpd00009:P#1',
    'cpd00012:O#7=cpd00009:(O#1;O#2;O#3;O#4)',
];

function pairs(entries: readonly string[]): AtomMappingPair[] {
    return parseAtomMappings(entries);
}

describe('buildAtomMappingColorPlan', () => {
    it('colours merged components in the real rxn00002 payload', () => {
        const plan = buildAtomMappingColorPlan(pairs([
            'cpd00001:O#1=cpd00011:(O#1;O#2)',
            'cpd00742:(O#2;O#3)=cpd00011:(O#1;O#2)',
            'cpd00742:C#1=cpd00011:C#1',
            'cpd00742:C#2=cpd00011:C#1',
            'cpd00742:N#1=cpd00013:N#1',
            'cpd00742:N#2=cpd00013:N#1',
            'cpd00742:O#1=cpd00011:(O#1;O#2)',
        ]), {
            cpd00001: { O: 1, H: 2 },
            cpd00011: { C: 1, O: 2 },
            cpd00013: { N: 1, H: 4 },
            cpd00742: { C: 2, H: 3, N: 2, O: 3 },
        });
        expect(plan.legend).toHaveLength(3);
        expect(plan.legend.map((entry) => entry.element).sort()).toEqual(['C', 'N', 'O']);
        expect(plan.legend.find((entry) => entry.element === 'O')).toMatchObject({
            kind: 'merged', compoundIds: ['cpd00001', 'cpd00011', 'cpd00742'],
        });
        expect(plan.legend.filter((entry) => entry.element !== 'O').map((entry) => entry.kind))
            .toEqual(['one-to-one', 'one-to-one']);
        expect(plan.unmappable).toEqual([]);
        expect(new Set(plan.legend.map((entry) => entry.color)).size).toBe(3);
    });

    it('reports partial coverage when mapped indices do not cover the rendered structure', () => {
        const plan = buildAtomMappingColorPlan(pairs(['cpd00001:O#1=cpd00002:O#1']), {
            cpd00001: { O: 2 }, cpd00002: { O: 1 },
        });
        expect(blockAssignment(plan, 'cpd00001', 'O').reason).toBe('partial-coverage');
    });

    it('reports unknown structures when an inventory is absent', () => {
        const plan = buildAtomMappingColorPlan(pairs(['cpd00001:O#1=cpd00002:O#1']), {});
        expect(plan.blocks.map((block) => block.reason)).toEqual(['structure-unknown', 'structure-unknown']);
    });

    it('reports element mismatches from hand-built parsed pairs', () => {
        const plan = buildAtomMappingColorPlan([{
            left: { compoundId: 'cpd00001', element: 'O', index: 1 },
            right: { compoundId: 'cpd00002', element: 'P', index: 1 },
            leftAtoms: [{ compoundId: 'cpd00001', element: 'O', index: 1 }],
            rightAtoms: [{ compoundId: 'cpd00002', element: 'P', index: 1 }],
            hasSymmetryGroup: false,
            raw: 'hand-built',
        }], { cpd00001: { O: 1 }, cpd00002: { P: 1 } });
        expect(blockAssignment(plan, 'cpd00001', 'O').reason).toBe('element-mismatch');
        expect(blockAssignment(plan, 'cpd00002', 'P').reason).toBe('element-mismatch');
    });

    it('leaves a singleton component counterpart-unresolved', () => {
        const plan = buildAtomMappingColorPlan(pairs(['cpd00001:O#1=cpd00002:O#1']), {
            cpd00001: { O: 1 },
        });
        expect(blockAssignment(plan, 'cpd00001', 'O').reason).toBe('counterpart-unresolved');
    });

    it('terminates and colours a cyclic three-compound component', () => {
        const plan = buildAtomMappingColorPlan(pairs([
            'cpd00001:O#1=cpd00002:O#1',
            'cpd00002:O#1=cpd00003:O#1',
            'cpd00003:O#1=cpd00001:O#1',
        ]), { cpd00001: { O: 1 }, cpd00002: { O: 1 }, cpd00003: { O: 1 } });
        expect(plan.legend).toHaveLength(1);
        expect(plan.legend[0]).toMatchObject({
            kind: 'merged', compoundIds: ['cpd00001', 'cpd00002', 'cpd00003'],
        });
    });

    it('synthesises no-mapping assignments for absent blocks', () => {
        const plan = buildAtomMappingColorPlan([], {});
        expect(blockAssignment(plan, 'cpd00001', 'O')).toMatchObject({
            colorable: false, counterpartCompoundIds: [], mappedIndexCount: 0, reason: 'no-mapping',
        });
    });

    it('is deterministic and deduplicates repeated indices', () => {
        const input = pairs([
            'cpd00001:(O#1;O#1)=cpd00002:(O#1;O#1)',
        ]);
        const inventories = { cpd00001: { O: 1 }, cpd00002: { O: 1 } };
        expect(buildAtomMappingColorPlan(input, inventories)).toEqual(buildAtomMappingColorPlan(input, inventories));
        expect(blockAssignment(buildAtomMappingColorPlan(input, inventories), 'cpd00001', 'O').mappedIndexCount).toBe(1);
    });

    it('cycles the palette once the sorted groups outnumber it', () => {
        const count = MAPPING_PALETTE.length + 1;
        const entries = Array.from({ length: count }, (_, index) =>
            `cpd${String(index + 1).padStart(5, '0')}:O#1=cpd${String(index + 101).padStart(5, '0')}:O#1`,
        );
        const inventories = Object.fromEntries(Array.from({ length: count }, (_, index) => [
            `cpd${String(index + 1).padStart(5, '0')}`, { O: 1 },
        ]).concat(Array.from({ length: count }, (_, index) => [
            `cpd${String(index + 101).padStart(5, '0')}`, { O: 1 },
        ])));
        const plan = buildAtomMappingColorPlan(pairs(entries), inventories);
        expect(plan.legend).toHaveLength(count);
        expect(plan.legend.map((entry) => entry.color)).toEqual(
            Array.from({ length: count }, (_, index) => MAPPING_PALETTE[index % MAPPING_PALETTE.length]),
        );
        expect(new Set(plan.legend.map((entry) => entry.groupId)).size).toBe(count);
    });

    it('returns only colourable element colours and an empty object for unknown compounds', () => {
        const plan = buildAtomMappingColorPlan(pairs(REAL_ENTRIES), {
            cpd00001: { O: 1 }, cpd00012: { P: 2, O: 7 }, cpd00009: { P: 1, O: 4 },
        });
        expect(elementColorsForCompound(plan, 'cpd00012')).toEqual({
            O: MAPPING_PALETTE[0], P: MAPPING_PALETTE[1],
        });
        expect(elementColorsForCompound(plan, 'missing')).toEqual({});
    });

    it('returns empty plans without throwing for empty pairs and inventories', () => {
        expect(buildAtomMappingColorPlan([], {})).toEqual({
            blocks: [], legend: [], unmappable: [], colorableCount: 0, totalCount: 0,
        });
    });
});
