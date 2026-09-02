/** Dependency-free CIE76 and dichromacy utilities for mapping-colour selection. */

type Rgb = readonly [number, number, number];
export type DichromacyKind = 'protan' | 'deutan' | 'tritan';

function hexToRgb(hex: string): Rgb {
    const value = typeof hex === 'string' ? hex.replace('#', '') : '';
    const channel = (offset: number): number => Number.parseInt(value.slice(offset, offset + 2), 16) || 0;
    return [channel(0), channel(2), channel(4)];
}

function toLinear(channel: number): number {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function encodeSrgb(linear: number): number {
    const value = Math.min(1, Math.max(0, linear));
    return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

function toHex(linear: Rgb): string {
    return `#${linear.map((value) => Math.round(encodeSrgb(value) * 255).toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

/** Viénot, Brettel & Mollon (1999) dichromacy simulation via Hunt-Pointer-Estévez LMS. */
export function simulateDichromacy(hex: string, kind: DichromacyKind): string {
    const [red, green, blue] = hexToRgb(hex).map(toLinear) as unknown as Rgb;
    let long = 17.8824 * red + 43.5161 * green + 4.11935 * blue;
    let medium = 3.45565 * red + 27.1554 * green + 3.86714 * blue;
    let short = 0.0299566 * red + 0.184309 * green + 1.46709 * blue;
    if (kind === 'protan') long = 2.02344 * medium - 2.52581 * short;
    else if (kind === 'deutan') medium = 0.494207 * long + 1.24827 * short;
    else short = -0.395913 * long + 0.801109 * medium;
    return toHex([
        0.0809444479 * long - 0.130504409 * medium + 0.116721066 * short,
        -0.0102485335 * long + 0.0540193266 * medium - 0.113614708 * short,
        -0.000365296938 * long - 0.00412161469 * medium + 0.693511405 * short,
    ]);
}

function toLab(hex: string): Rgb {
    const [red, green, blue] = hexToRgb(hex).map(toLinear) as unknown as Rgb;
    const x = (0.4124 * red + 0.3576 * green + 0.1805 * blue) / 0.95047;
    const y = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const z = (0.0193 * red + 0.1192 * green + 0.9505 * blue) / 1.08883;
    const f = (value: number): number => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
    const [fx, fy, fz] = [f(x), f(y), f(z)];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 colour difference in CIE-Lab using a D65 white point. */
export function deltaE76(a: string, b: string): number {
    const [lightA, aA, bA] = toLab(a);
    const [lightB, aB, bB] = toLab(b);
    return Math.hypot(lightA - lightB, aA - aB, bA - bB);
}

/**
 * Minimum normal/protan/deutan distance. Tritanopia is excluded because accepted
 * #00A398/#2994FF tritan dE76 4.95 would flatten every subset ranking.
 */
export function perceptualDistance(a: string, b: string): number {
    return Math.min(
        deltaE76(a, b),
        deltaE76(simulateDichromacy(a, 'protan'), simulateDichromacy(b, 'protan')),
        deltaE76(simulateDichromacy(a, 'deutan'), simulateDichromacy(b, 'deutan')),
    );
}
