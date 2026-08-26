import { describe, expect, it } from 'vitest';
import {
    countAtomsPerElement,
    formatAtomGroup,
    groupAtomMappingsByCompound,
    normalizeAtomMapping,
    parseAtomMappingEntry,
    parseAtomMappings,
    summarizeAtomFlows,
} from '@/lib/utils/atomMapping';

// Five real upstream lines (rxn00001), the last two sharing cpd00009:O#3.
const UPSTREAM_LINES = [
    'rxn00001 cpd00001:O#1=cpd00009:O#2',
    'rxn00001 cpd00012:O#1=cpd00009:O#1',
    'rxn00001 cpd00012:O#2=cpd00009:O#2',
    'rxn00001 cpd00012:O#3=cpd00009:O#3',
    'rxn00001 cpd00012:O#4=cpd00009:O#3',
    'rxn00001 cpd00012:O#5=cpd00009:O#1',
    'rxn00001 cpd00012:O#6=cpd00009:O#4',
    'rxn00001 cpd00012:O#7=cpd00009:O#4',
    'rxn00001 cpd00012:P#1=cpd00009:P#1',
    'rxn00001 cpd00012:P#2=cpd00009:P#1',
];

const SAM_ENTRIES = [
    'cpd00001:O#1=cpd00009:(O#1;O#2;O#3;O#4)',
    'cpd00012:(O#1;O#2;O#3;O#4;O#5;O#6)=cpd00009:(O#1;O#2;O#3;O#4)',
    'cpd00012:(P#1;P#2)=cpd00009:P#1',
    'cpd00012:O#7=cpd00009:(O#1;O#2;O#3;O#4)',
];

describe('parseAtomMappingEntry', () => {
    it('parses each real upstream line with its leading reaction-id token', () => {
        const parsed = UPSTREAM_LINES.map(parseAtomMappingEntry);
        expect(parsed.every((p) => p !== null)).toBe(true);

        expect(parsed[0]).toMatchObject({
            left: { compoundId: 'cpd00001', element: 'O', index: 1 },
            right: { compoundId: 'cpd00009', element: 'O', index: 2 },
            raw: 'cpd00001:O#1=cpd00009:O#2',
        });
    });

    it('parses the same lines without the leading reaction-id token', () => {
        const stripped = UPSTREAM_LINES.map((line) =>
            line.replace(/^rxn\d+\s+/, ''),
        );
        const parsed = stripped.map(parseAtomMappingEntry);
        expect(parsed.every((p) => p !== null)).toBe(true);
        expect(parsed[4]).toMatchObject({
            left: { compoundId: 'cpd00012', element: 'O', index: 4 },
            right: { compoundId: 'cpd00009', element: 'O', index: 3 },
            raw: 'cpd00012:O#4=cpd00009:O#3',
        });
    });

    it('parses a two-character element symbol (Mg)', () => {
        const pair = parseAtomMappingEntry('cpd00254:Mg#1=cpd00099:Mg#1');
        expect(pair).toMatchObject({
            left: { compoundId: 'cpd00254', element: 'Mg', index: 1 },
            right: { compoundId: 'cpd00099', element: 'Mg', index: 1 },
            raw: 'cpd00254:Mg#1=cpd00099:Mg#1',
        });
    });

    it('parses a self-pair where both sides share a compoundId', () => {
        const pair = parseAtomMappingEntry('cpd00001:O#1=cpd00001:O#2');
        expect(pair?.left.compoundId).toBe('cpd00001');
        expect(pair?.right.compoundId).toBe('cpd00001');
    });

    it('parses symmetry groups and uses their first members as representatives', () => {
        const pair = parseAtomMappingEntry(
            'cpd00001:(O#1; H#2;O#3)=cpd00009:(O#4;O#5)',
        );

        expect(pair?.left).toEqual({ compoundId: 'cpd00001', element: 'O', index: 1 });
        expect(pair?.right).toEqual({ compoundId: 'cpd00009', element: 'O', index: 4 });
        expect(pair?.leftAtoms).toEqual([
            { compoundId: 'cpd00001', element: 'O', index: 1 },
            { compoundId: 'cpd00001', element: 'H', index: 2 },
            { compoundId: 'cpd00001', element: 'O', index: 3 },
        ]);
        expect(pair?.rightAtoms).toEqual([
            { compoundId: 'cpd00009', element: 'O', index: 4 },
            { compoundId: 'cpd00009', element: 'O', index: 5 },
        ]);
        expect(pair?.hasSymmetryGroup).toBe(true);
    });

    it('parses group members with their own element symbols', () => {
        const pair = parseAtomMappingEntry('cpd00012:(O#1;P#2)=cpd00009:O#1');
        expect(pair?.leftAtoms).toEqual([
            { compoundId: 'cpd00012', element: 'O', index: 1 },
            { compoundId: 'cpd00012', element: 'P', index: 2 },
        ]);
    });

    it('keeps legacy singleton mappings compatible with group consumers', () => {
        const pair = parseAtomMappingEntry('cpd00001:O#1=cpd00009:O#2');
        expect(pair?.left).toEqual({ compoundId: 'cpd00001', element: 'O', index: 1 });
        expect(pair?.right).toEqual({ compoundId: 'cpd00009', element: 'O', index: 2 });
        expect(pair?.leftAtoms).toHaveLength(1);
        expect(pair?.rightAtoms).toHaveLength(1);
        expect(pair?.hasSymmetryGroup).toBe(false);
    });

    it('rejects malformed symmetry groups', () => {
        for (const entry of [
            'cpd00001:()=cpd00009:O#1',
            'cpd00001:(O#1;)=cpd00009:O#1',
            'cpd00001:(;O#1)=cpd00009:O#1',
            'cpd00001:(O#1=cpd00009:O#1',
            'cpd00001:O#1)=cpd00009:O#1',
            'cpd00001:(Oxx#1)=cpd00009:O#1',
            'cpd00001:(O#0)=cpd00009:O#1',
        ]) {
            expect(parseAtomMappingEntry(entry)).toBeNull();
        }
    });

    it('returns null instead of throwing for malformed or missing input', () => {
        expect(parseAtomMappingEntry('')).toBeNull();
        expect(parseAtomMappingEntry('   ')).toBeNull();
        expect(parseAtomMappingEntry('garbage')).toBeNull();
        expect(parseAtomMappingEntry('cpd00001:O#1')).toBeNull(); // no '='
        expect(parseAtomMappingEntry('a=b=c')).toBeNull(); // too many '='
        expect(parseAtomMappingEntry('cpd00001:O#0=cpd00009:O#1')).toBeNull(); // zero index
        expect(parseAtomMappingEntry('cpd00001:Oxx#1=cpd00009:O#1')).toBeNull(); // bad element
        // @ts-expect-error - exercising the non-string runtime guard
        expect(parseAtomMappingEntry(42)).toBeNull();
        // @ts-expect-error - exercising the non-string runtime guard
        expect(parseAtomMappingEntry(null)).toBeNull();
    });
});

describe('parseAtomMappings', () => {
    it('returns [] for undefined, null, and empty input', () => {
        expect(parseAtomMappings(undefined)).toEqual([]);
        expect(parseAtomMappings(null)).toEqual([]);
        expect(parseAtomMappings([])).toEqual([]);
    });

    it('drops unparsable entries (including non-string array members) while preserving order', () => {
        const entries = [
            'rxn00001 cpd00001:O#1=cpd00009:O#2',
            'garbage',
            42,
            null,
            'rxn00001 cpd00012:O#1=cpd00009:O#1',
        ] as unknown as string[];

        const pairs = parseAtomMappings(entries);
        expect(pairs).toHaveLength(2);
        expect(pairs[0].raw).toBe('cpd00001:O#1=cpd00009:O#2');
        expect(pairs[1].raw).toBe('cpd00012:O#1=cpd00009:O#1');
    });

    it('parses all real upstream lines in order', () => {
        const pairs = parseAtomMappings(UPSTREAM_LINES);
        expect(pairs).toHaveLength(10);
        expect(pairs.map((p) => p.raw)).toEqual(
            UPSTREAM_LINES.map((l) => l.replace(/^rxn\d+\s+/, '')),
        );
    });

    it('parses all real Sam entries without dropping any', () => {
        const pairs = parseAtomMappings(SAM_ENTRIES);
        expect(pairs).toHaveLength(4);
        expect(pairs.map((pair) => pair.raw)).toEqual(SAM_ENTRIES);
    });

    it('parses reaction-prefixed Sam entries identically', () => {
        const pairs = parseAtomMappings(SAM_ENTRIES);
        const prefixedPairs = parseAtomMappings(SAM_ENTRIES.map((entry) => `rxn00001 ${entry}`));
        expect(prefixedPairs).toEqual(pairs);
    });
});

describe('groupAtomMappingsByCompound', () => {
    it('groups a cross-compound pair under both compound ids', () => {
        const pairs = parseAtomMappings(UPSTREAM_LINES);
        const groups = groupAtomMappingsByCompound(pairs);

        expect(groups.get('cpd00001')).toHaveLength(1);
        expect(groups.get('cpd00009')).toHaveLength(10);
        expect(groups.get('cpd00012')).toHaveLength(9);
    });

    it('adds a self-pair to its shared compound bucket exactly once', () => {
        const pairs = parseAtomMappings(['cpd00001:O#1=cpd00001:O#2']);
        const groups = groupAtomMappingsByCompound(pairs);

        expect(groups.get('cpd00001')).toHaveLength(1);
    });

    it('follows first-appearance insertion order for keys', () => {
        const pairs = parseAtomMappings(UPSTREAM_LINES);
        const groups = groupAtomMappingsByCompound(pairs);

        expect(Array.from(groups.keys())).toEqual([
            'cpd00001',
            'cpd00009',
            'cpd00012',
        ]);
    });
});

describe('summarizeAtomFlows', () => {
    it('summarizes the real rxn00001 mappings by directed compound pair', () => {
        const flows = summarizeAtomFlows(parseAtomMappings(UPSTREAM_LINES));

        expect(flows).toHaveLength(2);
        expect(flows[0]).toMatchObject({ from: 'cpd00001', to: 'cpd00009', total: 1 });
        expect(Array.from(flows[0].byElement)).toEqual([['O', 1]]);
        expect(flows[1]).toMatchObject({ from: 'cpd00012', to: 'cpd00009', total: 9 });
        expect(Array.from(flows[1].byElement)).toEqual([['O', 7], ['P', 2]]);
    });

    it('returns an empty array for empty input', () => {
        expect(summarizeAtomFlows([])).toEqual([]);
    });

    it('keeps self-pairs and counts a repeated source atom once', () => {
        const flows = summarizeAtomFlows(parseAtomMappings([
            'cpd00001:O#1=cpd00001:O#2',
            'cpd00001:O#1=cpd00001:O#3',
        ]));

        expect(flows[0]).toMatchObject({ from: 'cpd00001', to: 'cpd00001', total: 1 });
    });

    it('preserves first appearance order for flow groups', () => {
        const flows = summarizeAtomFlows(parseAtomMappings([
            'cpd00002:O#1=cpd00003:O#1',
            'cpd00001:O#1=cpd00003:O#2',
            'cpd00002:P#1=cpd00003:P#1',
        ]));

        expect(flows.map(({ from, to }) => `${from}>${to}`)).toEqual([
            'cpd00002>cpd00003',
            'cpd00001>cpd00003',
        ]);
    });

    it('counts each symmetry group as one mapping event', () => {
        const flows = summarizeAtomFlows(parseAtomMappings(SAM_ENTRIES));
        expect(flows).toHaveLength(2);
        expect(flows[0]).toMatchObject({ from: 'cpd00001', to: 'cpd00009', total: 1 });
        expect(flows[1]).toMatchObject({ from: 'cpd00012', to: 'cpd00009', total: 3 });
    });
});

describe('countAtomsPerElement', () => {
    it('counts distinct atom indices per element per compound', () => {
        const pairs = parseAtomMappings(UPSTREAM_LINES);
        const counts = countAtomsPerElement(pairs);

        // cpd00009:O appears at indices 2, 1, 2, 3, 3, 1, 4, 4 -> 4 distinct.
        expect(counts.get('cpd00009')?.get('O')).toBe(4);
        // cpd00012:O appears at indices 1 through 7 -> 7 distinct.
        expect(counts.get('cpd00012')?.get('O')).toBe(7);
        expect(counts.get('cpd00012')?.get('P')).toBe(2);
        // cpd00001:O appears once.
        expect(counts.get('cpd00001')?.get('O')).toBe(1);
    });

    it('does not double-count a repeated index seen across multiple pairs', () => {
        const pairs = parseAtomMappings([
            'cpd00012:O#3=cpd00009:O#3',
            'cpd00012:O#4=cpd00009:O#3',
        ]);
        const counts = countAtomsPerElement(pairs);
        expect(counts.get('cpd00009')?.get('O')).toBe(1);
    });

    it('counts the union of all symmetry-group members', () => {
        const counts = countAtomsPerElement(parseAtomMappings(SAM_ENTRIES));

        expect(counts.get('cpd00009')?.get('O')).toBe(4);
        expect(counts.get('cpd00009')?.get('P')).toBe(1);
        expect(counts.get('cpd00012')?.get('O')).toBe(7);
        expect(counts.get('cpd00012')?.get('P')).toBe(2);
        expect(counts.get('cpd00001')?.get('O')).toBe(1);
    });

    it('returns an empty map for an empty pair list', () => {
        expect(countAtomsPerElement([]).size).toBe(0);
    });
});

describe('formatAtomGroup', () => {
    it('formats singleton atoms and symmetry groups', () => {
        const pair = parseAtomMappingEntry('cpd00001:(O#1;O#2;O#3)=cpd00009:O#4');
        expect(formatAtomGroup(pair!.leftAtoms)).toBe('O#1, O#2, O#3');
        expect(formatAtomGroup(pair!.rightAtoms)).toBe('O#4');
    });
});

describe('normalizeAtomMapping', () => {
    it('prefers usable live Solr mappings and normalizes their metadata', () => {
        expect(normalizeAtomMapping({
            atom_mapping_data: [' cpd00001:O#1=cpd00009:O#2 ', '', 42],
            atom_mapping: ['cpd00012:O#1=cpd00009:O#1'],
            atom_mapping_confidence: ' high ',
            atom_mapping_has_symmetry_groups: 'TRUE',
        })).toEqual({
            entries: ['cpd00001:O#1=cpd00009:O#2'],
            confidence: 'high',
            hasSymmetryGroups: true,
            source: 'atom_mapping_data',
        });
    });

    it('falls back to legacy mappings and accepts single-valued Solr fields', () => {
        expect(normalizeAtomMapping({
            atom_mapping_data: [null, '  '],
            atom_mapping: ' cpd00001:O#1=cpd00009:O#2 ',
            atom_mapping_has_symmetry_groups: 'false',
        })).toEqual({
            entries: ['cpd00001:O#1=cpd00009:O#2'],
            confidence: undefined,
            hasSymmetryGroups: false,
            source: 'atom_mapping',
        });
    });

    it('derives symmetry groups when Solr does not provide a usable flag', () => {
        expect(normalizeAtomMapping({
            atom_mapping_data: 'cpd00001:(O#1;O#2)=cpd00009:O#1',
            atom_mapping_has_symmetry_groups: 'unknown',
        })).toMatchObject({ hasSymmetryGroups: true, source: 'atom_mapping_data' });
    });

    it('returns an empty, safe normalization for malformed documents', () => {
        expect(normalizeAtomMapping(null)).toEqual({
            entries: [],
            confidence: undefined,
            hasSymmetryGroups: false,
            source: 'none',
        });
        expect(normalizeAtomMapping(42 as unknown as null)).toEqual({
            entries: [],
            confidence: undefined,
            hasSymmetryGroups: false,
            source: 'none',
        });
    });
});
