'use client';

import { useEffect, useMemo, useState } from 'react';
import Skeleton from '@mui/material/Skeleton';
import { getRDKit } from '@/lib/rdkit';
import { getCompoundImageUrl } from '@/lib/api/biochem';

/**
 * Maps atom index (0-based) to a CSS color string.
 * Used for atom-mapping overlays once mapping data is available.
 */
export type AtomColors = Record<number, string>;

interface MoleculeRendererProps {
    /** SMILES string to render dynamically via RDKit.js */
    smiles?: string;
    /** Compound ID used for the PNG fallback (CPD_IMG_BASE/{id}.png) */
    compoundId: string;
    /** Optional per-atom color map for atom-mapping overlays */
    atomColors?: AtomColors;
    width?: number;
    height?: number;
    alt?: string;
}

type RenderState = 'loading' | 'svg' | 'png' | 'hidden';

export default function MoleculeRenderer({
    smiles,
    compoundId,
    atomColors,
    width = 150,
    height = 150,
    alt,
}: MoleculeRendererProps) {
    const [state, setState] = useState<RenderState>('loading');
    const [svgString, setSvgString] = useState<string>('');
    const atomColorsKey = useMemo(() => JSON.stringify(atomColors ?? {}), [atomColors]);

    useEffect(() => {
        let cancelled = false;

        if (!smiles) {
            setState('png');
            return;
        }

        getRDKit()
            .then((RDKit) => {
                if (cancelled) return;

                try {
                    const mol = RDKit.get_mol(smiles);
                    try {
                        let svg: string;

                        if (atomColors && Object.keys(atomColors).length > 0) {
                            const atomIndices = Object.keys(atomColors).map(Number);
                            const highlightColors: Record<number, [number, number, number]> = {};

                            for (const idx of atomIndices) {
                                // Convert CSS hex color (#rrggbb) to RDKit [r, g, b] floats
                                const hex = atomColors[idx].replace('#', '');
                                const r = parseInt(hex.slice(0, 2), 16) / 255;
                                const g = parseInt(hex.slice(2, 4), 16) / 255;
                                const b = parseInt(hex.slice(4, 6), 16) / 255;
                                highlightColors[idx] = [r, g, b];
                            }

                            svg = mol.get_svg_with_highlights(
                                JSON.stringify({
                                    atoms: atomIndices,
                                    bonds: [],
                                    highlightAtomColors: highlightColors,
                                    width,
                                    height,
                                })
                            );
                        } else {
                            svg = mol.get_svg(width, height);
                        }

                        if (!cancelled) {
                            setSvgString(svg);
                            setState('svg');
                        }
                    } finally {
                        // Always free WASM heap memory immediately after extracting the SVG string
                        mol.delete();
                    }
                } catch {
                    // Invalid SMILES or RDKit error — fall back to CDN PNG silently
                    if (!cancelled) setState('png');
                }
            })
            .catch(() => {
                if (!cancelled) setState('png');
            });

        return () => {
            cancelled = true;
        };
    }, [smiles, atomColorsKey, width, height]);

    if (state === 'loading') {
        return (
            <Skeleton
                variant="rectangular"
                width={width}
                height={height}
                sx={{ borderRadius: 1 }}
            />
        );
    }

    if (state === 'svg') {
        const svgLabel = alt ?? `Structure of ${compoundId}`;
        return (
            <div
                role="img"
                aria-label={svgLabel}
                dangerouslySetInnerHTML={{ __html: svgString }}
                style={{
                    width,
                    height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            />
        );
    }

    if (state === 'png') {
        return (
            <img
                src={getCompoundImageUrl(compoundId)}
                alt={alt ?? `Structure of ${compoundId}`}
                style={{
                    width,
                    height,
                    objectFit: 'contain',
                    border: '1px solid #e0e0e0',
                    borderRadius: 4,
                    padding: 4,
                    background: '#fff',
                }}
                onError={() => setState('hidden')}
            />
        );
    }

    // state === 'hidden': no structure available at all
    return null;
}
