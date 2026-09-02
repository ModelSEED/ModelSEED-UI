import { describe, expect, it } from 'vitest';
import { buildAtomMappingColorPlan, MAPPING_PALETTE, selectMappingColors } from '@/lib/utils/atomMappingColors';
import { deltaE76, perceptualDistance } from '@/lib/utils/colorDistance';
import { buildAtomOrbitColorPlan } from '@/lib/utils/atomOrbitColors';
import type { AtomMappingPair } from '@/lib/utils/atomMapping';

/**
 * Colour-science checks for `MAPPING_PALETTE`.
 *
 * These assert measurable properties computed from the palette values, not the
 * values themselves, so the palette can be retuned without editing expectations
 * while a regression that reintroduces confusable colours still fails.
 */

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/** Molecule SVGs render on `#ffffff` (`lib/theme.ts` background.default/paper). */
const CANVAS = WHITE;

/** WCAG 2.1 SC 1.4.11 Non-text Contrast: graphical objects need 3:1. */
const MIN_CONTRAST_ON_CANVAS = 3;
/** RDKit draws unmapped atoms/bonds in black; mapped colours must not read as black. */
const MIN_DELTA_E_FROM_BLACK = 45;
/** Every pair must stay apart for normal trichromats. */
const MIN_DELTA_E_NORMAL = 25;
/** ...and under the common red-green deficiencies. */
const MIN_DELTA_E_CVD = 15;

// At these sizes the maximum-minimum subset beats the palette-order prefix.
const COUNTS_WHERE_SELECTION_BEATS_PREFIX = new Set([2, 3, 4, 5, 7]);

type Rgb = readonly [number, number, number];

const hexToRgb = (hex: string): Rgb => {
    const h = hex.replace('#', '');
    return [
        Number.parseInt(h.slice(0, 2), 16),
        Number.parseInt(h.slice(2, 4), 16),
        Number.parseInt(h.slice(4, 6), 16),
    ];
};

const toLinear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const encodeSrgb = (linear: number): number => {
    const c = Math.min(1, Math.max(0, linear));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

const toHex = (linear: Rgb): string =>
    `#${linear.map((c) => Math.round(encodeSrgb(c) * 255).toString(16).padStart(2, '0').toUpperCase()).join('')}`;

const relativeLuminance = (hex: string): number => {
    const [r, g, b] = hexToRgb(hex).map(toLinear) as unknown as Rgb;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio, 1:1 to 21:1. */
const contrastRatio = (a: string, b: string): number => {
    const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

type Deficiency = 'protan' | 'deutan' | 'tritan';

/**
 * Viénot, Brettel & Mollon (1999) linear dichromacy simulation via
 * Hunt-Pointer-Estévez LMS. Standard model for protanopia/deuteranopia/tritanopia.
 */
const simulate = (hex: string, kind: Deficiency): string => {
    const [r, g, b] = hexToRgb(hex).map(toLinear) as unknown as Rgb;
    let L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
    let M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
    let S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
    if (kind === 'protan') L = 2.02344 * M - 2.52581 * S;
    else if (kind === 'deutan') M = 0.494207 * L + 1.24827 * S;
    else S = -0.395913 * L + 0.801109 * M;
    return toHex([
        0.0809444479 * L - 0.130504409 * M + 0.116721066 * S,
        -0.0102485335 * L + 0.0540193266 * M - 0.113614708 * S,
        -0.000365296938 * L - 0.00412161469 * M + 0.693511405 * S,
    ]);
};

const toLab = (hex: string): Rgb => {
    const [r, g, b] = hexToRgb(hex).map(toLinear) as unknown as Rgb;
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
    const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const [fx, fy, fz] = [f(x), f(y), f(z)];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

/** CIE76 colour difference in CIE-Lab. */
const deltaE = (a: string, b: string): number => {
    const [la, aa, ba] = toLab(a);
    const [lb, ab, bb] = toLab(b);
    return Math.hypot(la - lb, aa - ab, ba - bb);
};

const pairs = <T,>(items: readonly T[]): [T, T][] =>
    items.flatMap((left, i) => items.slice(i + 1).map((right): [T, T] => [left, right]));

const worstPair = (palette: readonly string[], kind: Deficiency | 'normal'): { delta: number; pair: [string, string] } =>
    pairs(palette)
        .map(([a, b]) => ({
            delta: kind === 'normal' ? deltaE(a, b) : deltaE(simulate(a, kind), simulate(b, kind)),
            pair: [a, b] as [string, string],
        }))
        .reduce((worst, candidate) => (candidate.delta < worst.delta ? candidate : worst));

const worstPerceptualPair = (palette: readonly string[]): number => Math.min(...pairs(palette)
    .map(([a, b]) => Math.min(deltaE(a, b), deltaE(simulate(a, 'protan'), simulate(b, 'protan'),), deltaE(simulate(a, 'deutan'), simulate(b, 'deutan')))));

describe('colour maths used by these checks', () => {
    // Guards the assertions below: if this helper drifts, the palette checks are meaningless.
    it('reproduces known reference values', () => {
        expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5);
        expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
        expect(toLab(WHITE)[0]).toBeCloseTo(100, 3);
        expect(toLab(BLACK)[0]).toBeCloseTo(0, 3);
        expect(deltaE('#355214', '#355214')).toBe(0);
        // Deuteranopia collapses pure red against pure green; normal vision does not.
        const normal = deltaE('#FF0000', '#00FF00');
        const deutan = deltaE(simulate('#FF0000', 'deutan'), simulate('#00FF00', 'deutan'));
        expect(normal).toBeGreaterThan(100);
        expect(deutan / normal).toBeLessThan(0.35);
    });

    it('flags the previously shipped palette that motivated this change', () => {
        // The retired 12-colour set: brown #8C564B and green #20854E were
        // indistinguishable under deuteranopia. Proves these thresholds can fail.
        const legacy = [
            '#E69F00', '#56B4E9', '#8C564B', '#7F3FBF', '#BC3C29', '#20854E',
            '#6F99AD', '#EE4C97', '#0072B2', '#D55E00', '#009E73', '#CC79A7',
        ];
        expect(worstPair(legacy, 'deutan').delta).toBeLessThan(MIN_DELTA_E_CVD);
        expect(Math.min(...legacy.map((c) => contrastRatio(c, CANVAS)))).toBeLessThan(MIN_CONTRAST_ON_CANVAS);
    });
});

describe('MAPPING_PALETTE', () => {
    it('is a non-trivial set of unique, well-formed colours', () => {
        expect(MAPPING_PALETTE.length).toBeGreaterThanOrEqual(8);
        expect(new Set(MAPPING_PALETTE).size).toBe(MAPPING_PALETTE.length);
        for (const color of MAPPING_PALETTE) expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('uses the high-salience six-family palette in its documented order', () => {
        expect(MAPPING_PALETTE).toEqual(['#355214', '#3FAA18', '#00A398', '#2994FF', '#0B26D5', '#6F2183', '#FF14EF', '#E00069']);
    });

    it('drops the low-contrast and CVD-confusable entries of the previous palette', () => {
        for (const retired of ['#E69F00', '#56B4E9', '#8C564B', '#20854E', '#6F99AD']) {
            expect(MAPPING_PALETTE).not.toContain(retired);
        }
    });

    it('meets WCAG non-text contrast against the white molecule canvas', () => {
        for (const color of MAPPING_PALETTE) {
            expect(contrastRatio(color, CANVAS)).toBeGreaterThanOrEqual(MIN_CONTRAST_ON_CANVAS);
        }
    });

    it('stays clearly distinct from the black used for unmapped atoms and bonds', () => {
        for (const color of MAPPING_PALETTE) {
            expect(deltaE(color, BLACK)).toBeGreaterThanOrEqual(MIN_DELTA_E_FROM_BLACK);
        }
    });

    it('separates every pair for normal colour vision', () => {
        expect(worstPair(MAPPING_PALETTE, 'normal').delta).toBeGreaterThanOrEqual(MIN_DELTA_E_NORMAL);
    });

    // No pair may rely on a red-versus-green distinction: each must survive both
    // simulations, which is exactly what a red/green-only pair fails to do.
    it.each(['protan', 'deutan'] as const)('separates every pair under simulated %s-opia', (kind) => {
        const { delta, pair } = worstPair(MAPPING_PALETTE, kind);
        expect(delta, `closest ${kind} pair: ${pair[0]} vs ${pair[1]}`).toBeGreaterThanOrEqual(MIN_DELTA_E_CVD);
    });

    // Tritanopia is excluded from subset ranking; pin its actual worst pair so a
    // future palette change makes that trade-off visible.
    it('has the documented tritanopia limitation', () => {
        const { delta, pair } = worstPair(MAPPING_PALETTE, 'tritan');
        expect(delta).toBeCloseTo(4.95, 1);
        expect(pair).toEqual(['#00A398', '#2994FF']);
    });
});

describe('selectMappingColors', () => {
    it('maximises worst-case normal and red-green-deficiency separation', () => {
        for (let count = 2; count <= MAPPING_PALETTE.length; count += 1) {
            const selected = worstPerceptualPair(selectMappingColors(count));
            const sequential = worstPerceptualPair(MAPPING_PALETTE.slice(0, count));
            expect(selected).toBeGreaterThanOrEqual(sequential);
            expect(selected).toBeGreaterThanOrEqual(MIN_DELTA_E_CVD);
            // At 6 and 8, the leading palette run is already an optimal subset, so the
            // maximiser agrees with the prefix; this tie is never a regression.
            if (COUNTS_WHERE_SELECTION_BEATS_PREFIX.has(count)) {
                expect(selected).toBeGreaterThan(sequential);
            } else {
                expect(selected).toBeCloseTo(sequential, 9);
            }
        }
    });

    it('returns deterministic palette-order selections and defined boundary shapes', () => {
        for (let count = 1; count <= MAPPING_PALETTE.length; count += 1) {
            const selection = selectMappingColors(count);
            expect(selection).toHaveLength(count);
            expect(new Set(selection).size).toBe(count);
            expect(selection).toEqual(MAPPING_PALETTE.filter((color) => selection.includes(color)));
        }
        for (const count of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(selectMappingColors(count)).toEqual([]);
        expect(selectMappingColors(9)).toEqual(MAPPING_PALETTE);
        expect(selectMappingColors(20)).toEqual(MAPPING_PALETTE);
        expect(selectMappingColors(4)).toEqual(selectMappingColors(4));
    });

    it('prevents the reported retired brown and rose-red collapse', () => {
        expect(worstPerceptualPair(['#8C564B', '#FA3C5A'])).toBeLessThan(MIN_DELTA_E_CVD);
        for (let count = 2; count <= MAPPING_PALETTE.length; count += 1) {
            expect(worstPerceptualPair(selectMappingColors(count))).toBeGreaterThanOrEqual(MIN_DELTA_E_CVD);
        }
    });

    it('matches the independent colour-maths reference', () => {
        const colours = [...MAPPING_PALETTE, '#8C564B', '#FA3C5A', BLACK, WHITE];
        for (const [a, b] of pairs(colours)) {
            expect(deltaE76(a, b)).toBeCloseTo(deltaE(a, b), 9);
            expect(perceptualDistance(a, b)).toBeCloseTo(
                Math.min(deltaE(a, b), deltaE(simulate(a, 'protan'), simulate(b, 'protan')), deltaE(simulate(a, 'deutan'), simulate(b, 'deutan'))),
                9,
            );
        }
    });

    it('addresses the rxn00018 high-salience mapping colour report', () => {
        expect(selectMappingColors(8)).toEqual([
            '#355214', '#3FAA18', '#00A398', '#2994FF',
            '#0B26D5', '#6F2183', '#FF14EF', '#E00069',
        ]);
        expect(selectMappingColors(4)).toEqual(['#3FAA18', '#00A398', '#2994FF', '#0B26D5']);
        for (const [left, right] of pairs(MAPPING_PALETTE)) {
            expect(deltaE76(left, right), `${left} vs ${right}`).toBeGreaterThanOrEqual(45);
        }
        for (const color of MAPPING_PALETTE) {
            for (const rdkitDefault of ['#FF0000', '#FF7F00', '#0000FF', '#CCCC00', '#00FF00']) {
                expect(deltaE76(color, rdkitDefault), `${color} vs ${rdkitDefault}`).toBeGreaterThanOrEqual(25);
            }
        }
        expect(selectMappingColors(MAPPING_PALETTE.length + 1)).toEqual(MAPPING_PALETTE);
        const mappingPairs: AtomMappingPair[] = Array.from({ length: MAPPING_PALETTE.length + 1 }, (_, index) => ({
            left: { compoundId: `cpd${String(index).padStart(5, '0')}`, element: 'O', index: 1 },
            right: { compoundId: `cpd${String(index + 100).padStart(5, '0')}`, element: 'O', index: 1 },
            leftAtoms: [{ compoundId: `cpd${String(index).padStart(5, '0')}`, element: 'O', index: 1 }],
            rightAtoms: [{ compoundId: `cpd${String(index + 100).padStart(5, '0')}`, element: 'O', index: 1 }],
            hasSymmetryGroup: false,
            raw: '',
        }));
        const inventories = Object.fromEntries(mappingPairs.flatMap(({ left, right }) => [
            [left.compoundId, { O: 1 }], [right.compoundId, { O: 1 }],
        ]));
        const plan = buildAtomMappingColorPlan(mappingPairs, inventories);
        expect(plan.legend).toHaveLength(MAPPING_PALETTE.length + 1);
        expect(plan.legend[0].color).toBe(plan.legend[MAPPING_PALETTE.length].color);
    });
});

describe('palette assignment', () => {
    const pair = (left: string, right: string): AtomMappingPair => ({
        left: { compoundId: left, element: 'O', index: 1 },
        right: { compoundId: right, element: 'O', index: 1 },
        leftAtoms: [{ compoundId: left, element: 'O', index: 1 }],
        rightAtoms: [{ compoundId: right, element: 'O', index: 1 }],
        hasSymmetryGroup: false,
        raw: '',
    });

    it('assigns selected colours by group order and is stable across runs', () => {
        const build = (): readonly string[] =>
            buildAtomOrbitColorPlan(
                Array.from({ length: MAPPING_PALETTE.length + 2 }, (_, i) =>
                    pair(`cpd${String(i + 100).padStart(5, '0')}`, `cpd${String(i + 300).padStart(5, '0')}`)),
                [],
            ).groups.map((group) => group.color);

        const selection = selectMappingColors(MAPPING_PALETTE.length + 2);
        const expected = Array.from(
            { length: MAPPING_PALETTE.length + 2 },
            (_, i) => selection[i % selection.length],
        );
        expect(build()).toEqual(expected);
        expect(build()).toEqual(build());
    });
});
