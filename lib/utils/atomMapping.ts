/**
 * Parse the Solr-9 reaction `atom_mapping` field into typed, grouped atom-pair
 * records.
 *
 * Wire format: the field is an array of strings, shaped as:
 *
 *   cpdAAAAA:E#N=cpdBBBBB:E#M
 *   cpdAAAAA:(E#N;E#N)=cpdBBBBB:E#M
 *
 * where a parenthesized side is a symmetry group and `E` is an element symbol
 * (e.g. `O`, `H`, `Mg`). `N`/`M` are 1-based atom indices. The raw upstream `.txt` export prefixes each line
 * with a reaction id token (`rxn00001 cpd00001:O#1=cpd00009:O#2`); the Solr
 * field itself may or may not carry that prefix, so both forms are accepted.
 *
 * IMPORTANT: `N`/`M` are counted per element, per compound, in InChI
 * canonical atom order (i.e. "the 3rd oxygen of cpd00012" per the InChI
 * canonicalization), NOT a SMILES atom index and NOT an RDKit atom map
 * number. Do not feed these indices directly into an RDKit/SMILES atom
 * index without an explicit InChI-order mapping step.
 *
 * This module is pure and dependency-free: no I/O, no React, no RDKit, no
 * config, no fetch, no module-level mutable state. Malformed input degrades
 * to a shorter result (or `null`/`[]`), never to a thrown exception.
 */

/** One atom referenced by an `atom_mapping` entry. */
export interface AtomRef {
    compoundId: string;
    element: string;
    index: number;
}

/** A single parsed atom-pair entry from the `atom_mapping` array. */
export interface AtomMappingPair {
    left: AtomRef;
    right: AtomRef;
    leftAtoms: readonly AtomRef[];
    rightAtoms: readonly AtomRef[];
    hasSymmetryGroup: boolean;
    raw: string;
}

export interface NormalizedAtomMapping {
    entries: string[];
    confidence?: string;
    hasSymmetryGroups: boolean;
    source: 'atom_mapping_data' | 'atom_mapping' | 'none';
}

export interface AtomMappingSource {
    atom_mapping_data?: unknown;
    atom_mapping?: unknown;
    atom_mapping_confidence?: unknown;
    atom_mapping_has_symmetry_groups?: unknown;
}

const LEADING_REACTION_ID = /^rxn\d+\s+/;
const ATOM_REF = /^([A-Za-z][A-Za-z0-9]*\d+):([A-Za-z][a-z]?)#(\d+)$/;
const COMPOUND_ID = /^[A-Za-z][A-Za-z0-9]*\d+$/;
const SINGLE_ATOM_REF = /^([A-Za-z][a-z]?)#(\d+)$/;

function toStringArray(value: unknown): string[] {
    const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    return values
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export function normalizeAtomMapping(
    doc: AtomMappingSource | null | undefined,
): NormalizedAtomMapping {
    const dataEntries = toStringArray(doc?.atom_mapping_data);
    const legacyEntries = toStringArray(doc?.atom_mapping);
    const entries = dataEntries.length > 0 ? dataEntries : legacyEntries;
    const source = dataEntries.length > 0
        ? 'atom_mapping_data'
        : legacyEntries.length > 0
            ? 'atom_mapping'
            : 'none';
    const confidence = typeof doc?.atom_mapping_confidence === 'string'
        ? doc.atom_mapping_confidence.trim() || undefined
        : undefined;
    const symmetryFlag = doc?.atom_mapping_has_symmetry_groups;
    const hasSymmetryGroups = typeof symmetryFlag === 'boolean'
        ? symmetryFlag
        : typeof symmetryFlag === 'string' && /^(true|false)$/i.test(symmetryFlag)
            ? symmetryFlag.toLowerCase() === 'true'
            : entries.some((entry) => entry.includes('('));

    return { entries, confidence, hasSymmetryGroups, source };
}

function parseAtomSpec(compoundId: string, spec: string): AtomRef[] | null {
    const parseMember = (member: string): AtomRef | null => {
        const match = SINGLE_ATOM_REF.exec(member);
        if (!match) return null;

        const [, element, indexText] = match;
        const index = Number.parseInt(indexText, 10);
        if (!Number.isFinite(index) || index <= 0) return null;

        return { compoundId, element, index };
    };

    if (spec.startsWith('(')) {
        if (!spec.endsWith(')')) return null;

        const members = spec.slice(1, -1).split(';').map((member) => member.trim());
        if (members.length === 0 || members.some((member) => !member)) return null;

        const atoms = members.map(parseMember);
        return atoms.every((atom): atom is AtomRef => atom !== null) ? atoms : null;
    }

    if (spec.includes('(') || spec.includes(')') || spec.includes(';')) return null;

    const atom = parseMember(spec);
    return atom ? [atom] : null;
}

/**
 * Parse one side of an atom-mapping entry, e.g. `cpd00001:O#1`.
 * Returns `null` for anything that does not match the expected shape,
 * including a zero or non-numeric index.
 */
function parseAtomRef(side: string): AtomRef[] | null {
    const separator = side.indexOf(':');
    if (separator === -1) return null;

    const compoundId = side.slice(0, separator);
    if (!COMPOUND_ID.test(compoundId)) return null;

    const spec = side.slice(separator + 1);
    if (!spec.includes('(') && !spec.includes(')') && !spec.includes(';') && !ATOM_REF.test(side)) {
        return null;
    }

    return parseAtomSpec(compoundId, spec);
}

/** Format a singleton atom or symmetry group for display. */
export function formatAtomGroup(atoms: readonly AtomRef[]): string {
    return atoms.map(({ element, index }) => `${element}#${index}`).join(', ');
}

/**
 * Parse a single `atom_mapping` array entry into a typed pair. Never throws:
 * any malformed input (wrong type, missing separators, unparsable sides)
 * yields `null`.
 */
export function parseAtomMappingEntry(entry: string): AtomMappingPair | null {
    if (typeof entry !== 'string') return null;

    const trimmed = entry.trim();
    if (!trimmed) return null;

    const raw = trimmed.replace(LEADING_REACTION_ID, '');

    const parts = raw.split('=');
    if (parts.length !== 2) return null;

    const leftAtoms = parseAtomRef(parts[0]);
    const rightAtoms = parseAtomRef(parts[1]);
    if (!leftAtoms || !rightAtoms) return null;

    return {
        left: leftAtoms[0],
        right: rightAtoms[0],
        leftAtoms,
        rightAtoms,
        hasSymmetryGroup: leftAtoms.length > 1 || rightAtoms.length > 1,
        raw,
    };
}

/**
 * Parse a full `atom_mapping` array, dropping unparsable entries while
 * preserving the order of the entries that do parse. Missing/empty input
 * (`undefined`, `null`) returns an empty array.
 */
export function parseAtomMappings(
    entries: readonly string[] | undefined | null,
): AtomMappingPair[] {
    if (!entries) return [];

    const pairs: AtomMappingPair[] = [];
    for (const entry of entries) {
        const pair = parseAtomMappingEntry(entry);
        if (pair) pairs.push(pair);
    }
    return pairs;
}

/**
 * Group atom-mapping pairs by the compound(s) they reference. A pair whose
 * `left` and `right` compound ids are equal is added to that compound's
 * bucket exactly once (not twice); a pair spanning two different compounds
 * appears under both. Key insertion order follows first appearance.
 */
export function groupAtomMappingsByCompound(
    pairs: readonly AtomMappingPair[],
): Map<string, AtomMappingPair[]> {
    const groups = new Map<string, AtomMappingPair[]>();

    const addTo = (compoundId: string, pair: AtomMappingPair) => {
        const bucket = groups.get(compoundId);
        if (bucket) {
            bucket.push(pair);
        } else {
            groups.set(compoundId, [pair]);
        }
    };

    for (const pair of pairs) {
        addTo(pair.left.compoundId, pair);
        if (pair.right.compoundId !== pair.left.compoundId) {
            addTo(pair.right.compoundId, pair);
        }
    }

    return groups;
}

/**
 * Count, per compound, the number of distinct atom indices seen for each
 * element - considering both sides of every pair. An atom index that
 * appears in more than one pair (e.g. it participates in multiple mapped
 * bonds) is counted once.
 */
export function countAtomsPerElement(
    pairs: readonly AtomMappingPair[],
): Map<string, Map<string, number>> {
    const seen = new Map<string, Map<string, Set<number>>>();

    const record = (ref: AtomRef) => {
        let byElement = seen.get(ref.compoundId);
        if (!byElement) {
            byElement = new Map<string, Set<number>>();
            seen.set(ref.compoundId, byElement);
        }
        let indices = byElement.get(ref.element);
        if (!indices) {
            indices = new Set<number>();
            byElement.set(ref.element, indices);
        }
        indices.add(ref.index);
    };

    for (const pair of pairs) {
        for (const atom of pair.leftAtoms) record(atom);
        for (const atom of pair.rightAtoms) record(atom);
    }

    const counts = new Map<string, Map<string, number>>();
    for (const [compoundId, byElement] of seen) {
        const elementCounts = new Map<string, number>();
        for (const [element, indices] of byElement) {
            elementCounts.set(element, indices.size);
        }
        counts.set(compoundId, elementCounts);
    }

    return counts;
}

export interface AtomFlow {
    from: string;
    to: string;
    total: number;
    byElement: ReadonlyMap<string, number>;
}

/** Summarize distinct source atoms as directed compound-to-compound flows. */
export function summarizeAtomFlows(pairs: readonly AtomMappingPair[]): AtomFlow[] {
    const flows = new Map<
        string,
        { from: string; to: string; total: number; byElement: Map<string, number>; seen: Set<string> }
    >();

    for (const pair of pairs) {
        const { left, right } = pair;
        const key = `${left.compoundId}>${right.compoundId}`;
        let flow = flows.get(key);
        if (!flow) {
            flow = {
                from: left.compoundId,
                to: right.compoundId,
                total: 0,
                byElement: new Map<string, number>(),
                seen: new Set<string>(),
            };
            flows.set(key, flow);
        }

        const sourceAtom = `${left.element}#${left.index}`;
        if (!flow.seen.has(sourceAtom)) {
            flow.seen.add(sourceAtom);
            flow.total += 1;
            flow.byElement.set(left.element, (flow.byElement.get(left.element) ?? 0) + 1);
        }
    }

    return Array.from(flows.values(), ({ from, to, total, byElement }) => ({
        from,
        to,
        total,
        byElement,
    }));
}
