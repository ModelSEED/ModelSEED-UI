/**
 * Reconstruct safe InChI-canonical heavy-atom references for a local molecular
 * graph. This module deliberately uses only the InChI formula and `/c` layer:
 * RDKit MinimalLib cannot expose InChI canonical atom order.
 */

/** A heavy-atom molecular graph in local (RDKit / SMILES) index space, 0-based. */
export interface HeavyAtomGraph {
    /** element symbol per 0-based atom index, e.g. ['O', 'P', 'O', 'O', 'O'] */
    elements: string[];
    /** undirected bonds as 0-based index pairs; order and duplication are tolerated */
    bonds: Array<[number, number]>;
}

export type InchiOrbitFailure =
    | 'no-inchi'
    | 'multi-component'
    | 'unsupported-inchi'
    | 'formula-parse-failed'
    | 'connection-parse-failed'
    | 'atom-count-mismatch'
    | 'element-count-mismatch'
    | 'bond-count-mismatch'
    | 'too-large'
    | 'no-isomorphism'
    | 'search-exhausted';

export interface InchiOrbitOptions {
    maxAtoms?: number;
    maxSolutions?: number;
    maxSteps?: number;
}

export interface InchiOrbitSuccess {
    ok: true;
    /** element symbol per 1-based canonical index; canonicalElements[0] is canonical atom 1 */
    canonicalElements: string[];
    /** orbits[c] = sorted, de-duplicated local 0-based indices canonical atom (c+1) may denote */
    orbits: number[][];
    /** number of isomorphisms found */
    solutionCount: number;
    /** true when every orbit has exactly one member */
    exact: boolean;
}

export type InchiOrbitResult = InchiOrbitSuccess | { ok: false; reason: InchiOrbitFailure };

/**
 * Return the heavy elements in InChI Hill canonical order. `undefined` means
 * the formula is not wholly composed of element/count pairs or has no heavy atom.
 */
export function hillCanonicalElements(formulaLayer: string): string[] | undefined {
    if (typeof formulaLayer !== 'string' || formulaLayer.includes('.')) return undefined;

    const counts = new Map<string, number>();
    const elementPattern = /([A-Z][a-z]?)(\d*)/y;
    let position = 0;
    let parsedAny = false;
    while (position < formulaLayer.length) {
        elementPattern.lastIndex = position;
        const match = elementPattern.exec(formulaLayer);
        if (!match || match.index !== position) return undefined;
        parsedAny = true;
        const count = match[2] ? Number.parseInt(match[2], 10) : 1;
        if (!Number.isSafeInteger(count) || count < 1) return undefined;
        if (match[1] !== 'H') counts.set(match[1], (counts.get(match[1]) ?? 0) + count);
        position = elementPattern.lastIndex;
    }

    if (!parsedAny || counts.size === 0) return undefined;
    const symbols = Array.from(counts.keys()).sort((a, b) => {
        if (a === 'C') return -1;
        if (b === 'C') return 1;
        return a.localeCompare(b);
    });
    return symbols.flatMap((symbol) => Array.from({ length: counts.get(symbol) ?? 0 }, () => symbol));
}

/** Parse an InChI `/c` connection string into distinct 1-based unordered edges. */
export function parseInchiConnections(connectionLayer: string): Array<[number, number]> | undefined {
    if (typeof connectionLayer !== 'string' || /[;*?]/.test(connectionLayer)) return undefined;

    const tokens: Array<number | '-' | '(' | ')' | ','> = [];
    for (let index = 0; index < connectionLayer.length;) {
        const character = connectionLayer[index];
        if (/\d/.test(character)) {
            let end = index + 1;
            while (end < connectionLayer.length && /\d/.test(connectionLayer[end])) end += 1;
            const value = Number.parseInt(connectionLayer.slice(index, end), 10);
            if (!Number.isSafeInteger(value)) return undefined;
            tokens.push(value);
            index = end;
        } else if (character === '-' || character === '(' || character === ')' || character === ',') {
            tokens.push(character);
            index += 1;
        } else {
            return undefined;
        }
    }

    let previous: number | null = null;
    const stack: Array<number | null> = [];
    const edges = new Map<string, [number, number]>();
    for (const token of tokens) {
        if (typeof token === 'number') {
            if (previous !== null) {
                const left = Math.min(previous, token);
                const right = Math.max(previous, token);
                if (left === right) return undefined;
                edges.set(`${left}:${right}`, [left, right]);
            }
            previous = token;
        } else if (token === '(') {
            stack.push(previous);
        } else if (token === ',') {
            if (stack.length === 0) return undefined;
            previous = stack[stack.length - 1];
        } else if (token === ')') {
            if (stack.length === 0) return undefined;
            previous = stack.pop() ?? null;
        }
    }
    return stack.length === 0 ? Array.from(edges.values()) : undefined;
}

function failure(reason: InchiOrbitFailure): InchiOrbitResult {
    return { ok: false, reason };
}

function option(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.floor(value)
        : fallback;
}

function countElements(elements: readonly string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const element of elements) counts.set(element, (counts.get(element) ?? 0) + 1);
    return counts;
}

function sameCounts(left: Map<string, number>, right: Map<string, number>): boolean {
    return left.size === right.size && Array.from(left.entries()).every(([element, count]) => right.get(element) === count);
}

function graphEdges(graph: unknown, atomCount: number): Set<string> | undefined {
    if (!graph || typeof graph !== 'object' || !Array.isArray((graph as HeavyAtomGraph).bonds)) return undefined;
    const edges = new Set<string>();
    for (const bond of (graph as HeavyAtomGraph).bonds) {
        if (!Array.isArray(bond) || bond.length !== 2) return undefined;
        const [first, second] = bond;
        if (!Number.isInteger(first) || !Number.isInteger(second)
            || first < 0 || second < 0 || first >= atomCount || second >= atomCount || first === second) {
            return undefined;
        }
        edges.add(first < second ? `${first}:${second}` : `${second}:${first}`);
    }
    return edges;
}

/**
 * Build complete, element-preserving graph-isomorphism orbits. If a configured
 * search cap is reached, returns a failure rather than a partial (unsound) orbit.
 */
export function buildInchiAtomOrbits(
    inchi: string | undefined | null,
    graph: HeavyAtomGraph,
    options?: InchiOrbitOptions,
): InchiOrbitResult {
    try {
        if (typeof inchi !== 'string' || !inchi.startsWith('InChI=')) return failure('no-inchi');
        const layers = inchi.split('/');
        const formula = layers[1];
        if (!formula) return failure('formula-parse-failed');
        if (formula.includes('.')) return failure('multi-component');

        const canonicalElements = hillCanonicalElements(formula);
        if (!canonicalElements) {
            return /^[a-z]/.test(formula) ? failure('unsupported-inchi') : failure('formula-parse-failed');
        }
        const maxAtoms = option(options?.maxAtoms, 80);
        if (canonicalElements.length > maxAtoms) return failure('too-large');

        const connectionLayer = layers.slice(2).find((layer) => layer.startsWith('c'));
        if (connectionLayer?.includes(';') || connectionLayer?.includes('*')) return failure('multi-component');
        if (connectionLayer?.includes('?')) return failure('unsupported-inchi');

        const rawElements = graph && typeof graph === 'object' ? (graph as HeavyAtomGraph).elements : undefined;
        if (!Array.isArray(rawElements) || rawElements.some((element) => typeof element !== 'string')) {
            return failure('atom-count-mismatch');
        }
        if (canonicalElements.length !== rawElements.length) return failure('atom-count-mismatch');
        if (!sameCounts(countElements(canonicalElements), countElements(rawElements))) {
            return failure('element-count-mismatch');
        }

        let canonicalEdges: Array<[number, number]>;
        if (connectionLayer === undefined) {
            if (canonicalElements.length !== 1) return failure('connection-parse-failed');
            canonicalEdges = [];
        } else {
            const parsed = parseInchiConnections(connectionLayer.slice(1));
            if (!parsed || parsed.some(([left, right]) => left < 1 || right < 1
                || left > canonicalElements.length || right > canonicalElements.length)) {
                return failure('connection-parse-failed');
            }
            canonicalEdges = parsed;
        }

        const localEdges = graphEdges(graph, rawElements.length);
        if (!localEdges || canonicalEdges.length !== localEdges.size) return failure('bond-count-mismatch');

        const canonicalAdjacency = Array.from({ length: canonicalElements.length }, () => new Set<number>());
        for (const [left, right] of canonicalEdges) {
            canonicalAdjacency[left - 1].add(right - 1);
            canonicalAdjacency[right - 1].add(left - 1);
        }
        const localAdjacency = Array.from({ length: rawElements.length }, () => new Set<number>());
        for (const key of localEdges) {
            const [left, right] = key.split(':').map(Number);
            localAdjacency[left].add(right);
            localAdjacency[right].add(left);
        }

        const order = canonicalElements.map((_, index) => index).sort((left, right) => {
            const degreeDifference = canonicalAdjacency[right].size - canonicalAdjacency[left].size;
            if (degreeDifference) return degreeDifference;
            const leftRarity = canonicalElements.filter((element) => element === canonicalElements[left]).length;
            const rightRarity = canonicalElements.filter((element) => element === canonicalElements[right]).length;
            return leftRarity - rightRarity || left - right;
        });
        const candidates = canonicalElements.map((element, canonical) => rawElements
            .map((local, index) => ({ local, index }))
            .filter(({ local, index }) => local === element && localAdjacency[index].size === canonicalAdjacency[canonical].size)
            .map(({ index }) => index));

        const maxSteps = option(options?.maxSteps, 500_000);
        const maxSolutions = option(options?.maxSolutions, 512);
        const mapping = Array<number>(canonicalElements.length).fill(-1);
        const used = new Set<number>();
        const orbitSets = canonicalElements.map(() => new Set<number>());
        let steps = 0;
        let solutionCount = 0;
        let exhausted = false;

        const search = (depth: number): void => {
            steps += 1;
            if (steps > maxSteps || exhausted) {
                exhausted = true;
                return;
            }
            if (depth === order.length) {
                solutionCount += 1;
                if (solutionCount > maxSolutions) {
                    exhausted = true;
                    return;
                }
                mapping.forEach((local, canonical) => orbitSets[canonical].add(local));
                return;
            }
            const canonical = order[depth];
            for (const local of candidates[canonical]) {
                if (used.has(local)) continue;
                let consistent = true;
                for (let other = 0; other < mapping.length; other += 1) {
                    if (mapping[other] === -1) continue;
                    if (canonicalAdjacency[canonical].has(other) !== localAdjacency[local].has(mapping[other])) {
                        consistent = false;
                        break;
                    }
                }
                if (!consistent) continue;
                mapping[canonical] = local;
                used.add(local);
                search(depth + 1);
                used.delete(local);
                mapping[canonical] = -1;
                if (exhausted) return;
            }
        };
        search(0);
        if (exhausted) return failure('search-exhausted');
        if (solutionCount === 0) return failure('no-isomorphism');

        const orbits = orbitSets.map((orbit) => Array.from(orbit).sort((left, right) => left - right));
        return {
            ok: true,
            canonicalElements,
            orbits,
            solutionCount,
            exact: orbits.every((orbit) => orbit.length === 1),
        };
    } catch {
        return failure('connection-parse-failed');
    }
}

/** Resolve an element-local mapping reference to its 1-based canonical index. */
export function canonicalIndexForElementRef(
    canonicalElements: string[],
    element: string,
    oneBasedWithinElement: number,
): number | undefined {
    if (!Array.isArray(canonicalElements) || !Number.isInteger(oneBasedWithinElement) || oneBasedWithinElement < 1) {
        return undefined;
    }
    let seen = 0;
    for (let index = 0; index < canonicalElements.length; index += 1) {
        if (canonicalElements[index] === element && ++seen === oneBasedWithinElement) return index + 1;
    }
    return undefined;
}
