'use client';

import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { getCompoundsForReaction } from '@/lib/api/biochem';
import { heavyAtomCount, isParsableFormula, parseFormulaInventory } from '@/lib/utils/chemicalFormula';
import type { AtomMappingPair } from '@/lib/utils/atomMapping';
import {
    buildAtomMappingColorPlan,
    elementColorsForCompound,
    type UnmappableReason,
} from '@/lib/utils/atomMappingColors';
import type { AtomColors } from './MoleculeRenderer';

const MoleculeRenderer = dynamic(() => import('./MoleculeRenderer'), {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" width={150} height={150} sx={{ borderRadius: 1 }} />,
});

export type ReactionAtomMapping = Record<string, AtomColors>;

interface ReactionStructureEquationProps {
    equation?: string;
    reversibility?: string;
    atomMapping?: ReactionAtomMapping;
    /** Parsed atom-mapping pairs for this reaction; enables structural fate colouring. */
    atomMappingPairs?: readonly AtomMappingPair[];
    /** Confidence label from the Solr field, e.g. 'clean' | 'salvaged'. */
    atomMappingConfidence?: string;
    /** True when the source data contained symmetry-equivalent atom groups. */
    atomMappingHasSymmetryGroups?: boolean;
}

interface CompoundToken { id: string; stoich: string; }
interface ParsedEquation { reactants: CompoundToken[]; products: CompoundToken[]; arrow: string; }
type Inventory = Record<string, number>;
type DisplayData = { name?: string; smiles?: string; formula?: string; charge?: number };

const EMPTY_PARSED: ParsedEquation = { reactants: [], products: [], arrow: '⇒' };
const EMPTY_MAP = new Map<string, DisplayData>();
const REASON_TEXT: Record<UnmappableReason, string> = {
    'no-mapping': 'no mapping data',
    'element-mismatch': 'element mismatch between sides',
    'structure-unknown': 'structure unavailable',
    'partial-coverage': 'mapping covers only part of the structure',
    'counterpart-unresolved': 'no matching atoms found on the other side',
};
const compoundLinkStyle = { color: '#00838f', textDecoration: 'none', fontWeight: 600 };

function joinCompoundIds(ids: readonly string[]): string {
    if (ids.length <= 2) return ids.join(' and ');
    return `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}`;
}

function parseEquation(equation: string): ParsedEquation {
    let arrow = '⇒';
    let lhs = equation;
    let rhs = '';
    if (equation.includes('<=>')) { arrow = '⇌'; [lhs, rhs] = equation.split('<=>'); }
    else if (equation.includes('=>')) { [lhs, rhs] = equation.split('=>'); }
    else if (equation.includes('<=')) { arrow = '⇐'; [lhs, rhs] = equation.split('<='); }
    else if (equation.includes('-->')) { [lhs, rhs] = equation.split('-->'); }
    return { reactants: parseSide(lhs ?? ''), products: parseSide(rhs ?? ''), arrow };
}

function parseSide(side: string): CompoundToken[] {
    return side.split('+').map((token) => token.trim()).filter(Boolean).map((token) => {
        const cleaned = token.replace(/\[\w+\]/g, '').trim();
        const stoichMatch = cleaned.match(/^\(?([\d.]+)\)?\s*/);
        const stoich = stoichMatch && stoichMatch[1] !== '1' ? stoichMatch[1] : '';
        const rest = cleaned.replace(/^\(?([\d.]+)\)?\s*/, '').trim();
        const idMatch = rest.match(/cpd\d{5}/);
        return { id: idMatch ? idMatch[0] : rest, stoich };
    }).filter((token) => token.id.startsWith('cpd'));
}

function formatCharge(charge: number | undefined): string {
    if (!charge) return '';
    return `${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}`;
}

function directionText(arrow: string): string {
    if (arrow === '⇌') return 'reversible reaction';
    if (arrow === '⇐') return 'reaction proceeds right to left';
    return 'reaction proceeds left to right';
}

function confidenceColor(value: string): 'success' | 'warning' | 'default' {
    if (value === 'clean') return 'success';
    if (value === 'salvaged') return 'warning';
    return 'default';
}

interface CompoundColumnProps {
    token: CompoundToken;
    data?: DisplayData;
    atomColors?: AtomColors;
    elementColors?: Readonly<Record<string, string>>;
    mappingDescription?: string;
    onInventory: (inventory: Inventory) => void;
    isLoading: boolean;
}

function CompoundColumn({ token, data, atomColors, elementColors, mappingDescription, onInventory, isLoading }: CompoundColumnProps) {
    const drawStructure = Boolean(data?.smiles) && (!data?.formula || !isParsableFormula(data.formula) || heavyAtomCount(data.formula) >= 1);
    const label = data?.name || token.id;
    const metadata = [token.id, data?.formula, formatCharge(data?.charge)].filter(Boolean).join(' · ');
    const contents = isLoading ? (
        <Skeleton variant="rectangular" width={134} height={134} />
    ) : drawStructure ? (
        <MoleculeRenderer
            smiles={data?.smiles}
            compoundId={token.id}
            atomColors={atomColors}
            elementColors={elementColors}
            onInventory={onInventory}
            width={134}
            height={134}
            alt={mappingDescription ? `Structure of ${label}; ${mappingDescription}` : `Structure of ${label}`}
        />
    ) : (
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {label}{formatCharge(data?.charge) && <sup>{formatCharge(data?.charge)}</sup>}
        </Typography>
    );
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, maxWidth: 160, minWidth: 0 }}>
            {token.stoich && <Typography variant="body2" sx={{ fontWeight: 600, pt: 0.5 }}>{token.stoich}</Typography>}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4, minWidth: 0 }}>
                <Tooltip title={mappingDescription ?? ''} disableHoverListener={!mappingDescription}>
                    <Box sx={{ maxWidth: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                        <NextLink href={`/biochem/compounds/${token.id}`} aria-label={`Open ${label}`} style={drawStructure ? undefined : compoundLinkStyle}>{contents}</NextLink>
                    </Box>
                </Tooltip>
                {isLoading ? <Skeleton variant="text" width={100} /> : <NextLink href={`/biochem/compounds/${token.id}`} style={compoundLinkStyle}>
                    <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'center', overflowWrap: 'anywhere' }}>{label}</Typography>
                </NextLink>}
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}>{metadata}</Typography>
                {!isLoading && elementColors && <Box role="group" aria-label={`Mapped elements: ${Object.keys(elementColors).join(', ')}`} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(elementColors).map(([element, color]) => <Box key={element} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Box aria-hidden="true" sx={{ width: 8, height: 8, bgcolor: color, borderRadius: '50%' }} />
                        <Typography variant="caption">{element}</Typography>
                    </Box>)}
                </Box>}
            </Box>
        </Box>
    );
}

function EquationSide({ tokens, displayMap, atomMapping, useElementColors, plan, callbacks, isLoading }: {
    tokens: CompoundToken[]; displayMap: Map<string, DisplayData>;
    atomMapping?: ReactionAtomMapping; useElementColors: boolean; plan: ReturnType<typeof buildAtomMappingColorPlan>;
    callbacks: Readonly<Record<string, (inventory: Inventory) => void>>;
    isLoading: boolean;
}) {
    return <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1.5 }}>
        {tokens.map((token, index) => {
            const elementColors = useElementColors ? elementColorsForCompound(plan, token.id) : undefined;
            const colors = elementColors && Object.keys(elementColors).length > 0 ? elementColors : undefined;
            const descriptions = plan.blocks.filter((block) => block.colorable && block.compoundId === token.id)
                .map((block) => `${block.element} mapped to ${block.counterpartCompoundIds.join(', ')}`);
            return <Box key={`${token.id}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CompoundColumn token={token} data={displayMap.get(token.id)}
                    atomColors={useElementColors ? undefined : atomMapping?.[token.id]} elementColors={colors}
                    mappingDescription={descriptions.join('; ') || undefined} onInventory={callbacks[token.id]} isLoading={isLoading} />
                {index < tokens.length - 1 && <Typography variant="h6" aria-hidden="true" sx={{ color: 'text.secondary', fontWeight: 400 }}>+</Typography>}
            </Box>;
        })}
    </Box>;
}

export default function ReactionStructureEquation({ equation, reversibility, atomMapping, atomMappingPairs, atomMappingConfidence, atomMappingHasSymmetryGroups }: ReactionStructureEquationProps) {
    const parsed = useMemo(() => equation ? parseEquation(equation) : EMPTY_PARSED, [equation]);
    const arrow = useMemo(() => {
        if (reversibility === '=' || reversibility === '<=>') return '⇌';
        if (reversibility === '>') return '⇒';
        if (reversibility === '<') return '⇐';
        return parsed.arrow;
    }, [parsed.arrow, reversibility]);
    const allIds = useMemo(() => [...parsed.reactants, ...parsed.products].map((token) => token.id), [parsed]);
    const uniqueCompoundIds = useMemo(() => Array.from(new Set(allIds)), [allIds]);
    const compoundIdsKey = useMemo(() => [...uniqueCompoundIds].sort().join(','), [uniqueCompoundIds]);
    const { data: compoundMap, error, isLoading } = useQuery({
        queryKey: ['reaction-structure-compounds', compoundIdsKey], queryFn: () => getCompoundsForReaction(uniqueCompoundIds),
        enabled: uniqueCompoundIds.length > 0, staleTime: 5 * 60 * 1000,
    });
    const displayMap = useMemo<Map<string, DisplayData>>(() => {
        if (!compoundMap) return EMPTY_MAP;
        return new Map(Array.from(compoundMap.entries(), ([id, compound]) => [id, {
            name: compound.name, smiles: compound.smiles, formula: compound.formula, charge: compound.charge,
        }]));
    }, [compoundMap]);
    const [inventories, setInventories] = useState<Record<string, Inventory>>({});
    const saveInventory = useCallback((compoundId: string, inventory: Inventory) => {
        setInventories((previous) => JSON.stringify(previous[compoundId] ?? {}) === JSON.stringify(inventory)
            ? previous : { ...previous, [compoundId]: inventory });
    }, []);
    const inventoryCallbacks = useMemo(() => Object.fromEntries(uniqueCompoundIds.map((id) => [id, (inventory: Inventory) => saveInventory(id, inventory)])), [uniqueCompoundIds, saveInventory]);
    const pairs = useMemo(() => atomMappingPairs ?? [], [atomMappingPairs]);
    const useElementColors = pairs.length > 0;
    const inventoriesForPlan = useMemo(() => {
        const seeded = Object.fromEntries(Array.from(displayMap.entries()).flatMap(([id, data]) => {
            const inventory = parseFormulaInventory(data.formula);
            return Object.keys(inventory).length > 0 ? [[id, inventory]] : [];
        }));
        return { ...seeded, ...inventories };
    }, [displayMap, inventories]);
    const plan = useMemo(() => buildAtomMappingColorPlan(pairs, inventoriesForPlan), [pairs, inventoriesForPlan]);
    const reasons = useMemo(() => Array.from(new Set(plan.unmappable.map((block) => block.reason).filter((reason): reason is UnmappableReason => Boolean(reason)))).map((reason) => REASON_TEXT[reason]), [plan]);

    if (!equation) return null;

    return <Box>
        <Box aria-label={`Chemical equation: ${directionText(arrow)}`} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2, py: 1 }}>
            <EquationSide tokens={parsed.reactants} displayMap={displayMap} atomMapping={atomMapping} useElementColors={useElementColors && !isLoading} plan={plan} callbacks={inventoryCallbacks} isLoading={isLoading} />
            <Typography variant="h5" aria-hidden="true" sx={{ color: 'text.primary', fontWeight: 300, flexShrink: 0, px: 1, userSelect: 'none' }}>{arrow}</Typography>
            <EquationSide tokens={parsed.products} displayMap={displayMap} atomMapping={atomMapping} useElementColors={useElementColors && !isLoading} plan={plan} callbacks={inventoryCallbacks} isLoading={isLoading} />
        </Box>
        {error && <Typography variant="caption" color="text.secondary">Compound details could not be loaded.</Typography>}
        {useElementColors && !isLoading && <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {(plan.colorableCount > 0 || atomMappingConfidence || atomMappingHasSymmetryGroups) && <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {plan.colorableCount > 0 && <Typography variant="body2" sx={{ fontWeight: 600 }}>Atom mapping</Typography>}
                {atomMappingConfidence && <Chip size="small" label={atomMappingConfidence} color={confidenceColor(atomMappingConfidence)} />}
                {atomMappingHasSymmetryGroups && <Typography variant="caption" color="text.secondary">A grouped mapping resolves to any one member of a set of symmetry-equivalent atoms, so the specific atom is not determined.</Typography>}
            </Box>}
            {plan.colorableCount > 0 && <Box component="ul" aria-label="Atom mapping legend" sx={{ m: 0, pl: 2.5 }}>
                {plan.legend.map((entry) => <Box component="li" key={entry.groupId} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box aria-hidden="true" sx={{ width: 12, height: 12, bgcolor: entry.color, borderRadius: '50%' }} />
                    <Typography variant="caption">{entry.element}: {entry.kind === 'one-to-one' ? entry.compoundIds.join(' and ') : `${joinCompoundIds(entry.compoundIds)} — grouped; individual atom pairing is not determined by the data`}{entry.uncoloredCompoundIds.length > 0 && ` (not coloured: ${joinCompoundIds(entry.uncoloredCompoundIds)})`}</Typography>
                </Box>)}
            </Box>}
            {reasons.length > 0 && <Typography variant="caption" color="text.secondary">Some atoms could not be unambiguously mapped and therefore are not coloured: {reasons.join('; ')}.</Typography>}
        </Box>}
    </Box>;
}
