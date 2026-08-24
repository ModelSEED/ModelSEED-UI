export interface RdkitAtomJson {
    z?: number;
    impHs?: number;
    chg?: number;
    isotope?: number;
}

export interface RdkitBondJson {
    atoms?: readonly number[];
}

export type ElementColorMap = Readonly<Record<string, string>>;

export interface MoleculeHighlightPlan {
    atomColors: Readonly<Record<number, string>>;
    bondColors: Readonly<Record<number, string>>;
}

const ELEMENT_SYMBOLS: Readonly<Record<number, string>> = {
    1: 'H', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 11: 'Na', 12: 'Mg',
    14: 'Si', 15: 'P', 16: 'S', 17: 'Cl', 19: 'K', 20: 'Ca', 25: 'Mn',
    26: 'Fe', 27: 'Co', 28: 'Ni', 29: 'Cu', 30: 'Zn', 33: 'As', 34: 'Se',
    35: 'Br', 42: 'Mo', 48: 'Cd', 53: 'I', 74: 'W', 80: 'Hg',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function moleculeFromMolJson(parsed: unknown): Record<string, unknown> | undefined {
    if (!isRecord(parsed) || !Array.isArray(parsed.molecules) || !isRecord(parsed.molecules[0])) {
        return undefined;
    }
    return parsed.molecules[0];
}

function atomsFromMolJson(parsed: unknown): readonly unknown[] | undefined {
    const molecule = moleculeFromMolJson(parsed);
    return molecule && Array.isArray(molecule.atoms) ? molecule.atoms : undefined;
}

export function elementSymbolForAtomicNumber(z: number | undefined): string {
    if (z === undefined) return 'C';
    return ELEMENT_SYMBOLS[z] ?? `Z${z}`;
}

export function elementInventoryFromMolJson(parsed: unknown): Record<string, number> {
    const atoms = atomsFromMolJson(parsed);
    if (!atoms) return {};

    const inventory: Record<string, number> = {};
    for (const atom of atoms) {
        if (!isRecord(atom)) continue;
        const z = typeof atom.z === 'number' ? atom.z : undefined;
        const symbol = elementSymbolForAtomicNumber(z);
        inventory[symbol] = (inventory[symbol] ?? 0) + 1;
        const implicitHydrogens = typeof atom.impHs === 'number' ? atom.impHs : 0;
        if (implicitHydrogens > 0) inventory.H = (inventory.H ?? 0) + implicitHydrogens;
    }
    return inventory;
}

export function buildExplicitAtomLabels(parsed: unknown): Record<number, string> {
    const atoms = atomsFromMolJson(parsed);
    if (!atoms || atoms.length === 0) return {};

    const labels: Record<number, string> = {};
    for (const [index, atom] of atoms.entries()) {
        if (!isRecord(atom)) continue;
        const rdkitAtom = atom as RdkitAtomJson;
        if (elementSymbolForAtomicNumber(rdkitAtom.z) === 'C' && !rdkitAtom.chg && !rdkitAtom.isotope) {
            labels[index] = 'C';
        }
    }
    return labels;
}

export function buildMoleculeHighlightPlan(
    parsed: unknown,
    elementColors: ElementColorMap,
): MoleculeHighlightPlan {
    const atoms = atomsFromMolJson(parsed);
    const molecule = moleculeFromMolJson(parsed);
    if (!atoms || !molecule || !isRecord(elementColors)) {
        return { atomColors: {}, bondColors: {} };
    }

    const atomColors: Record<number, string> = {};
    for (const [index, atom] of atoms.entries()) {
        if (!isRecord(atom)) continue;
        const symbol = elementSymbolForAtomicNumber(typeof atom.z === 'number' ? atom.z : undefined);
        const color = elementColors[symbol];
        // RDKit get_json array positions, not atom-mapping #N values, define renderer indices.
        if (typeof color === 'string') atomColors[index] = color;
    }

    const bondColors: Record<number, string> = {};
    const bonds = Array.isArray(molecule.bonds) ? molecule.bonds : [];
    for (const [index, bond] of bonds.entries()) {
        if (!isRecord(bond) || !Array.isArray(bond.atoms) || bond.atoms.length < 2) continue;
        const [left, right] = bond.atoms;
        if (!Number.isInteger(left) || !Number.isInteger(right)
            || left < 0 || right < 0 || left >= atoms.length || right >= atoms.length) continue;
        const leftColor = atomColors[left];
        const rightColor = atomColors[right];
        if (leftColor !== undefined && leftColor === rightColor) bondColors[index] = leftColor;
    }

    return { atomColors, bondColors };
}

export function applyAtomLabelColors(svg: string, atomColors: Readonly<Record<number, string>>): string {
    if (typeof svg !== 'string' || !atomColors || Object.keys(atomColors).length === 0) return svg;

    try {
        return svg.replace(/<[^>]+>/g, (tag) => {
            const classMatch = /\bclass=(['"])(.*?)\1/.exec(tag);
            if (!classMatch) return tag;
            const atomMatch = /^atom-(\d+)(?:\s|$)/.exec(classMatch[2]);
            if (!atomMatch) return tag;
            const color = atomColors[Number(atomMatch[1])];
            if (typeof color !== 'string') return tag;
            return tag
                .replace(/\bstyle=(['"])(.*?)\1/, (_styleAttribute, quote, style) => (
                    `style=${quote}${style.replace(/fill:\s*#[0-9a-f]{6}/gi, `fill:${color}`)}${quote}`
                ))
                .replace(/\bfill=(['"])#[0-9a-f]{6}\1/gi, (_fillAttribute, quote) => (
                    `fill=${quote}${color}${quote}`
                ));
        });
    } catch {
        return svg;
    }
}

export function applyBondColors(svg: string, bondColors: Readonly<Record<number, string>>): string {
    if (typeof svg !== 'string' || !bondColors || Object.keys(bondColors).length === 0) return svg;

    try {
        return svg.replace(/<[^>]+>/g, (tag) => {
            const classMatch = /\bclass=(['"])(.*?)\1/.exec(tag);
            if (!classMatch) return tag;
            const bondMatch = /^bond-(\d+)(?:\s|$)/.exec(classMatch[2]);
            if (!bondMatch) return tag;
            const color = bondColors[Number(bondMatch[1])];
            if (typeof color !== 'string') return tag;
            return tag
                .replace(/\bstyle=(['"])(.*?)\1/, (_styleAttribute, quote, style) => (
                    `style=${quote}${style.replace(/stroke:\s*#[0-9a-f]{6}/gi, `stroke:${color}`)}${quote}`
                ))
                .replace(/\bstroke=(['"])#[0-9a-f]{6}\1/gi, (_strokeAttribute, quote) => (
                    `stroke=${quote}${color}${quote}`
                ));
        });
    } catch {
        return svg;
    }
}
