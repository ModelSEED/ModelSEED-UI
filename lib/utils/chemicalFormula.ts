interface FormulaParseResult {
    readonly inventory: Record<string, number>;
    readonly isParsable: boolean;
}

function parseFormula(formula: string | null | undefined): FormulaParseResult {
    if (
        typeof formula !== 'string' ||
        !formula.trim() ||
        !/^[A-Za-z0-9]+$/.test(formula)
    ) {
        return { inventory: {}, isParsable: false };
    }

    const inventory: Record<string, number> = {};
    let position = 0;
    const token = /([A-Z][a-z]?)(\d*)/g;
    let match: RegExpExecArray | null;
    while ((match = token.exec(formula)) !== null) {
        if (match.index !== position) return { inventory: {}, isParsable: false };
        const count = match[2] ? Number.parseInt(match[2], 10) : 1;
        if (!Number.isFinite(count)) return { inventory: {}, isParsable: false };
        inventory[match[1]] = (inventory[match[1]] ?? 0) + count;
        position = token.lastIndex;
    }

    return position === formula.length
        ? { inventory, isParsable: true }
        : { inventory: {}, isParsable: false };
}

/** Parse a simple molecular formula into its element inventory. */
export function parseFormulaInventory(
    formula: string | null | undefined,
): Record<string, number> {
    return parseFormula(formula).inventory;
}

/** Whether a molecular formula was completely consumed by the simple formula parser. */
export function isParsableFormula(formula: string | null | undefined): boolean {
    return parseFormula(formula).isParsable;
}

/** Count non-hydrogen atoms in a simple molecular formula. */
export function heavyAtomCount(formula: string | null | undefined): number {
    return Object.entries(parseFormulaInventory(formula)).reduce(
        (total, [element, count]) => total + (element === 'H' ? 0 : count),
        0,
    );
}
