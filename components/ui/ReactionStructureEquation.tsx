'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { getCompoundsForReaction } from '@/lib/api/biochem';
import type { AtomColors } from './MoleculeRenderer';

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

const SUBSCRIPT_MAP: Record<string, string> = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
    '+': '₊',
    '-': '₋',
    '(': '₍',
    ')': '₎',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻',
    '(': '⁽',
    ')': '⁾',
};

function toMappedScript(value: string, map: Record<string, string>): string {
    return value
        .split('')
        .map((ch) => map[ch] ?? ch)
        .join('');
}

function formatChemicalText(value: string): string {
    if (!value) return value;

    let text = value.trim();

    // Normalize any HTML sub/sup tags from legacy synonym strings.
    text = text
        .replace(/<\s*sub\s*>(.*?)<\s*\/\s*sub\s*>/gi, (_, inner: string) => toMappedScript(inner, SUBSCRIPT_MAP))
        .replace(/<\s*sup\s*>(.*?)<\s*\/\s*sup\s*>/gi, (_, inner: string) => toMappedScript(inner, SUPERSCRIPT_MAP))
        .replace(/<[^>]+>/g, '');

    // Convert element-number patterns (H2O, PO4, O3) to Unicode subscripts.
    text = text.replace(/([A-Za-z\)\]])(\d+)/g, (_, prev: string, digits: string) => `${prev}${toMappedScript(digits, SUBSCRIPT_MAP)}`);

    // Convert trailing charge notation e.g. "(2-)" -> "²⁻" and "( - )"/"(+)".
    text = text.replace(/\((\d*[+-]|[+-]\d*)\)\s*$/g, (_, charge: string) => toMappedScript(charge, SUPERSCRIPT_MAP));

    // Convert non-parenthesized trailing charges e.g. H2PO4- or PO43-.
    text = text.replace(/([A-Za-z₀-₉\]\)])(\d*[+-]|[+-]\d*)$/g, (_, stem: string, charge: string) => `${stem}${toMappedScript(charge, SUPERSCRIPT_MAP)}`);

    return text.replace(/\s+/g, ' ').trim();
}

function normalizeSynonyms(rawSynonyms: string[] | undefined): string[] {
    if (!rawSynonyms || rawSynonyms.length === 0) return [];

    const seen = new Set<string>();
    const result: string[] = [];

    for (const raw of rawSynonyms) {
        const formatted = formatChemicalText(raw);
        if (!formatted) continue;
        const dedupeKey = formatted.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        result.push(formatted);
    }

    return result;
}

function CompoundTooltipContent({ compoundId, name, formula, synonyms }: CompoundTooltipProps) {
    const formattedFormula = formula ? formatChemicalText(formula) : undefined;
    const formattedSynonyms = normalizeSynonyms(synonyms);

    return (
        <Box sx={{ p: 0.75, maxWidth: 360 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.35 }}>
                {name ?? compoundId}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mb: 0.3 }}>
                ID: {compoundId}
            </Typography>
            {formattedFormula && (
                <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mb: 0.3 }}>
                    Formula: {formattedFormula}
                </Typography>
            )}
            {formattedSynonyms.length > 0 && (
                <Box sx={{ mt: 0.6 }}>
                    <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mb: 0.35, fontWeight: 700 }}>
                        Synonyms:
                    </Typography>
                    {formattedSynonyms.slice(0, 8).map((syn) => (
                        <Typography key={syn} variant="caption" display="block" sx={{ color: 'text.secondary', lineHeight: 1.45 }}>
                            • {syn}
                        </Typography>
                    ))}
                </Box>
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

const CompoundCard = memo(function CompoundCard({ token, smiles, name, formula, synonyms, atomColors }: CompoundCardProps) {
    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                cursor: 'pointer',
                '&:hover > .cpd-tooltip': {
                    opacity: 1,
                    visibility: 'visible',
                },
                '&:hover .mol-wrapper': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transform: 'translateY(-2px)',
                },
            }}
        >
            {token.stoich && (
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    ({token.stoich})
                </Typography>
            )}

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

            <Link
                href={`/biochem/compounds/${token.id}`}
                style={{ color: '#00acc1', textDecoration: 'none', fontWeight: 500 }}
            >
                <Typography variant="caption">{token.id}</Typography>
            </Link>

            {/* Below image + ID — avoids clipping under the equation row above */}
            <Box
                className="cpd-tooltip"
                sx={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    mt: 1,
                    transform: 'translateX(-50%)',
                    opacity: 0,
                    visibility: 'hidden',
                    transition: 'opacity 0.18s ease-in-out, visibility 0.18s ease-in-out',
                    zIndex: 1500,
                    pointerEvents: 'none',
                    bgcolor: '#ffffff',
                    color: '#1f2937',
                    border: '1px solid #d1d5db',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                    borderRadius: '8px',
                    minWidth: 200,
                    maxWidth: 380,
                    maxHeight: 'min(60vh, 320px)',
                    overflowY: 'auto',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        border: '7px solid transparent',
                        borderBottomColor: '#d1d5db',
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translate(-50%, 1px)',
                        border: '6px solid transparent',
                        borderBottomColor: '#ffffff',
                    },
                }}
            >
                <CompoundTooltipContent
                    compoundId={token.id}
                    name={name}
                    formula={formula}
                    synonyms={synonyms}
                />
            </Box>
        </Box>
    );
});

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

type DisplayData = { name?: string; smiles?: string; formula?: string; synonyms?: string[] };
const EMPTY_PARSED: ParsedEquation = { reactants: [], products: [], arrow: '⇒' };
const EMPTY_MAP = new Map<string, DisplayData>();

export default function ReactionStructureEquation({
    equation,
    reversibility,
    atomMapping,
}: ReactionStructureEquationProps) {
    // All hooks must be called unconditionally before any early return.
    // Previously the early return was before the hooks, which violated
    // Rules of Hooks and caused unpredictable render-loop behavior.
    const parsed = useMemo(
        () => (equation ? parseEquation(equation) : EMPTY_PARSED),
        [equation]
    );

    const arrow = useMemo(() => {
        let a = parsed.arrow;
        if (reversibility === '=' || reversibility === '<=>') a = '⇌';
        else if (reversibility === '>') a = '⇒';
        else if (reversibility === '<') a = '⇐';
        return a;
    }, [parsed.arrow, reversibility]);

    const allIds = useMemo(
        () => [...parsed.reactants.map((t) => t.id), ...parsed.products.map((t) => t.id)],
        [parsed]
    );
    const compoundIdsKey = useMemo(() => [...allIds].sort().join(','), [allIds]);

    const { data: compoundMap, isLoading } = useQuery({
        queryKey: ['reaction-structure-compounds', compoundIdsKey],
        queryFn: () => getCompoundsForReaction(allIds),
        enabled: allIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    // Memoize the display map — creating a new Map() on every render passes
    // new object references into CompoundCard props, triggering continuous
    // re-renders even when the underlying data has not changed.
    const displayMap = useMemo<Map<string, DisplayData>>(() => {
        if (!compoundMap) return EMPTY_MAP;
        const map = new Map<string, DisplayData>();
        for (const [id, cpd] of compoundMap.entries()) {
            const synonymEntry = cpd.aliases?.find((a) => a.startsWith('Name:'));
            const synonyms = synonymEntry
                ? synonymEntry.replace('Name:', '').replace(/"/g, '').split(';').map((s) => s.trim()).filter(Boolean)
                : [];
            map.set(id, {
                name: cpd.name,
                smiles: cpd.smiles,
                formula: cpd.formula,
                synonyms,
            });
        }
        return map;
    }, [compoundMap]);

    // Safe to early-return after all hooks have been called.
    if (!equation) return null;

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
