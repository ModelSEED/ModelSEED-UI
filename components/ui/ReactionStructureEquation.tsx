'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import { getCompoundsForReaction } from '@/lib/api/biochem';
import type { AtomColors } from './MoleculeRenderer';

/**
 * MoleculeRenderer is WASM-based. Wrap with ssr:false so Next.js never
 * attempts to render it on the server.
 */
const MoleculeRenderer = dynamic(() => import('./MoleculeRenderer'), {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" width={150} height={150} sx={{ borderRadius: 1 }} />,
});

/* ─── Types ──────────────────────────────────────────────────── */

/**
 * Future atom-mapping data shape.
 * Key is compound ID, value maps atom index → CSS color string.
 * Pass this prop once atom-mapping data is available.
 */
export type ReactionAtomMapping = Record<string, AtomColors>;

interface ReactionStructureEquationProps {
    /** Raw equation string e.g. "(2) cpd00001[c] + cpd00012[c] => cpd00009[c] + cpd00067[c]" */
    equation?: string;
    /** Reaction reversibility field from Solr ("=", "<=>", "=>", etc.) */
    reversibility?: string;
    /** Optional atom-mapping overlay data — not yet available, reserved for summer integration */
    atomMapping?: ReactionAtomMapping;
}

/* ─── Equation Parser ────────────────────────────────────────── */

interface CompoundToken {
    id: string;
    stoich: string;
}

interface ParsedEquation {
    reactants: CompoundToken[];
    products: CompoundToken[];
    arrow: string;
}

function parseEquation(equation: string): ParsedEquation {
    // Determine arrow type and split
    let arrow = '⇒';
    let lhs = equation;
    let rhs = '';

    if (equation.includes('<=>')) {
        arrow = '⇌';
        [lhs, rhs] = equation.split('<=>');
    } else if (equation.includes('=>')) {
        arrow = '⇒';
        [lhs, rhs] = equation.split('=>');
    } else if (equation.includes('<=')) {
        arrow = '⇐';
        [lhs, rhs] = equation.split('<=');
    } else if (equation.includes('-->')) {
        arrow = '⇒';
        [lhs, rhs] = equation.split('-->');
    }

    return {
        reactants: parseSide(lhs ?? ''),
        products: parseSide(rhs ?? ''),
        arrow,
    };
}

function parseSide(side: string): CompoundToken[] {
    return side
        .split('+')
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => {
            // Remove compartment brackets e.g. [c], [0]
            const cleaned = token.replace(/\[\w+\]/g, '').trim();

            // Extract leading stoichiometry e.g. "(2)" or "2 "
            const stoichMatch = cleaned.match(/^\(?([\d.]+)\)?\s*/);
            const stoich = stoichMatch && stoichMatch[1] !== '1' ? stoichMatch[1] : '';
            const rest = cleaned.replace(/^\(?([\d.]+)\)?\s*/, '').trim();

            const idMatch = rest.match(/cpd\d{5}/);
            const id = idMatch ? idMatch[0] : rest;

            return { id, stoich };
        })
        .filter((t) => t.id.startsWith('cpd'));
}

/* ─── Tooltip Content ────────────────────────────────────────── */

interface CompoundTooltipProps {
    compoundId: string;
    name?: string;
    formula?: string;
    synonyms?: string[];
}

function CompoundTooltipContent({ compoundId, name, formula, synonyms }: CompoundTooltipProps) {
    return (
        <Box sx={{ p: 0.5, maxWidth: 280 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                {name ?? compoundId}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mb: 0.25 }}>
                ID: {compoundId}
            </Typography>
            {formula && (
                <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mb: 0.25 }}>
                    Formula: {formula}
                </Typography>
            )}
            {synonyms && synonyms.length > 0 && (
                <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                    Synonyms: {synonyms.slice(0, 5).join(', ')}
                </Typography>
            )}
        </Box>
    );
}

/* ─── Compound Card ──────────────────────────────────────────── */

interface CompoundCardProps {
    token: CompoundToken;
    smiles?: string;
    name?: string;
    formula?: string;
    synonyms?: string[];
    atomColors?: AtomColors;
}

function CompoundCard({ token, smiles, name, formula, synonyms, atomColors }: CompoundCardProps) {
    return (
        <Tooltip
            title={
                <CompoundTooltipContent
                    compoundId={token.id}
                    name={name}
                    formula={formula}
                    synonyms={synonyms}
                />
            }
            arrow
            placement="top"
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.75,
                    cursor: 'pointer',
                    '&:hover .mol-wrapper': {
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease',
                    },
                }}
            >
                {/* Stoichiometry prefix */}
                {token.stoich && (
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        ({token.stoich})
                    </Typography>
                )}

                {/* Structure image */}
                <Link href={`/biochem/compounds/${token.id}`} style={{ textDecoration: 'none' }}>
                    <Box
                        className="mol-wrapper"
                        sx={{
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            p: 1,
                            background: '#fff',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 150,
                            height: 150,
                            overflow: 'hidden',
                        }}
                    >
                        <MoleculeRenderer
                            smiles={smiles}
                            compoundId={token.id}
                            atomColors={atomColors}
                            width={134}
                            height={134}
                        />
                    </Box>
                </Link>

                {/* Compound ID link */}
                <Link
                    href={`/biochem/compounds/${token.id}`}
                    style={{ color: '#00acc1', textDecoration: 'none', fontWeight: 500 }}
                >
                    <Typography variant="caption">{token.id}</Typography>
                </Link>
            </Box>
        </Tooltip>
    );
}

/* ─── Side (reactants or products) ──────────────────────────── */

function EquationSide({
    tokens,
    compoundMap,
    atomMapping,
}: {
    tokens: CompoundToken[];
    compoundMap: Map<string, { name?: string; smiles?: string; formula?: string; synonyms?: string[] }>;
    atomMapping?: ReactionAtomMapping;
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {tokens.map((token, idx) => {
                const data = compoundMap.get(token.id);
                return (
                    <Box key={token.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CompoundCard
                            token={token}
                            smiles={data?.smiles}
                            name={data?.name}
                            formula={data?.formula}
                            synonyms={data?.synonyms}
                            atomColors={atomMapping?.[token.id]}
                        />
                        {idx < tokens.length - 1 && (
                            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                                +
                            </Typography>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function ReactionStructureEquation({
    equation,
    reversibility,
    atomMapping,
}: ReactionStructureEquationProps) {
    if (!equation) return null;

    const parsed = parseEquation(equation);

    // Determine arrow — prefer explicit reversibility field if available
    let arrow = parsed.arrow;
    if (reversibility) {
        if (reversibility === '=' || reversibility === '<=>') arrow = '⇌';
        else if (reversibility === '>') arrow = '⇒';
        else if (reversibility === '<') arrow = '⇐';
    }

    const allIds = [
        ...parsed.reactants.map((t) => t.id),
        ...parsed.products.map((t) => t.id),
    ];

    const { data: compoundMap, isLoading } = useQuery({
        queryKey: ['reaction-structure-compounds', allIds.sort().join(',')],
        queryFn: () => getCompoundsForReaction(allIds),
        enabled: allIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    // Build a display-ready map with synonym extraction
    type DisplayData = { name?: string; smiles?: string; formula?: string; synonyms?: string[] };
    const displayMap = new Map<string, DisplayData>();

    if (compoundMap) {
        for (const [id, cpd] of compoundMap.entries()) {
            const synonymEntry = cpd.aliases?.find((a) => a.startsWith('Name:'));
            const synonyms = synonymEntry
                ? synonymEntry.replace('Name:', '').replace(/"/g, '').split(';').map((s) => s.trim()).filter(Boolean)
                : [];
            displayMap.set(id, {
                name: cpd.name,
                smiles: cpd.smiles,
                formula: cpd.formula,
                synonyms,
            });
        }
    }

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 1 }}>
                {allIds.map((id) => (
                    <Skeleton key={id} variant="rectangular" width={150} height={150} sx={{ borderRadius: 1 }} />
                ))}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
                py: 1,
                overflowX: 'auto',
            }}
        >
            {/* Reactants */}
            <EquationSide
                tokens={parsed.reactants}
                compoundMap={displayMap}
                atomMapping={atomMapping}
            />

            {/* Arrow */}
            <Typography
                variant="h5"
                sx={{
                    color: 'text.primary',
                    fontWeight: 300,
                    flexShrink: 0,
                    px: 1,
                    userSelect: 'none',
                }}
            >
                {arrow}
            </Typography>

            {/* Products */}
            <EquationSide
                tokens={parsed.products}
                compoundMap={displayMap}
                atomMapping={atomMapping}
            />
        </Box>
    );
}
