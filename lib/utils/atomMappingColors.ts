import type { AtomMappingPair, AtomRef } from './atomMapping';

/**
 * Build whole-element colour assignments for parsed reaction atom mappings.
 *
 * `lib/utils/atomMapping.ts:15-21` documents that mapping `#N` values are
 * 1-based per-element, per-compound indices in InChI canonical atom order,
 * not SMILES or RDKit atom indices. RDKit MinimalLib cannot recover that
 * order, so this module never emits or accepts atom-index-to-colour mappings:
 * an entire (compound, element) block is coloured only after full coverage
 * and mutuality make that scientifically safe.
 */

export type ElementInventory = Readonly<Record<string, number>>;

export type UnmappableReason =
    | 'no-mapping'
    | 'element-mismatch'
    | 'multiple-destinations'
    | 'structure-unknown'
    | 'partial-coverage'
    | 'counterpart-unresolved';

export interface ElementBlockAssignment {
    readonly compoundId: string;
    readonly element: string;
    readonly colorable: boolean;
    readonly color?: string;
    readonly groupId?: string;
    readonly counterpartCompoundIds: readonly string[];
    readonly mappedIndexCount: number;
    readonly structureAtomCount?: number;
    readonly reason?: UnmappableReason;
}

export interface AtomMappingColorLegendEntry {
    readonly groupId: string;
    readonly color: string;
    readonly element: string;
    readonly compoundIds: readonly string[];
}

export interface AtomMappingColorPlan {
    readonly blocks: readonly ElementBlockAssignment[];
    readonly legend: readonly AtomMappingColorLegendEntry[];
    readonly unmappable: readonly ElementBlockAssignment[];
    readonly colorableCount: number;
    readonly totalCount: number;
}

export const MAPPING_PALETTE: readonly string[] = [
    '#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#8C564B',
    '#7F3FBF', '#BC3C29', '#20854E', '#6F99AD', '#EE4C97',
];

interface AccumulatedBlock {
    readonly compoundId: string;
    readonly element: string;
    readonly indices: Set<number>;
    readonly counterparts: Set<string>;
    readonly counterpartElements: Set<string>;
}

interface BlockState {
    readonly block: AccumulatedBlock;
    readonly counterpartCompoundIds: readonly string[];
    readonly structureAtomCount?: number;
    readonly basicReason?: UnmappableReason;
}

function blockKey(compoundId: string, element: string): string {
    return `${compoundId}|${element}`;
}

function isAtomRef(value: unknown): value is AtomRef {
    if (!value || typeof value !== 'object') return false;
    const ref = value as AtomRef;
    return typeof ref.compoundId === 'string'
        && typeof ref.element === 'string'
        && typeof ref.index === 'number'
        && Number.isFinite(ref.index);
}

function readInventory(
    inventories: Readonly<Record<string, ElementInventory>> | null | undefined,
    compoundId: string,
    element: string,
): number | undefined {
    const inventory = inventories?.[compoundId];
    const count = inventory?.[element];
    return typeof count === 'number' && Number.isFinite(count) ? count : undefined;
}

function accumulateBlock(
    blocks: Map<string, AccumulatedBlock>,
    ref: AtomRef,
    counterparts: readonly AtomRef[],
): void {
    const key = blockKey(ref.compoundId, ref.element);
    let block = blocks.get(key);
    if (!block) {
        block = {
            compoundId: ref.compoundId,
            element: ref.element,
            indices: new Set<number>(),
            counterparts: new Set<string>(),
            counterpartElements: new Set<string>(),
        };
        blocks.set(key, block);
    }

    block.indices.add(ref.index);
    for (const counterpart of counterparts) {
        if (!isAtomRef(counterpart)) continue;
        block.counterparts.add(counterpart.compoundId);
        block.counterpartElements.add(counterpart.element);
    }
}

function stateFor(
    block: AccumulatedBlock,
    inventories: Readonly<Record<string, ElementInventory>> | null | undefined,
): BlockState {
    const counterpartCompoundIds = Array.from(block.counterparts).sort();
    const structureAtomCount = readInventory(inventories, block.compoundId, block.element);
    let basicReason: UnmappableReason | undefined;

    if (Array.from(block.counterpartElements).some((element) => element !== block.element)) {
        basicReason = 'element-mismatch';
    } else if (counterpartCompoundIds.length !== 1) {
        basicReason = 'multiple-destinations';
    } else if (structureAtomCount === undefined) {
        basicReason = 'structure-unknown';
    } else if (block.indices.size !== structureAtomCount) {
        basicReason = 'partial-coverage';
    }

    return { block, counterpartCompoundIds, structureAtomCount, basicReason };
}

/** Build deterministic, whole-element mapping colour assignments without atom-index rendering data. */
export function buildAtomMappingColorPlan(
    pairs: readonly AtomMappingPair[],
    inventories: Readonly<Record<string, ElementInventory>>,
): AtomMappingColorPlan {
    const blocks = new Map<string, AccumulatedBlock>();
    for (const pair of Array.isArray(pairs) ? pairs : []) {
        const leftAtoms = Array.isArray(pair?.leftAtoms) ? pair.leftAtoms : [];
        const rightAtoms = Array.isArray(pair?.rightAtoms) ? pair.rightAtoms : [];
        for (const ref of leftAtoms) {
            if (isAtomRef(ref)) accumulateBlock(blocks, ref, rightAtoms);
        }
        for (const ref of rightAtoms) {
            if (isAtomRef(ref)) accumulateBlock(blocks, ref, leftAtoms);
        }
    }

    const states = new Map<string, BlockState>();
    for (const [key, block] of blocks) states.set(key, stateFor(block, inventories));

    const colorableGroups = new Map<string, { element: string; compoundIds: readonly string[] }>();
    for (const [key, state] of states) {
        if (state.basicReason || state.counterpartCompoundIds.length !== 1) continue;
        const counterpartCompoundId = state.counterpartCompoundIds[0];
        const counterpartKey = blockKey(counterpartCompoundId, state.block.element);
        const counterpart = states.get(counterpartKey);
        if (!counterpart || counterpart.basicReason || counterpart.counterpartCompoundIds.length !== 1
            || counterpart.counterpartCompoundIds[0] !== state.block.compoundId) continue;

        const groupId = [key, counterpartKey].sort().join('=');
        colorableGroups.set(groupId, {
            element: state.block.element,
            compoundIds: [state.block.compoundId, counterpartCompoundId].sort(),
        });
    }

    const groupColors = new Map<string, string>();
    const legend = Array.from(colorableGroups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([groupId, group], index) => {
            const color = MAPPING_PALETTE[index % MAPPING_PALETTE.length];
            groupColors.set(groupId, color);
            return { groupId, color, element: group.element, compoundIds: group.compoundIds };
        });

    const assignments = Array.from(states.entries())
        .sort(([, left], [, right]) => left.block.compoundId.localeCompare(right.block.compoundId)
            || left.block.element.localeCompare(right.block.element))
        .map(([key, state]): ElementBlockAssignment => {
            const counterpartKey = state.counterpartCompoundIds.length === 1
                ? blockKey(state.counterpartCompoundIds[0], state.block.element)
                : undefined;
            const groupId = counterpartKey ? [key, counterpartKey].sort().join('=') : undefined;
            const color = groupId ? groupColors.get(groupId) : undefined;
            if (color && groupId) {
                return {
                    compoundId: state.block.compoundId,
                    element: state.block.element,
                    colorable: true,
                    color,
                    groupId,
                    counterpartCompoundIds: state.counterpartCompoundIds,
                    mappedIndexCount: state.block.indices.size,
                    structureAtomCount: state.structureAtomCount,
                };
            }
            return {
                compoundId: state.block.compoundId,
                element: state.block.element,
                colorable: false,
                counterpartCompoundIds: state.counterpartCompoundIds,
                mappedIndexCount: state.block.indices.size,
                ...(state.structureAtomCount === undefined ? {} : { structureAtomCount: state.structureAtomCount }),
                reason: state.basicReason ?? 'counterpart-unresolved',
            };
        });
    const unmappable = assignments.filter((assignment) => !assignment.colorable);

    return {
        blocks: assignments,
        legend,
        unmappable,
        colorableCount: assignments.length - unmappable.length,
        totalCount: assignments.length,
    };
}

/** Return only whole-element colours assigned to one compound. */
export function elementColorsForCompound(
    plan: AtomMappingColorPlan,
    compoundId: string,
): Readonly<Record<string, string>> {
    const colors: Record<string, string> = {};
    for (const block of Array.isArray(plan?.blocks) ? plan.blocks : []) {
        if (block.colorable && block.compoundId === compoundId && block.color) {
            colors[block.element] = block.color;
        }
    }
    return colors;
}

/** Look up a whole-element assignment, synthesising an explicit no-mapping result when absent. */
export function blockAssignment(
    plan: AtomMappingColorPlan,
    compoundId: string,
    element: string,
): ElementBlockAssignment {
    const found = Array.isArray(plan?.blocks)
        ? plan.blocks.find((block) => block.compoundId === compoundId && block.element === element)
        : undefined;
    return found ?? {
        compoundId,
        element,
        colorable: false,
        counterpartCompoundIds: [],
        mappedIndexCount: 0,
        reason: 'no-mapping',
    };
}
