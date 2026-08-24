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
    type UnmappableReason,
} from '@/lib/utils/atomMappingColors';
import { buildAtomOrbitColorPlan, compoundColorResult, type CompoundColorResult, type MappingPrecision } from '@/lib/utils/atomOrbitColors';
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
const PRECISION_LABELS: Record<MappingPrecision, string> = {
    'exact-atom': 'Exact atom mapping', 'symmetry-orbit': 'Symmetry-equivalent atoms', 'element-block': 'Element-level mapping', unresolved: 'No atom mapping shown',
};
const ORBIT_REASON_TEXT: Record<string, string> = {
    'no-mapping': 'This participant has no mapping data.', 'no-structure': 'Structure data is unavailable, so no atom mapping is shown.', 'merged-groups': 'Mapping groups overlap, so no atom mapping is shown.', 'partial-coverage': 'The mapping covers only part of this structure, so no atom mapping is shown.',
    'no-inchi': 'No InChI is available to establish atom correspondence.', 'multi-component': 'The InChI has multiple components, so atom correspondence cannot be established.', 'unsupported-inchi': 'This InChI form cannot establish atom correspondence.', 'formula-parse-failed': 'The InChI formula could not be interpreted for atom correspondence.', 'connection-parse-failed': 'The InChI connection data could not establish atom correspondence.', 'atom-count-mismatch': 'The structure atom count does not match the InChI.', 'element-count-mismatch': 'The structure element counts do not match the InChI.', 'bond-count-mismatch': 'The structure bonds do not match the InChI.', 'too-large': 'This structure is too large for safe atom correspondence.', 'no-isomorphism': 'The structure cannot be matched to the InChI atom graph.', 'search-exhausted': 'Atom correspondence could not be established within the safe search limit.',
};
function precisionExplanation(result: CompoundColorResult): string {
    if (result.precision === 'exact-atom') return 'Each colour identifies the exact mapped atom.';
    if (result.precision === 'symmetry-orbit') return 'This colour marks a set of symmetry-equivalent atoms; the individual atom within that set is not distinguished by the data.';
    if (result.precision === 'element-block') return 'This colour is a claim at whole-element granularity, not an individual atom correspondence.';
    return ORBIT_REASON_TEXT[result.reason ?? ''] ?? 'Atom correspondence could not be established, so no atom mapping is shown.';
}

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
    showAllAtomLabels?: boolean;
    mappingDescription?: string;
    mappingControls?: Readonly<Record<string, { groupId: string; color: string }>>;
    highlightedGroup?: string;
    onInventory: (inventory: Inventory) => void;
    onGraph: (graph: HeavyAtomGraph) => void;
    isLoading: boolean; precisionResult?: CompoundColorResult;
}

function CompoundColumn({ token, data, structure, atomColors, bondColors, showAllAtomLabels, mappingDescription, mappingControls, highlightedGroup, onInventory, onGraph, isLoading, precisionResult }: CompoundColumnProps) {
    const smiles = data?.smiles ?? structure?.smiles;
    const drawStructure = Boolean(structure?.svg) || (Boolean(smiles) && (!data?.formula || !isParsableFormula(data.formula) || heavyAtomCount(data.formula) >= 1));
    const label = data?.name || token.id;
    const metadata = token.id;
    const accessibleDescription = [
        data?.formula && `Formula ${data.formula}`,
        formatCharge(data?.charge) && `charge ${formatCharge(data?.charge)}`,
        precisionResult && PRECISION_LABELS[precisionResult.precision],
        precisionResult && precisionExplanation(precisionResult),
        mappingDescription,
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
    const isMember = Boolean(highlightedGroup && Object.values(mappingControls ?? {}).some((control) => control.groupId === highlightedGroup));
    const isDimmed = Boolean(highlightedGroup && !isMember);
    const highlightColor = isMember ? Object.values(mappingControls ?? {}).find((control) => control.groupId === highlightedGroup)?.color : undefined;
    return (
        <Box data-mapping-token={token.id} data-mapping-dimmed={isDimmed ? 'true' : 'false'} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, maxWidth: 160, minWidth: 0, ...(highlightedGroup ? { opacity: isDimmed ? 0.4 : 1 } : {}) }}>
            {token.stoich && <Typography variant="body2" sx={{ fontWeight: 600, pt: 0.5, color: highlightColor }}>{token.stoich}</Typography>}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4, minWidth: 0 }}>
                <Tooltip title={accessibleDescription} disableHoverListener={!accessibleDescription}>
                    <Box sx={{ maxWidth: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                        <NextLink href={`/biochem/compounds/${token.id}`} aria-label={`Open ${label}`} style={drawStructure ? undefined : compoundLinkStyle}>{contents}</NextLink>
                    </Box>
                </Tooltip>
                {isLoading ? <Skeleton variant="text" width={100} /> : <NextLink href={`/biochem/compounds/${token.id}`} style={compoundLinkStyle}>
                    <Typography variant="body1" style={highlightColor ? { color: highlightColor } : undefined} sx={{ fontWeight: 600, textAlign: 'center', overflowWrap: 'anywhere' }}>{label}</Typography>
                </NextLink>}
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}>{metadata}</Typography>
            </Box>
        </Box>
    );
}

function EquationSide({ tokens, displayMap, structures, atomMapping, useOrbitColors, plan, orbitPlan, callbacks, graphCallbacks, isLoading, highlightedGroup }: {
    tokens: CompoundToken[]; displayMap: Map<string, DisplayData>; structures: Map<string, CompoundStructure>;
    atomMapping?: ReactionAtomMapping; useOrbitColors: boolean; plan: ReturnType<typeof buildAtomMappingColorPlan>; orbitPlan: ReturnType<typeof buildAtomOrbitColorPlan>;
    callbacks: Readonly<Record<string, (inventory: Inventory) => void>>; graphCallbacks: Readonly<Record<string, (graph: HeavyAtomGraph) => void>>;
    isLoading: boolean; highlightedGroup?: string;
}) {
    return <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1.5 }}>
        {tokens.map((token, index) => {
            const orbitColors = compoundColorResult(orbitPlan, token.id);
            const tokenBlocks = plan.blocks.filter((block) => block.colorable && block.compoundId === token.id);
            const mappingControls = Object.fromEntries(orbitPlan.groups.filter((group) => group.compoundIds.includes(token.id)).flatMap((group) => group.elements.map((element) => [element, { groupId: group.groupId, color: group.color }])));
            const precisionResult = orbitPlan.compounds[token.id];
            const descriptions = tokenBlocks.map((block) => `${block.element} mapped to ${block.counterpartCompoundIds.join(', ')}`);
            return <Box key={`${token.id}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CompoundColumn token={token} data={displayMap.get(token.id)} structure={structures.get(token.id)}
                    atomColors={useOrbitColors ? orbitColors.atomColors : atomMapping?.[token.id]} bondColors={useOrbitColors ? orbitColors.bondColors : undefined} showAllAtomLabels
                    mappingDescription={descriptions.join('; ') || undefined} mappingControls={mappingControls} highlightedGroup={highlightedGroup} onInventory={callbacks[token.id]} onGraph={graphCallbacks[token.id]} isLoading={isLoading} precisionResult={precisionResult} />
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
    const useOrbitColors = pairs.length > 0;
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
            <EquationSide tokens={parsed.reactants} displayMap={displayMap} structures={structures} atomMapping={atomMapping} useOrbitColors={useOrbitColors && !isLoading && !structuresLoading} plan={plan} orbitPlan={orbitPlan} callbacks={inventoryCallbacks} graphCallbacks={graphCallbacks} isLoading={isLoading} highlightedGroup={highlightedGroup} />
            <Typography variant="h5" aria-hidden="true" sx={{ color: 'text.primary', fontWeight: 300, flexShrink: 0, px: 1, userSelect: 'none' }}>{arrow}</Typography>
            <EquationSide tokens={parsed.products} displayMap={displayMap} structures={structures} atomMapping={atomMapping} useOrbitColors={useOrbitColors && !isLoading && !structuresLoading} plan={plan} orbitPlan={orbitPlan} callbacks={inventoryCallbacks} graphCallbacks={graphCallbacks} isLoading={isLoading} highlightedGroup={highlightedGroup} />
        </Box>
        {error && <Typography variant="caption" color="text.secondary">Compound details could not be loaded.</Typography>}
        {useOrbitColors && !isLoading && !structuresLoading && orbitPlan.groups.length > 0 && <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {(plan.colorableCount > 0 || atomMappingConfidence || atomMappingHasSymmetryGroups) && <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {orbitPlan.groups.length > 0 && <Typography variant="body2" sx={{ fontWeight: 600 }}>Atom mapping</Typography>}
                {atomMappingConfidence && <Chip size="small" label={atomMappingConfidence} color={confidenceColor(atomMappingConfidence)} />}
            </Box>}
            <Box component="ul" aria-label="Atom mapping legend" sx={{ m: 0, pl: 2.5 }}>
                {orbitPlan.groups.map((entry) => {
                    const description = `${entry.elements.join(', ')}: ${joinCompoundIds(entry.compoundIds)}${entry.hasSymmetryGroup ? ' — grouped; individual atom pairing is not determined by the data' : ''}`;
                    return <Box component="li" key={entry.groupId} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Tooltip title={description}><Box component="button" type="button" data-mapping-group={entry.groupId} aria-pressed={selectedGroup === entry.groupId} aria-label={description} onClick={() => selectGroup(entry.groupId)} onMouseEnter={() => setHoveredGroup(entry.groupId)} onMouseLeave={() => setHoveredGroup(undefined)} onFocus={() => setHoveredGroup(entry.groupId)} onBlur={() => setHoveredGroup(undefined)} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, border: 0, bgcolor: 'transparent', p: 0, cursor: 'pointer', textAlign: 'left' }}>
                            <Box aria-hidden="true" sx={{ width: 12, height: 12, bgcolor: entry.color, borderRadius: '50%' }} />
                            <Typography variant="caption">{entry.elements.join(', ')} · {entry.compoundIds.join(', ')}{entry.hasSymmetryGroup ? ' †' : ''}</Typography>
                        </Box></Tooltip>
                    </Box>;
                })}
            </Box>
            <Box component="details">
                <Box component="summary" sx={{ cursor: 'pointer' }}>Mapping details</Box>
                {atomMappingHasSymmetryGroups && <Typography variant="caption" color="text.secondary">A grouped mapping resolves to any one member of a set of symmetry-equivalent atoms, so the specific atom is not determined.</Typography>}
                {(() => {
                    const summary = (['exact-atom', 'symmetry-orbit', 'element-block', 'unresolved'] as MappingPrecision[])
                        .filter((precision) => orbitPlan.precisionSummary[precision] > 0)
                        .map((precision) => `${orbitPlan.precisionSummary[precision]} ${PRECISION_LABELS[precision].toLowerCase()}`)
                        .join('; ');
                    return summary && <Typography variant="caption" color="text.secondary">Precision: {summary}.</Typography>;
                })()}
                {reasons.length > 0 && <Typography variant="caption" color="text.secondary">Some atoms could not be unambiguously mapped and therefore are not coloured: {reasons.join('; ')}.</Typography>}
            </Box>
        </Box>}
        {structureError && <Typography role="status" variant="caption" color="text.secondary">Structure data could not be loaded, so atom-level mapping precision is unavailable and any colours shown are element-level at best.</Typography>}
    </Box>;
}
