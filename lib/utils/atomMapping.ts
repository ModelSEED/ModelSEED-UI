/**
 * Parse the Solr-9 reaction `atom_mapping` field into typed, grouped atom-pair
 * records.
 *
 * Wire format: the field is an array of strings, ONE ATOM PAIR PER ELEMENT,
 * shaped as:
 *
 *   cpdAAAAA:E#N=cpdBBBBB:E#M
 *
 * where `E` is an element symbol (e.g. `O`, `H`, `Mg`) and `N`/`M` are
 * 1-based atom indices. The raw upstream `.txt` export prefixes each line
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
    raw: string;
}

const LEADING_REACTION_ID = /^rxn\d+\s+/;
const ATOM_REF = /^([A-Za-z][A-Za-z0-9]*\d+):([A-Za-z][a-z]?)#(\d+)$/;

/**
 * Parse one side of an atom-mapping entry, e.g. `cpd00001:O#1`.
 * Returns `null` for anything that does not match the expected shape,
 * including a zero or non-numeric index.
 */
function parseAtomRef(side: string): AtomRef | null {
    const match = ATOM_REF.exec(side);
    if (!match) return null;

    const [, compoundId, element, indexText] = match;
    const index = Number.parseInt(indexText, 10);
    if (!Number.isFinite(index) || index <= 0) return null;

    return { compoundId, element, index };
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

    const left = parseAtomRef(parts[0]);
    const right = parseAtomRef(parts[1]);
    if (!left || !right) return null;

    return { left, right, raw };
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
        record(pair.left);
        record(pair.right);
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
