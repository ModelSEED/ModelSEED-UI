import type { AtomMappingPair, AtomRef } from './atomMapping';
import { perceptualDistance } from './colorDistance';

/**
 * Build whole-element colour assignments for parsed reaction atom mappings.
 *
 * `lib/utils/atomMapping.ts:15-21` documents that mapping `#N` values are
 * 1-based per-element, per-compound indices in InChI canonical atom order,
 * not SMILES or RDKit atom indices. RDKit MinimalLib cannot recover that
 * order, so this module never emits or accepts atom-index-to-colour mappings:
 * an entire (compound, element) block is coloured only after its mapped index
 * count equals its structural atom count. Colours never assert atom-index-level
 * correspondence; merged components assert only set-level correspondence among
 * their fully covered member blocks.
 */

export type ElementInventory = Readonly<Record<string, number>>;

export type UnmappableReason =
    | 'no-mapping'
    | 'element-mismatch'
    | 'structure-unknown'
    | 'partial-coverage'
    | 'counterpart-unresolved';

export type BlockGroupKind = 'one-to-one' | 'merged';

export interface ElementBlockAssignment {
    readonly compoundId: string;
    readonly element: string;
    readonly colorable: boolean;
    readonly color?: string;
    readonly groupId?: string;
    readonly kind?: BlockGroupKind;
    readonly groupCompoundIds?: readonly string[];
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
    readonly kind: BlockGroupKind;
    readonly uncoloredCompoundIds: readonly string[];
}

export interface AtomMappingColorPlan {
    readonly blocks: readonly ElementBlockAssignment[];
    readonly legend: readonly AtomMappingColorLegendEntry[];
    readonly unmappable: readonly ElementBlockAssignment[];
    readonly colorableCount: number;
    readonly totalCount: number;
}

/**
 * Colour-vision-deficiency-safe categorical palette for atom mapping groups.
 *
 * Colours are assigned by sorted group order and rendered as RDKit highlight halos,
 * atom-label fills, and bond strokes on the white molecule canvas. The set uses six
 * hue families; repeated green and blue families are split by about 31 L* so they
 * read as dark versus bright green and deep versus sky blue rather than near-twins.
 * The warm band is deliberately excluded: on white, the 3:1 contrast requirement
 * makes warm colours dark, which reads as brown; it also avoids collisions with
 * RDKit's unmapped phosphorus and oxygen colours.
 *
 * Measured for this eight-colour set: minimum normal-vision dE76 is 48.6; minimum
 * protan/deutan dE76 is 23.4; minimum contrast is 3.01:1 against white and 2.22:1
 * against black; minimum dE76 from black is 50; and minimum dE76 from any RDKit
 * default (#FF0000, #FF7F00, #0000FF, #CCCC00, #00FF00) is 29.4.
 *
 * `selectMappingColors` chooses a maximum-minimum-separation subset when the group
 * count fits the palette. When it exceeds the palette length, it returns this full
 * palette unchanged; `buildAtomMappingColorPlan` then cycles it with
 * `index % selection.length`, so distinct groups can share a colour.
 */
export const MAPPING_PALETTE: readonly string[] = [
    '#355214', // dark green
    '#3FAA18', // bright green
    '#00A398', // teal
    '#2994FF', // sky blue
    '#0B26D5', // deep blue
    '#6F2183', // violet
    '#FF14EF', // magenta
    '#E00069', // crimson
];

const paletteDistances: readonly (readonly number[])[] = MAPPING_PALETTE.map((color) =>
    MAPPING_PALETTE.map((other) => perceptualDistance(color, other)));
const mappingColorSelections = new Map<number, readonly string[]>();

/** Select the lexicographically first maximum-minimum-separation palette subset. */
export function selectMappingColors(groupCount: number): readonly string[] {
    if (!Number.isFinite(groupCount) || !Number.isInteger(groupCount) || groupCount <= 0) return [];
    if (groupCount > MAPPING_PALETTE.length) return MAPPING_PALETTE;
    const cached = mappingColorSelections.get(groupCount);
    if (cached) return cached;

    let bestIndices: readonly number[] = [];
    let bestScore = -Infinity;
    const visit = (start: number, indices: number[]): void => {
        if (indices.length === groupCount) {
            const score = indices.length === 1 ? Infinity : Math.min(...indices.flatMap((index, offset) =>
                indices.slice(offset + 1).map((other) => paletteDistances[index][other])));
            if (score > bestScore) {
                bestScore = score;
                bestIndices = indices;
            }
            return;
        }
        for (let index = start; index <= MAPPING_PALETTE.length - (groupCount - indices.length); index += 1) {
            visit(index + 1, [...indices, index]);
        }
    };
    visit(0, []);
    const selection = bestIndices.map((index) => MAPPING_PALETTE[index]);
    mappingColorSelections.set(groupCount, selection);
    return selection;
}

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
    const basicReason = Array.from(block.counterpartElements).some((element) => element !== block.element)
        ? 'element-mismatch' as const
        : structureAtomCount === undefined
            ? 'structure-unknown' as const
            : block.indices.size !== structureAtomCount
                ? 'partial-coverage' as const
                : undefined;
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
        for (const ref of leftAtoms) if (isAtomRef(ref)) accumulateBlock(blocks, ref, rightAtoms);
        for (const ref of rightAtoms) if (isAtomRef(ref)) accumulateBlock(blocks, ref, leftAtoms);
    }

    const states = new Map<string, BlockState>();
    for (const [key, block] of blocks) states.set(key, stateFor(block, inventories));
    const neighbors = new Map<string, Set<string>>();
    for (const key of states.keys()) neighbors.set(key, new Set<string>());
    for (const [key, state] of states) {
        if (state.basicReason === 'element-mismatch') continue;
        for (const compoundId of state.counterpartCompoundIds) {
            const counterpartKey = blockKey(compoundId, state.block.element);
            if (states.has(counterpartKey)) {
                neighbors.get(key)?.add(counterpartKey);
                neighbors.get(counterpartKey)?.add(key);
            }
        }
    }

    const components: string[][] = [];
    const componentForKey = new Map<string, number>();
    for (const key of Array.from(states.keys()).sort((left, right) => left.localeCompare(right))) {
        if (componentForKey.has(key)) continue;
        const component: string[] = [];
        const queue = [key];
        componentForKey.set(key, components.length);
        while (queue.length > 0) {
            const current = queue.shift()!;
            component.push(current);
            for (const neighbor of neighbors.get(current) ?? []) {
                if (!componentForKey.has(neighbor)) {
                    componentForKey.set(neighbor, components.length);
                    queue.push(neighbor);
                }
            }
        }
        components.push(component.sort((left, right) => left.localeCompare(right)));
    }

    const componentGroups = new Map<number, {
        readonly groupId: string;
        readonly element: string;
        readonly compoundIds: readonly string[];
        readonly uncoloredCompoundIds: readonly string[];
        readonly kind: BlockGroupKind;
        readonly colorable: boolean;
    }>();
    for (const [index, component] of components.entries()) {
        const members = component.map((key) => states.get(key)!);
        const candidates = members.filter((state) => !state.basicReason);
        const compoundIds = Array.from(new Set(members.map((state) => state.block.compoundId)))
            .sort((left, right) => left.localeCompare(right));
        const colorable = candidates.length >= 2 && compoundIds.length >= 2;
        componentGroups.set(index, {
            groupId: component.join('='),
            element: members[0].block.element,
            compoundIds,
            uncoloredCompoundIds: Array.from(new Set(members.filter((state) => state.basicReason)
                .map((state) => state.block.compoundId))).sort((left, right) => left.localeCompare(right)),
            kind: component.length === 2 && members.every((state) => state.counterpartCompoundIds.length === 1)
                ? 'one-to-one' : 'merged',
            colorable,
        });
    }

    const groupColors = new Map<string, string>();
    const colourable = Array.from(componentGroups.values()).filter((group) => group.colorable)
        .sort((left, right) => left.groupId.localeCompare(right.groupId));
    const selection = selectMappingColors(colourable.length);
    const legend = colourable.map((group, index) => {
            const color = selection[index % selection.length];
            groupColors.set(group.groupId, color);
            return {
                groupId: group.groupId,
                color,
                element: group.element,
                compoundIds: group.compoundIds,
                kind: group.kind,
                uncoloredCompoundIds: group.uncoloredCompoundIds,
            };
        });

    const assignments = Array.from(states.entries())
        .sort(([, left], [, right]) => left.block.compoundId.localeCompare(right.block.compoundId)
            || left.block.element.localeCompare(right.block.element))
        .map(([key, state]): ElementBlockAssignment => {
            const group = componentGroups.get(componentForKey.get(key)!);
            const color = group?.colorable ? groupColors.get(group.groupId) : undefined;
            if (color && group && !state.basicReason) {
                return {
                    compoundId: state.block.compoundId,
                    element: state.block.element,
                    colorable: true,
                    color,
                    groupId: group.groupId,
                    kind: group.kind,
                    groupCompoundIds: group.compoundIds,
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
