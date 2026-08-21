import type { AtomMappingPair, AtomRef } from './atomMapping';
import { MAPPING_PALETTE } from './atomMappingColors';
import {
    buildInchiAtomOrbits,
    canonicalIndexForElementRef,
    type HeavyAtomGraph,
} from './inchiAtomOrder';

export type MappingPrecision = 'exact-atom' | 'symmetry-orbit' | 'element-block' | 'unresolved';

export interface CompoundStructureInput {
    readonly compoundId: string;
    readonly inchi?: string;
    readonly graph?: HeavyAtomGraph;
}

export interface OrbitMappingGroup {
    readonly groupId: string;
    readonly color: string;
    readonly elements: readonly string[];
    readonly compoundIds: readonly string[];
    readonly refCount: number;
    readonly hasSymmetryGroup: boolean;
}

export interface CompoundColorResult {
    readonly compoundId: string;
    readonly precision: MappingPrecision;
    readonly reason?: string;
    readonly atomColors: Readonly<Record<number, string>>;
    readonly bondColors: Readonly<Record<number, string>>;
    readonly atomGroups: Readonly<Record<number, string>>;
    readonly elementClaims: Readonly<Record<string, string>>;
    readonly coloredAtomCount: number;
    readonly totalAtomCount: number;
    readonly droppedRefCount: number;
}

export interface AtomOrbitColorPlan {
    readonly groups: readonly OrbitMappingGroup[];
    readonly compounds: Readonly<Record<string, CompoundColorResult>>;
    readonly precisionSummary: Readonly<Record<MappingPrecision, number>>;
}

interface InternalGroup extends OrbitMappingGroup {
    readonly refs: readonly AtomRef[];
}

const EMPTY_RESULT: CompoundColorResult = {
    compoundId: '', precision: 'unresolved', reason: 'no-mapping', atomColors: {}, bondColors: {}, atomGroups: {},
    elementClaims: {}, coloredAtomCount: 0, totalAtomCount: 0, droppedRefCount: 0,
};

function validRef(value: unknown): value is AtomRef {
    if (!value || typeof value !== 'object') return false;
    const ref = value as AtomRef;
    return typeof ref.compoundId === 'string' && ref.compoundId.length > 0
        && typeof ref.element === 'string' && ref.element.length > 0
        && Number.isSafeInteger(ref.index) && ref.index > 0;
}

function refKey(ref: AtomRef): string {
    return `${ref.compoundId}|${ref.element}|${ref.index}`;
}

function validGraph(value: unknown): value is HeavyAtomGraph {
    if (!value || typeof value !== 'object') return false;
    const graph = value as HeavyAtomGraph;
    return Array.isArray(graph.elements) && graph.elements.every((element) => typeof element === 'string')
        && Array.isArray(graph.bonds);
}

function mappingGroups(pairs: unknown): InternalGroup[] {
    const parent = new Map<string, string>();
    const firstSeen = new Map<string, number>();
    const refs = new Map<string, AtomRef>();
    const symmetry = new Set<string>();
    let sequence = 0;
    const find = (key: string): string => {
        const current = parent.get(key);
        if (!current || current === key) return key;
        const root = find(current);
        parent.set(key, root);
        return root;
    };
    const join = (left: string, right: string): void => {
        const leftRoot = find(left);
        const rightRoot = find(right);
        if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
    };

    for (const candidate of Array.isArray(pairs) ? pairs : []) {
        const pair = candidate as Partial<AtomMappingPair> | null;
        const pairRefs = [
            ...(Array.isArray(pair?.leftAtoms) ? pair.leftAtoms : []),
            ...(Array.isArray(pair?.rightAtoms) ? pair.rightAtoms : []),
        ].filter(validRef);
        const keys: string[] = [];
        for (const ref of pairRefs) {
            const key = refKey(ref);
            if (!parent.has(key)) {
                parent.set(key, key);
                firstSeen.set(key, sequence++);
                refs.set(key, { compoundId: ref.compoundId, element: ref.element, index: ref.index });
            }
            keys.push(key);
        }
        for (let index = 1; index < keys.length; index += 1) join(keys[0], keys[index]);
        if (pair?.hasSymmetryGroup === true) for (const key of keys) symmetry.add(key);
    }

    const members = new Map<string, string[]>();
    for (const key of parent.keys()) {
        const root = find(key);
        const bucket = members.get(root) ?? [];
        bucket.push(key);
        members.set(root, bucket);
    }
    return Array.from(members.values())
        .sort((left, right) => Math.min(...left.map((key) => firstSeen.get(key)!)) - Math.min(...right.map((key) => firstSeen.get(key)!)))
        .map((keys, index) => {
            const groupRefs = keys.sort((left, right) => firstSeen.get(left)! - firstSeen.get(right)!).map((key) => refs.get(key)!);
            return {
                groupId: `g${index + 1}`,
                color: MAPPING_PALETTE[index % MAPPING_PALETTE.length] ?? '',
                elements: Array.from(new Set(groupRefs.map((ref) => ref.element))).sort(),
                compoundIds: Array.from(new Set(groupRefs.map((ref) => ref.compoundId))).sort(),
                refCount: groupRefs.length,
                hasSymmetryGroup: keys.some((key) => symmetry.has(key)),
                refs: groupRefs,
            };
        });
}

function baseResult(compoundId: string, graph: HeavyAtomGraph | undefined, precision: MappingPrecision, reason?: string): CompoundColorResult {
    return {
        compoundId, precision, ...(reason ? { reason } : {}), atomColors: {}, bondColors: {}, atomGroups: {}, elementClaims: {},
        coloredAtomCount: 0, totalAtomCount: graph?.elements.length ?? 0, droppedRefCount: 0,
    };
}

function colorBonds(graph: HeavyAtomGraph, atomGroups: Record<number, string>, groups: Map<string, InternalGroup>): Record<number, string> {
    const bondColors: Record<number, string> = {};
    for (const [index, bond] of graph.bonds.entries()) {
        if (!Array.isArray(bond) || bond.length !== 2) continue;
        const [left, right] = bond;
        if (!Number.isInteger(left) || !Number.isInteger(right)) continue;
        const groupId = atomGroups[left];
        if (groupId && groupId === atomGroups[right]) bondColors[index] = groups.get(groupId)?.color ?? '';
    }
    return bondColors;
}

function resolveWithOrbits(compoundId: string, graph: HeavyAtomGraph, groups: InternalGroup[], result: Extract<ReturnType<typeof buildInchiAtomOrbits>, { ok: true }>): CompoundColorResult {
    const groupById = new Map(groups.map((group) => [group.groupId, group]));
    const canonicalSets = new Map<string, Set<number>>();
    let droppedRefCount = 0;
    for (const group of groups) {
        const indices = new Set<number>();
        for (const ref of group.refs.filter((item) => item.compoundId === compoundId)) {
            const canonical = canonicalIndexForElementRef(result.canonicalElements, ref.element, ref.index);
            if (canonical === undefined) droppedRefCount += 1;
            else indices.add(canonical);
        }
        canonicalSets.set(group.groupId, indices);
    }
    const candidates = graph.elements.map(() => new Set<number>());
    result.orbits.forEach((orbit, canonical) => orbit.forEach((local) => candidates[local]?.add(canonical + 1)));
    const atomGroups: Record<number, string> = {};
    const atomColors: Record<number, string> = {};
    candidates.forEach((candidateSet, atom) => {
        if (candidateSet.size === 0) return;
        const matches = groups.filter((group) => candidateSet.size > 0
            && Array.from(candidateSet).every((canonical) => canonicalSets.get(group.groupId)?.has(canonical)));
        if (matches.length === 1) {
            atomGroups[atom] = matches[0].groupId;
            atomColors[atom] = matches[0].color;
        }
    });
    return {
        compoundId, precision: result.exact ? 'exact-atom' : 'symmetry-orbit', atomColors,
        bondColors: colorBonds(graph, atomGroups, groupById), atomGroups, elementClaims: {},
        coloredAtomCount: Object.keys(atomColors).length, totalAtomCount: graph.elements.length, droppedRefCount,
    };
}

function degrade(compoundId: string, graph: HeavyAtomGraph, groups: InternalGroup[], carriedReason: string): CompoundColorResult {
    const groupById = new Map(groups.map((group) => [group.groupId, group]));
    const atomGroups: Record<number, string> = {};
    const atomColors: Record<number, string> = {};
    const elementClaims: Record<string, string> = {};
    let denialReason: string | undefined;
    for (const element of Array.from(new Set(graph.elements))) {
        const matching = groups.flatMap((group) => group.refs.filter((ref) => ref.compoundId === compoundId && ref.element === element)
            .map((ref) => ({ ref, group })));
        if (matching.length === 0) continue;
        const groupIds = new Set(matching.map(({ group }) => group.groupId));
        if (groupIds.size !== 1) {
            denialReason ??= 'merged-groups';
            continue;
        }
        const indices = new Set(matching.map(({ ref }) => ref.index));
        const count = graph.elements.filter((item) => item === element).length;
        if (indices.size !== count) {
            denialReason ??= 'partial-coverage';
            continue;
        }
        const groupId = matching[0].group.groupId;
        elementClaims[element] = groupId;
        graph.elements.forEach((item, index) => {
            if (item === element) {
                atomGroups[index] = groupId;
                atomColors[index] = matching[0].group.color;
            }
        });
    }
    const claimed = Object.keys(elementClaims).length > 0;
    return {
        compoundId, precision: claimed ? 'element-block' : 'unresolved', ...(!claimed ? { reason: denialReason ?? carriedReason } : {}),
        atomColors, bondColors: colorBonds(graph, atomGroups, groupById), atomGroups, elementClaims,
        coloredAtomCount: Object.keys(atomColors).length, totalAtomCount: graph.elements.length, droppedRefCount: 0,
    };
}

export function buildAtomOrbitColorPlan(pairs: readonly AtomMappingPair[], structures: readonly CompoundStructureInput[]): AtomOrbitColorPlan {
    try {
        const groups = mappingGroups(pairs);
        const compounds: Record<string, CompoundColorResult> = {};
        const groupRefs = new Set(groups.flatMap((group) => group.refs.map((ref) => ref.compoundId)));
        for (const structure of Array.isArray(structures) ? structures : []) {
            if (!structure || typeof structure.compoundId !== 'string') continue;
            const { compoundId } = structure;
            const graph = validGraph(structure.graph) ? structure.graph : undefined;
            if (!groupRefs.has(compoundId)) compounds[compoundId] = baseResult(compoundId, graph, 'unresolved', 'no-mapping');
            else if (!graph) compounds[compoundId] = baseResult(compoundId, undefined, 'unresolved', 'no-structure');
            else if (typeof structure.inchi !== 'string') compounds[compoundId] = degrade(compoundId, graph, groups, 'no-inchi');
            else {
                const orbit = buildInchiAtomOrbits(structure.inchi, graph);
                compounds[compoundId] = orbit.ok
                    ? resolveWithOrbits(compoundId, graph, groups, orbit)
                    : degrade(compoundId, graph, groups, orbit.reason);
            }
        }
        const precisionSummary: Record<MappingPrecision, number> = {
            'exact-atom': 0, 'symmetry-orbit': 0, 'element-block': 0, unresolved: 0,
        };
        Object.values(compounds).forEach((result) => { precisionSummary[result.precision] += 1; });
        return { groups: groups.map(({ refs, ...group }) => { void refs; return group; }), compounds, precisionSummary };
    } catch {
        return { groups: [], compounds: {}, precisionSummary: { 'exact-atom': 0, 'symmetry-orbit': 0, 'element-block': 0, unresolved: 0 } };
    }
}

export function compoundColorResult(plan: AtomOrbitColorPlan, compoundId: string): CompoundColorResult {
    return plan?.compounds?.[compoundId] ?? EMPTY_RESULT;
}
