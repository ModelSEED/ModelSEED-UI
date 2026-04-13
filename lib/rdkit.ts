/**
 * RDKit.js singleton loader
 *
 * RDKit.js is a ~13 MB WebAssembly module. We load it once and cache the
 * promise so every subsequent call receives the same already-resolved module
 * without re-downloading or re-initialising the WASM binary.
 *
 * Usage:
 *   const RDKit = await getRDKit();
 *   const mol = RDKit.get_mol(smiles);
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RDKitModule = any;

let rdkitPromise: Promise<RDKitModule> | null = null;

export function getRDKit(): Promise<RDKitModule> {
    if (!rdkitPromise) {
        rdkitPromise = import('@rdkit/rdkit').then((mod) => mod.default());
    }
    return rdkitPromise;
}
