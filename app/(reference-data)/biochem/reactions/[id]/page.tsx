'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from 'next/link';
import { getReactionById, getCompoundImageUrl, EXTERNAL_DBS } from '@/lib/api/biochem';
import ChemicalEquation from '@/components/ui/ChemicalEquation';
import ReactionStructureEquation from '@/components/ui/ReactionStructureEquation';

/* ─── Helpers ───────────────────────────────────────────────── */

/**
 * Extract unique compound IDs from a reaction equation
 * 
 * Parses compound IDs in the format cpd##### (e.g., cpd00001, cpd12345)
 * from a reaction equation string, removing duplicates and compartment
 * annotations.
 * 
 * @param equation - Reaction equation (e.g., "cpd00001[c] + cpd00002[c] => cpd00003[c]")
 * @returns Array of unique compound IDs without compartments
 * 
 * @example
 * extractCompoundIds("cpd00001[c] + cpd00002[c] => cpd00003[c]")
 * // Returns: ["cpd00001", "cpd00002", "cpd00003"]
 */
function extractCompoundIds(equation: string): string[] {
    if (!equation) return [];
    
    // Match pattern: cpd followed by 5 digits
    const matches = equation.match(/cpd\d{5}/g);
    if (!matches) return [];
    
    // Remove duplicates and return
    return Array.from(new Set(matches));
}

/* ─── Compound Structure Gallery Component ──────────────────── */

interface CompoundStructureGalleryProps {
    compoundIds: string[];
}

/**
 * Displays a gallery of compound structure images with links to detail pages
 * 
 * Shows structure images for all compounds in a reaction equation. Images are
 * displayed in a responsive flex grid. Missing images are hidden gracefully.
 * Each image links to the corresponding compound detail page.
 */
function CompoundStructureGallery({ compoundIds }: CompoundStructureGalleryProps) {
    if (!compoundIds || compoundIds.length === 0) return null;
    
    return (
        <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}>
                Compound Structures
            </Typography>
            <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                flexWrap: 'wrap',
                alignItems: 'flex-start'
            }}>
                {compoundIds.map(id => (
                    <Box 
                        key={id} 
                        sx={{ 
                            textAlign: 'center',
                            '&:hover img': {
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                transform: 'translateY(-2px)',
                                transition: 'all 0.2s ease'
                            }
                        }}
                    >
                        <Link href={`/biochem/compounds/${id}`} style={{ textDecoration: 'none' }}>
                            <img
                                src={getCompoundImageUrl(id)}
                                alt={`Structure of ${id}`}
                                style={{
                                    maxWidth: '150px',
                                    maxHeight: '150px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onError={(e) => {
                                    // Hide images that fail to load (compound has no structure image)
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement?.parentElement;
                                    if (parent) parent.style.display = 'none';
                                }}
                            />
                        </Link>
                        <Typography 
                            variant="caption" 
                            display="block" 
                            sx={{ mt: 0.5 }}
                        >
                            <Link 
                                href={`/biochem/compounds/${id}`}
                                style={{ 
                                    color: '#00acc1', 
                                    textDecoration: 'none',
                                    fontWeight: 500
                                }}
                            >
                                {id}
                            </Link>
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

/* ─── Alias helper ───────────────────────────────────────────── */

function AliasDisplay({ aliases }: { aliases?: string[] }) {
    if (!aliases || aliases.length === 0) return <span>N/A</span>;

    return (
        <span>
            {aliases.map((entry, i) => {
                const colonIdx = entry.indexOf(':');
                if (colonIdx === -1) return <span key={i}>{entry}; </span>;

                const prefix = entry.substring(0, colonIdx).trim();
                const values = entry.substring(colonIdx + 1).split(';').map((v) => v.trim()).filter(Boolean);

                let baseUrl = '';
                if (prefix.includes('BiGG')) baseUrl = EXTERNAL_DBS.BiGG_r;
                else if (prefix.includes('KEGG')) baseUrl = EXTERNAL_DBS.KEGG;
                else if (prefix.includes('MetaCyc')) baseUrl = EXTERNAL_DBS.MetaCyc_r;

                return (
                    <span key={i}>
                        <strong>{prefix}:</strong>{' '}
                        {values.map((v, j) => (
                            <span key={j}>
                                {baseUrl ? (
                                    <Link href={`${baseUrl}${v}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00acc1', textDecoration: 'none' }}>{v}</Link>
                                ) : v}
                                {j < values.length - 1 ? '; ' : ''}
                            </span>
                        ))}
                        {'; '}
                    </span>
                );
            })}
        </span>
    );
}

/* ─── Detail Row Component ───────────────────────────────────── */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', py: 0.5 }}>
            <Box sx={{ width: '20%', minWidth: 180, flexShrink: 0 }}>
                <strong>{label}</strong>
            </Box>
            <Box sx={{ flex: 1 }}>{children}</Box>
        </Box>
    );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function ReactionDetailPage() {
    const { id } = useParams<{ id: string }>();

    const { data: rxn, isLoading, error } = useQuery({
        queryKey: ['reaction', id],
        queryFn: () => getReactionById(id),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !rxn) {
        return (
            <Box sx={{ px: 3, py: 4 }}>
                <Typography color="error">Failed to load reaction {id}.</Typography>
            </Box>
        );
    }

    // Derived display values (matching legacy Reaction controller)
    const isObsolete = rxn.is_obsolete === '1';
    const linkedRxnIds = rxn.linked_reaction?.split(';') ?? [];
    const replaceRxn = linkedRxnIds.length > 0 ? linkedRxnIds[0] : null;

    const synonymEntry = rxn.aliases?.find((a) => a.startsWith('Name:'));
    const synonyms = synonymEntry ? synonymEntry.replace('Name:', '').replace(/"/g, '') : 'N/A';
    const aliasesWithoutName = rxn.aliases?.filter((a) => !a.startsWith('Name:')) ?? [];

    const ecDisplay = (rxn.ec_numbers ?? []).join('; ').replace(/"/g, '');
    const pathwaysDisplay = (rxn.pathways ?? []).join('; ').replace(/"/g, '');

    // Extract compound IDs for structure display
    const compoundIds = extractCompoundIds(rxn.equation || rxn.definition);

    return (
        <Box sx={{ px: 3, py: 2, maxWidth: 1200, mx: 'auto' }}>
            <Card variant="outlined">
                <CardContent>
                    <Divider sx={{ mb: 1 }} />

                    <DetailRow label="Reaction">
                        {rxn.id}&nbsp;[{rxn.name}]
                    </DetailRow>
                    <Divider />

                    <DetailRow label="Equation">
                        <ChemicalEquation equation={rxn.definition} />
                    </DetailRow>

                    {/* Integrated structure diagram — structures inline with reaction arrow */}
                    {compoundIds.length > 0 && (
                        <Box sx={{ pl: '20%', mt: 1, mb: 1 }}>
                            <ReactionStructureEquation
                                equation={rxn.equation ?? rxn.definition}
                                reversibility={rxn.reversibility}
                            />
                        </Box>
                    )}
                    
                    <Divider />

                    <DetailRow label="Abbreviation">
                        {rxn.abbreviation ?? 'N/A'}
                    </DetailRow>

                    <DetailRow label="Reaction definition">
                        <ChemicalEquation equation={rxn.definition} />
                    </DetailRow>

                    <DetailRow label="Equation with compound IDs">
                        <ChemicalEquation equation={rxn.equation} />
                    </DetailRow>

                    <DetailRow label="Gibbs free energy change ΔG">
                        {rxn.deltag}±{rxn.deltagerr}&nbsp;(kcal/mol)
                    </DetailRow>

                    <DetailRow label="EC numbers">
                        {ecDisplay || 'N/A'}
                    </DetailRow>

                    <DetailRow label="Thermodynamic reversibility">
                        {rxn.reversibility ?? 'N/A'}
                    </DetailRow>

                    <DetailRow label="Status">
                        {rxn.status}
                    </DetailRow>

                    <DetailRow label="Is obsolete?">
                        {isObsolete ? 'Yes' : 'No'}
                    </DetailRow>

                    {isObsolete && replaceRxn && (
                        <DetailRow label="Linked reaction">
                            <Link href={`/biochem/reactions/${replaceRxn}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                                {replaceRxn}
                            </Link>
                        </DetailRow>
                    )}

                    {aliasesWithoutName.length > 0 && (
                        <DetailRow label="Aliases">
                            <AliasDisplay aliases={aliasesWithoutName} />
                        </DetailRow>
                    )}

                    <DetailRow label="Synonyms">
                        {synonyms}
                    </DetailRow>

                    <DetailRow label="Is transport?">
                        {rxn.is_transport ? 'Yes' : 'No'}
                    </DetailRow>

                    <DetailRow label="Source">
                        {rxn.source ?? 'N/A'}
                    </DetailRow>

                    {rxn.pathways && rxn.pathways.length > 0 && (
                        <DetailRow label="Pathways">
                            {pathwaysDisplay}
                        </DetailRow>
                    )}

                    {rxn.ontology && rxn.ontology !== 'class:null|context:null|step:null' && (
                        <DetailRow label="Ontology">
                            {rxn.ontology}
                        </DetailRow>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
