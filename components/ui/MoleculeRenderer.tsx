'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { getRDKit } from '@/lib/rdkit';
import { getCompoundImageUrl } from '@/lib/api/biochem';
import { applyBondColors, buildMoleculeHighlightPlan, elementInventoryFromMolJson } from '@/lib/utils/moleculeHighlights';

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
    /** Optional per-element color map for RDKit structure highlights */
    elementColors?: Readonly<Record<string, string>>;
    /** Called after a successful RDKit parse with the molecule's element inventory. */
    onInventory?: (inventory: Record<string, number>) => void;
    width?: number;
    height?: number;
    alt?: string;
}

type RenderState = 'loading' | 'svg' | 'png' | 'hidden';

export default function MoleculeRenderer({
    smiles,
    compoundId,
    atomColors,
    elementColors,
    onInventory,
    width = 150,
    height = 150,
    alt,
}: MoleculeRendererProps) {
    const [state, setState] = useState<RenderState>('loading');
    const [svgString, setSvgString] = useState<string>('');
    const atomColorsKey = useMemo(() => JSON.stringify(atomColors ?? {}), [atomColors]);
    const elementColorsKey = useMemo(() => JSON.stringify(elementColors ?? {}), [elementColors]);
    const onInventoryRef = useRef(onInventory);
    const atomColorsRef = useRef(atomColors);
    const elementColorsRef = useRef(elementColors);

    useEffect(() => {
        onInventoryRef.current = onInventory;
        atomColorsRef.current = atomColors;
        elementColorsRef.current = elementColors;
    }, [onInventory, atomColors, elementColors]);

    useEffect(() => {
        let cancelled = false;

        if (!smiles) {
            // No structural string from API; avoid rendering empty/transparent fallback images.
            setState('hidden');
            return;
        }

        getRDKit()
            .then((RDKit) => {
                if (cancelled) return;

                try {
                    const mol = RDKit.get_mol(smiles);
                    try {
                        let svg: string;
                        let molJson: unknown;
                        const currentElementColors = elementColorsRef.current;
                        const currentAtomColors = atomColorsRef.current;
                        if ((currentElementColors && Object.keys(currentElementColors).length > 0) || onInventoryRef.current) {
                            try {
                                molJson = JSON.parse(mol.get_json());
                                onInventoryRef.current?.(elementInventoryFromMolJson(molJson));
                            } catch {
                                molJson = undefined;
                            }
                        }

                        if (currentElementColors && Object.keys(currentElementColors).length > 0) {
                            const plan = molJson
                                ? buildMoleculeHighlightPlan(molJson, currentElementColors)
                                : { atomColors: {}, bondColors: {} };

                            const atomIndices = Object.keys(plan.atomColors).map(Number);
                            if (atomIndices.length > 0) {
                                const highlightColors: Record<number, [number, number, number]> = {};
                                for (const idx of atomIndices) {
                                    // Convert CSS hex color (#rrggbb) to RDKit [r, g, b] floats
                                    const hex = plan.atomColors[idx].replace('#', '');
                                    const r = parseInt(hex.slice(0, 2), 16) / 255;
                                    const g = parseInt(hex.slice(2, 4), 16) / 255;
                                    const b = parseInt(hex.slice(4, 6), 16) / 255;
                                    highlightColors[idx] = [r, g, b];
                                }
                                svg = applyBondColors(mol.get_svg_with_highlights(
                                    JSON.stringify({
                                        atoms: atomIndices,
                                        bonds: [],
                                        highlightAtomColors: highlightColors,
                                        width,
                                        height,
                                    })
                                ), plan.bondColors);
                            } else {
                                svg = mol.get_svg(width, height);
                            }
                        } else if (currentAtomColors && Object.keys(currentAtomColors).length > 0) {
                            const atomIndices = Object.keys(currentAtomColors).map(Number);
                            const highlightColors: Record<number, [number, number, number]> = {};

                            for (const idx of atomIndices) {
                                // Convert CSS hex color (#rrggbb) to RDKit [r, g, b] floats
                                const hex = currentAtomColors[idx].replace('#', '');
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
    }, [smiles, atomColorsKey, elementColorsKey, width, height]);

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
            <Image
                src={getCompoundImageUrl(compoundId)}
                alt={alt ?? `Structure of ${compoundId}`}
                width={width}
                height={height}
                style={{
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
    return (
        <div
            aria-label={`Compound image unavailable for ${compoundId}`}
            style={{
                width,
                height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #cbd5e1',
                borderRadius: 4,
                background: '#f8fafc',
                padding: 8,
                boxSizing: 'border-box',
            }}
        >
            <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textAlign: 'center', lineHeight: 1.3 }}
            >
                Compound image unavailable
            </Typography>
        </div>
    );
}
