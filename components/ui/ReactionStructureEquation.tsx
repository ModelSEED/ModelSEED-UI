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
import { getStructuresByIds, type CompoundStructure } from '@/lib/api/structures';
import { heavyAtomCount, isParsableFormula, parseFormulaInventory } from '@/lib/utils/chemicalFormula';
import type { AtomMappingPair } from '@/lib/utils/atomMapping';
import {
    buildAtomMappingColorPlan,
    elementColorsForCompound,
    type UnmappableReason,
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
    structure?: CompoundStructure;
    atomColors?: AtomColors;
    bondColors?: Record<number, string>;
    elementColors?: Readonly<Record<string, string>>;
    mappingDescription?: string;
    mappingControls?: Readonly<Record<string, { groupId: string; color: string }>>;
    highlightedGroup?: string;
    onHighlight: (groupId: string) => void;
    onClearHighlight: () => void;
    onSelectGroup: (groupId: string) => void;
    onInventory: (inventory: Inventory) => void;
    onGraph: (graph: HeavyAtomGraph) => void;
    isLoading: boolean;
}

function CompoundColumn({ token, data, structure, atomColors, bondColors, elementColors, mappingDescription, mappingControls, highlightedGroup, onHighlight, onClearHighlight, onSelectGroup, onInventory, onGraph, isLoading }: CompoundColumnProps) {
    const smiles = data?.smiles ?? structure?.smiles;
    const drawStructure = Boolean(structure?.svg) || (Boolean(smiles) && (!data?.formula || !isParsableFormula(data.formula) || heavyAtomCount(data.formula) >= 1));
    const label = data?.name || token.id;
    const metadata = [token.id, data?.formula, formatCharge(data?.charge)].filter(Boolean).join(' · ');
    const contents = isLoading ? (
        <Skeleton variant="rectangular" width={134} height={134} />
    ) : drawStructure ? (
        <MoleculeRenderer
            smiles={smiles}
            compoundId={token.id}
            atomColors={atomColors}
            bondColors={bondColors}
            elementColors={elementColors}
            fallbackSvg={structure?.svg}
            onInventory={onInventory}
            onGraph={onGraph}
            width={134}
            height={134}
            alt={mappingDescription ? `Structure of ${label}; ${mappingDescription}` : `Structure of ${label}`}
        />
    ) : (
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {label}{formatCharge(data?.charge) && <sup>{formatCharge(data?.charge)}</sup>}
        </Typography>
    );
    const isMember = Boolean(highlightedGroup && Object.values(mappingControls ?? {}).some((control) => control.groupId === highlightedGroup));
    const isDimmed = Boolean(highlightedGroup && !isMember);
    const highlightColor = isMember ? Object.values(mappingControls ?? {}).find((control) => control.groupId === highlightedGroup)?.color : undefined;
    return (
        <Box data-mapping-token={token.id} data-mapping-dimmed={isDimmed ? 'true' : 'false'} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, maxWidth: 160, minWidth: 0, ...(highlightedGroup ? { opacity: isDimmed ? 0.4 : 1, outline: isMember ? `2px solid ${highlightColor}` : undefined, borderRadius: isMember ? 0.5 : undefined } : {}) }}>
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
                {!isLoading && Object.keys(mappingControls ?? {}).length > 0 && <Box role="group" aria-label={`Mapped elements: ${Object.keys(mappingControls ?? {}).join(', ')}`} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(mappingControls ?? {}).map(([element, control]) => {
                        const color = control.color;
                        return <Box key={element} component="button" type="button" data-mapping-group={control.groupId} aria-label={`Highlight ${element} mapping group`} onClick={() => onSelectGroup(control.groupId)} onMouseEnter={() => onHighlight(control.groupId)} onMouseLeave={onClearHighlight} onFocus={() => onHighlight(control.groupId)} onBlur={onClearHighlight} sx={{ display: 'flex', alignItems: 'center', gap: 0.25, border: 0, bgcolor: 'transparent', p: 0, cursor: 'pointer', font: 'inherit' }}>
                            <Box aria-hidden="true" sx={{ width: 8, height: 8, bgcolor: color, borderRadius: '50%' }} />
                            <Typography variant="caption">{element}</Typography>
                        </Box>;
                    })}
                </Box>}
            </Box>
        </Box>
    );
}

function EquationSide({ tokens, displayMap, structures, atomMapping, useElementColors, plan, orbitPlan, callbacks, graphCallbacks, isLoading, highlightedGroup, onHighlight, onClearHighlight, onSelectGroup }: {
    tokens: CompoundToken[]; displayMap: Map<string, DisplayData>; structures: Map<string, CompoundStructure>;
    atomMapping?: ReactionAtomMapping; useElementColors: boolean; plan: ReturnType<typeof buildAtomMappingColorPlan>; orbitPlan: ReturnType<typeof buildAtomOrbitColorPlan>;
    callbacks: Readonly<Record<string, (inventory: Inventory) => void>>; graphCallbacks: Readonly<Record<string, (graph: HeavyAtomGraph) => void>>;
    isLoading: boolean; highlightedGroup?: string; onHighlight: (groupId: string) => void; onClearHighlight: () => void; onSelectGroup: (groupId: string) => void;
}) {
    return <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1.5 }}>
        {tokens.map((token, index) => {
            const elementColors = useElementColors ? elementColorsForCompound(plan, token.id) : undefined;
            const colors = elementColors && Object.keys(elementColors).length > 0 ? elementColors : undefined;
            const orbitColors = compoundColorResult(orbitPlan, token.id);
            const tokenBlocks = plan.blocks.filter((block) => block.colorable && block.compoundId === token.id);
            const mappingControls = Object.fromEntries(tokenBlocks.filter((block): block is typeof block & { groupId: string; color: string } => Boolean(block.groupId && block.color)).map((block) => [block.element, { groupId: block.groupId, color: block.color }]));
            const descriptions = tokenBlocks.map((block) => `${block.element} mapped to ${block.counterpartCompoundIds.join(', ')}`);
            return <Box key={`${token.id}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CompoundColumn token={token} data={displayMap.get(token.id)} structure={structures.get(token.id)}
                    atomColors={useElementColors ? orbitColors.atomColors : atomMapping?.[token.id]} bondColors={useElementColors ? orbitColors.bondColors : undefined} elementColors={useElementColors ? undefined : colors}
                    mappingDescription={descriptions.join('; ') || undefined} mappingControls={mappingControls} highlightedGroup={highlightedGroup} onHighlight={onHighlight} onClearHighlight={onClearHighlight} onSelectGroup={onSelectGroup} onInventory={callbacks[token.id]} onGraph={graphCallbacks[token.id]} isLoading={isLoading} />
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
    const { data: structureMap } = useQuery({
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
    const [inventories, setInventories] = useState<Record<string, Inventory>>({});
    const saveInventory = useCallback((compoundId: string, inventory: Inventory) => {
        setInventories((previous) => JSON.stringify(previous[compoundId] ?? {}) === JSON.stringify(inventory)
            ? previous : { ...previous, [compoundId]: inventory });
    }, []);
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
    const useElementColors = pairs.length > 0;
    const inventoriesForPlan = useMemo(() => {
        const seeded = Object.fromEntries(Array.from(displayMap.entries()).flatMap(([id, data]) => {
            const drawStructure = Boolean(data.smiles) && (!data.formula || !isParsableFormula(data.formula) || heavyAtomCount(data.formula) >= 1);
            // structureAtomCount is the colour-safety gate; formula/SMILES disagreement must not assert coverage before RDKit reports it.
            const inventory = drawStructure ? {} : parseFormulaInventory(data.formula);
            return Object.keys(inventory).length > 0 ? [[id, inventory]] : [];
        }));
        return { ...seeded, ...inventories };
    }, [displayMap, inventories]);
    const plan = useMemo(() => buildAtomMappingColorPlan(pairs, inventoriesForPlan), [pairs, inventoriesForPlan]);
    const orbitPlan = useMemo(() => buildAtomOrbitColorPlan(pairs, uniqueCompoundIds.map((compoundId) => ({
        compoundId, inchi: structures.get(compoundId)?.inchi, graph: graphs[compoundId],
    }))), [pairs, structures, graphs, uniqueCompoundIds]);
    const [selectedGroup, setSelectedGroup] = useState<string>();
    const [hoveredGroup, setHoveredGroup] = useState<string>();
    const highlightedGroup = selectedGroup ?? hoveredGroup;
    const selectGroup = useCallback((groupId: string) => setSelectedGroup((previous) => previous === groupId ? undefined : groupId), []);
    const reasons = useMemo(() => Array.from(new Set(plan.unmappable.map((block) => block.reason).filter((reason): reason is UnmappableReason => Boolean(reason)))).map((reason) => REASON_TEXT[reason]), [plan]);

    if (!equation) return null;

    return <Box onKeyDown={(event) => { if (event.key === 'Escape') setSelectedGroup(undefined); }}>
        <Box aria-label={`Chemical equation: ${directionText(arrow)}`} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2, py: 1 }}>
            <EquationSide tokens={parsed.reactants} displayMap={displayMap} structures={structures} atomMapping={atomMapping} useElementColors={useElementColors && !isLoading} plan={plan} orbitPlan={orbitPlan} callbacks={inventoryCallbacks} graphCallbacks={graphCallbacks} isLoading={isLoading} highlightedGroup={highlightedGroup} onHighlight={setHoveredGroup} onClearHighlight={() => setHoveredGroup(undefined)} onSelectGroup={selectGroup} />
            <Typography variant="h5" aria-hidden="true" sx={{ color: 'text.primary', fontWeight: 300, flexShrink: 0, px: 1, userSelect: 'none' }}>{arrow}</Typography>
            <EquationSide tokens={parsed.products} displayMap={displayMap} structures={structures} atomMapping={atomMapping} useElementColors={useElementColors && !isLoading} plan={plan} orbitPlan={orbitPlan} callbacks={inventoryCallbacks} graphCallbacks={graphCallbacks} isLoading={isLoading} highlightedGroup={highlightedGroup} onHighlight={setHoveredGroup} onClearHighlight={() => setHoveredGroup(undefined)} onSelectGroup={selectGroup} />
        </Box>
        {error && <Typography variant="caption" color="text.secondary">Compound details could not be loaded.</Typography>}
        {useElementColors && !isLoading && <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {(plan.colorableCount > 0 || atomMappingConfidence || atomMappingHasSymmetryGroups) && <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {plan.colorableCount > 0 && <Typography variant="body2" sx={{ fontWeight: 600 }}>Atom mapping</Typography>}
                {atomMappingConfidence && <Chip size="small" label={atomMappingConfidence} color={confidenceColor(atomMappingConfidence)} />}
                {atomMappingHasSymmetryGroups && <Typography variant="caption" color="text.secondary">A grouped mapping resolves to any one member of a set of symmetry-equivalent atoms, so the specific atom is not determined.</Typography>}
            </Box>}
            {plan.colorableCount > 0 && <Box component="ul" aria-label="Atom mapping legend" sx={{ m: 0, pl: 2.5 }}>
                {plan.legend.map((entry) => {
                    const description = `${entry.element}: ${entry.kind === 'one-to-one' ? entry.compoundIds.join(' and ') : `${joinCompoundIds(entry.compoundIds)} — grouped; individual atom pairing is not determined by the data`}${entry.uncoloredCompoundIds.length > 0 ? ` (not coloured: ${joinCompoundIds(entry.uncoloredCompoundIds)})` : ''}`;
                    return <Box component="li" key={entry.groupId} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Tooltip title={description}><Box component="button" type="button" data-mapping-group={entry.groupId} aria-pressed={selectedGroup === entry.groupId} aria-label={description} onClick={() => selectGroup(entry.groupId)} onMouseEnter={() => setHoveredGroup(entry.groupId)} onMouseLeave={() => setHoveredGroup(undefined)} onFocus={() => setHoveredGroup(entry.groupId)} onBlur={() => setHoveredGroup(undefined)} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, border: 0, bgcolor: 'transparent', p: 0, cursor: 'pointer', textAlign: 'left' }}>
                            <Box aria-hidden="true" sx={{ width: 12, height: 12, bgcolor: entry.color, borderRadius: '50%' }} />
                            <Typography variant="caption">{description}</Typography>
                        </Box></Tooltip>
                    </Box>;
                })}
            </Box>}
            {reasons.length > 0 && <Typography variant="caption" color="text.secondary">Some atoms could not be unambiguously mapped and therefore are not coloured: {reasons.join('; ')}.</Typography>}
        </Box>}
    </Box>;
}
