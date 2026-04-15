/**
 * RDKit.js singleton loader (browser-only).
 *
 * We intentionally load RDKit via script injection + window.initRDKitModule
 * instead of ESM import. Directly importing "@rdkit/rdkit" in Next.js client
 * builds can pull in a Node-oriented branch that references `fs`, causing
 * "Module not found: Can't resolve 'fs'" during bundling.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RDKitModule = any;

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initRDKitModule?: (opts?: Record<string, any>) => Promise<RDKitModule>;
    }
}

const RDKIT_VERSION = '2025.3.4-1.0.0';
// Prefer self-hosted assets (e.g. /public/rdkit) when NEXT_PUBLIC_RDKIT_BASE_URL is set.
// Falls back to the pinned unpkg URL for development convenience.
const RDKIT_BASE = (
    process.env.NEXT_PUBLIC_RDKIT_BASE_URL?.replace(/\/$/, '')
    ?? `https://unpkg.com/@rdkit/rdkit@${RDKIT_VERSION}/dist`
);
const RDKIT_JS_URL = `${RDKIT_BASE}/RDKit_minimal.js`;
const RDKIT_WASM_URL = `${RDKIT_BASE}/RDKit_minimal.wasm`;

let rdkitPromise: Promise<RDKitModule> | null = null;
let scriptPromise: Promise<void> | null = null;

function loadRDKitScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('RDKit can only be loaded in the browser.'));
    }

    if (window.initRDKitModule) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${RDKIT_JS_URL}"]`);
        if (existing) {
            if (window.initRDKitModule || existing.dataset.rdkitStatus === 'loaded') {
                resolve();
                return;
            }
            if (existing.dataset.rdkitStatus === 'error') {
                reject(new Error('Failed to load RDKit script.'));
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load RDKit script.')), { once: true });
            queueMicrotask(() => {
                if (window.initRDKitModule || existing.dataset.rdkitStatus === 'loaded') {
                    resolve();
                } else if (existing.dataset.rdkitStatus === 'error') {
                    reject(new Error('Failed to load RDKit script.'));
                }
            });
            return;
        }

        const script = document.createElement('script');
        script.src = RDKIT_JS_URL;
        script.async = true;
        script.dataset.rdkitStatus = 'loading';
        script.onload = () => {
            script.dataset.rdkitStatus = 'loaded';
            resolve();
        };
        script.onerror = () => {
            script.dataset.rdkitStatus = 'error';
            reject(new Error('Failed to load RDKit script.'));
        };
        document.head.appendChild(script);
    });

    return scriptPromise;
}

export function getRDKit(): Promise<RDKitModule> {
    if (!rdkitPromise) {
        rdkitPromise = loadRDKitScript().then(() => {
            if (!window.initRDKitModule) {
                throw new Error('RDKit script loaded but initRDKitModule is unavailable.');
            }

            return window.initRDKitModule({
                locateFile: (fileName: string) => (fileName.endsWith('.wasm') ? RDKIT_WASM_URL : `${RDKIT_BASE}/${fileName}`),
            });
        });
    }
    return rdkitPromise;
}
