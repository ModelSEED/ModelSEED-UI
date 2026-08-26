'use client';

import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { getCompoundsForReaction } from '@/lib/api/biochem';
import { getStructuresByIds, type CompoundStructure } from '@/lib/api/structures';
import { heavyAtomCount, isParsableFormula } from '@/lib/utils/chemicalFormula';
import type { AtomMappingPair } from '@/lib/utils/atomMapping';
import {
} from '@/lib/utils/atomMappingColors';
import { buildAtomOrbitColorPlan, compoundColorResult } from '@/lib/utils/atomOrbitColors';
import type { HeavyAtomGraph } from '@/lib/utils/inchiAtomOrder';
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
const EMPTY_STRUCTURES = new Map<string, CompoundStructure>();
const compoundLinkStyle = { color: '#00838f', textDecoration: 'none', fontWeight: 600 };
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

interface CompoundColumnProps {
    token: CompoundToken;
    data?: DisplayData;
    structure?: CompoundStructure;
    atomColors?: AtomColors;
    bondColors?: Record<number, string>;
    showAllAtomLabels?: boolean;
    onInventory: (inventory: Inventory) => void;
    onGraph: (graph: HeavyAtomGraph) => void;
    isLoading: boolean;
}

function CompoundColumn({ token, data, structure, atomColors, bondColors, showAllAtomLabels, onInventory, onGraph, isLoading }: CompoundColumnProps) {
    const smiles = data?.smiles ?? structure?.smiles;
    const drawStructure = Boolean(structure?.svg) || (Boolean(smiles) && (!data?.formula || !isParsableFormula(data.formula) || heavyAtomCount(data.formula) >= 1));
    const label = data?.name || token.id;
    const metadata = token.id;
    const accessibleDescription = [
        data?.formula && `Formula ${data.formula}`,
        formatCharge(data?.charge) && `charge ${formatCharge(data?.charge)}`,
    ].filter(Boolean).join(' · ');
    const contents = isLoading ? (
        <Skeleton variant="rectangular" width={134} height={134} />
    ) : drawStructure ? (
        <MoleculeRenderer
            smiles={smiles}
            compoundId={token.id}
            atomColors={atomColors}
            bondColors={bondColors}
            showAllAtomLabels={showAllAtomLabels}
            fallbackSvg={structure?.svg}
            onInventory={onInventory}
            onGraph={onGraph}
            width={134}
            height={134}
            alt={accessibleDescription ? `Structure of ${label}; ${accessibleDescription}` : `Structure of ${label}`}
        />
    ) : (
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {label}{formatCharge(data?.charge) && <sup>{formatCharge(data?.charge)}</sup>}
        </Typography>
    );
    return (
        <Box data-mapping-token={token.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, maxWidth: 160, minWidth: 0 }}>
            {token.stoich && <Typography variant="body2" sx={{ fontWeight: 600, pt: 0.5 }}>{token.stoich}</Typography>}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4, minWidth: 0 }}>
                <Box sx={{ maxWidth: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                    <NextLink href={`/biochem/compounds/${token.id}`} aria-label={accessibleDescription ? `Open ${label}; ${accessibleDescription}` : `Open ${label}`} style={drawStructure ? undefined : compoundLinkStyle}>{contents}</NextLink>
                </Box>
                {isLoading ? <Skeleton variant="text" width={100} /> : <NextLink href={`/biochem/compounds/${token.id}`} style={compoundLinkStyle}>
                    <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'center', overflowWrap: 'anywhere' }}>{label}</Typography>
                </NextLink>}
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}>{metadata}</Typography>
            </Box>
        </Box>
    );
}

function EquationSide({ tokens, displayMap, structures, atomMapping, useOrbitColors, orbitPlan, callbacks, graphCallbacks, isLoading }: {
    tokens: CompoundToken[]; displayMap: Map<string, DisplayData>; structures: Map<string, CompoundStructure>;
    atomMapping?: ReactionAtomMapping; useOrbitColors: boolean; orbitPlan: ReturnType<typeof buildAtomOrbitColorPlan>;
    callbacks: Readonly<Record<string, (inventory: Inventory) => void>>; graphCallbacks: Readonly<Record<string, (graph: HeavyAtomGraph) => void>>;
    isLoading: boolean;
}) {
    return <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1.5 }}>
        {tokens.map((token, index) => {
            const orbitColors = compoundColorResult(orbitPlan, token.id);
            return <Box key={`${token.id}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CompoundColumn token={token} data={displayMap.get(token.id)} structure={structures.get(token.id)}
                    atomColors={useOrbitColors ? orbitColors.atomColors : atomMapping?.[token.id]} bondColors={useOrbitColors ? orbitColors.bondColors : undefined} showAllAtomLabels
                    onInventory={callbacks[token.id]} onGraph={graphCallbacks[token.id]} isLoading={isLoading} />
                {index < tokens.length - 1 && <Typography variant="h6" aria-hidden="true" sx={{ color: 'text.secondary', fontWeight: 400 }}>+</Typography>}
            </Box>;
        })}
    </Box>;
}

export default function ReactionStructureEquation({ equation, reversibility, atomMapping, atomMappingPairs }: ReactionStructureEquationProps) {
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
    const { data: structureMap, error: structureError, isLoading: structuresLoading } = useQuery({
        queryKey: ['reaction-structure-structures', compoundIdsKey], queryFn: () => getStructuresByIds(uniqueCompoundIds),
        enabled: uniqueCompoundIds.length > 0, staleTime: 5 * 60 * 1000,
    });
    const structures = structureMap ?? EMPTY_STRUCTURES;
    const displayMap = useMemo<Map<string, DisplayData>>(() => {
        if (!compoundMap) return EMPTY_MAP;
        return new Map(Array.from(compoundMap.entries(), ([id, compound]) => [id, {
            name: compound.name, smiles: compound.smiles, formula: compound.formula, charge: compound.charge,
        }]));
    }, [compoundMap]);
    const saveInventory = useCallback((_compoundId: string, _inventory: Inventory) => { void _compoundId; void _inventory; }, []);
    const inventoryCallbacks = useMemo(() => Object.fromEntries(uniqueCompoundIds.map((id) => [id, (inventory: Inventory) => saveInventory(id, inventory)])), [uniqueCompoundIds, saveInventory]);
    const [graphs, setGraphs] = useState<Record<string, HeavyAtomGraph>>({});
    const saveGraph = useCallback((compoundId: string, graph: HeavyAtomGraph) => {
        setGraphs((previous) => {
            const existing = previous[compoundId];
            return existing && existing.elements.length === graph.elements.length && existing.bonds.length === graph.bonds.length
                ? previous : { ...previous, [compoundId]: graph };
        });
    }, []);
    const graphCallbacks = useMemo(() => Object.fromEntries(uniqueCompoundIds.map((id) => [id, (graph: HeavyAtomGraph) => saveGraph(id, graph)])), [uniqueCompoundIds, saveGraph]);
    const pairs = useMemo(() => atomMappingPairs ?? [], [atomMappingPairs]);
    const useOrbitColors = pairs.length > 0;
    const orbitPlan = useMemo(() => buildAtomOrbitColorPlan(pairs, uniqueCompoundIds.map((compoundId) => ({
        compoundId, inchi: structures.get(compoundId)?.inchi, graph: graphs[compoundId],
    }))), [pairs, structures, graphs, uniqueCompoundIds]);

    if (!equation) return null;

    return <Box>
        <Box aria-label={`Chemical equation: ${directionText(arrow)}`} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2, py: 1 }}>
            <EquationSide tokens={parsed.reactants} displayMap={displayMap} structures={structures} atomMapping={atomMapping} useOrbitColors={useOrbitColors && !isLoading && !structuresLoading} orbitPlan={orbitPlan} callbacks={inventoryCallbacks} graphCallbacks={graphCallbacks} isLoading={isLoading} />
            <Typography variant="h5" aria-hidden="true" sx={{ color: 'text.primary', fontWeight: 300, flexShrink: 0, px: 1, userSelect: 'none' }}>{arrow}</Typography>
            <EquationSide tokens={parsed.products} displayMap={displayMap} structures={structures} atomMapping={atomMapping} useOrbitColors={useOrbitColors && !isLoading && !structuresLoading} orbitPlan={orbitPlan} callbacks={inventoryCallbacks} graphCallbacks={graphCallbacks} isLoading={isLoading} />
        </Box>
        {error && <Typography variant="caption" color="text.secondary">Compound details could not be loaded.</Typography>}

        {structureError && <Typography role="status" variant="caption" color="text.secondary">Structure data could not be loaded, so atom-level mapping precision is unavailable and any colours shown are element-level at best.</Typography>}
    </Box>;
}
