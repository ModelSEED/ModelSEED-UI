'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Link from 'next/link';
import { getReactionById, EXTERNAL_DBS } from '@/lib/api/biochem';
import ChemicalEquation from '@/components/ui/ChemicalEquation';
import ReactionStructureEquation from '@/components/ui/ReactionStructureEquation';
import ThermodynamicsTable from '@/components/ui/ThermodynamicsTable';
import AtomMappingSummary from '@/components/ui/AtomMappingSummary';
import AtomFlowDiagram from '@/components/ui/AtomFlowDiagram';
import { normalizeAtomMapping, parseAtomMappings } from '@/lib/utils/atomMapping';
import {
    directionAgreementFromRecords,
    DIRECTION_AGREEMENT_COLOR,
    DIRECTION_AGREEMENT_LABEL,
} from '@/lib/utils/reactionDirection';

function extractCompoundIds(equation: string): string[] {
    if (!equation) return [];
    const matches = equation.match(/cpd\d{5}/g);
    if (!matches) return [];
    return Array.from(new Set(matches));
}

function parseNameAliases(aliases: string[] | undefined): string[] {
    const nameEntry = aliases?.find((a) => a.startsWith('Name:'));
    if (!nameEntry) return [];

    const seen = new Set<string>();
    return nameEntry
        .replace('Name:', '')
        .replace(/"/g, '')
        .split(';')
        .map((v) => v.trim())
        .filter(Boolean)
        .filter((v) => {
            const key = v.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function getDbLink(prefix: string, value: string): string {
    if (prefix.includes('BiGG')) return `${EXTERNAL_DBS.BiGG_r}${value}`;
    if (prefix.includes('KEGG')) return `${EXTERNAL_DBS.KEGG}${value}`;
    if (prefix.includes('MetaCyc')) return `${EXTERNAL_DBS.MetaCyc_r}${value}`;
    return '';
}

function AliasDisplay({ aliases }: { aliases?: string[] }) {
    if (!aliases || aliases.length === 0) {
        return <Typography variant="body2">N/A</Typography>;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {aliases.map((entry, idx) => {
                const colonIdx = entry.indexOf(':');
                if (colonIdx === -1) {
                    return (
                        <Typography key={`alias-${idx}`} variant="body2">
                            {entry}
                        </Typography>
                    );
                }

                const prefix = entry.substring(0, colonIdx).trim();
                const values = entry
                    .substring(colonIdx + 1)
                    .split(';')
                    .map((v) => v.trim())
                    .filter(Boolean);

                return (
                    <Box
                        key={`alias-${prefix}-${idx}`}
                        sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 72, pt: 0.5, flexShrink: 0 }}
                        >
                            {prefix}
                        </Typography>
                        <Box
                            sx={{
                                borderLeft: '2px solid #e2e8f0',
                                pl: 1.2,
                                display: 'flex',
                                gap: 0.6,
                                flexWrap: 'wrap',
                            }}
                        >
                            {values.map((value) => {
                                const href = getDbLink(prefix, value);
                                if (href) {
                                    return (
                                        <Chip
                                            key={`${prefix}-${value}`}
                                            label={value}
                                            component="a"
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            clickable
                                            size="small"
                                            sx={{ color: '#0e7490', bgcolor: '#ecfeff', border: '1px solid #bae6fd' }}
                                        />
                                    );
                                }

                                return (
                                    <Chip
                                        key={`${prefix}-${value}`}
                                        label={value}
                                        size="small"
                                        variant="outlined"
                                        sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}

function SynonymsDisplay({ synonyms }: { synonyms: string[] }) {
    if (!synonyms.length) {
        return <Typography variant="body2">N/A</Typography>;
    }

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
            {synonyms.map((synonym) => (
                <Chip
                    key={synonym}
                    label={synonym}
                    size="small"
                    sx={{
                        bgcolor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#1e293b',
                        fontWeight: 500,
                        fontSize: '0.74rem',
                    }}
                />
            ))}
        </Box>
    );
}

function PathwaysDisplay({ pathways }: { pathways: string[] }) {
    if (!pathways.length) {
        return <Typography variant="body2">N/A</Typography>;
    }

    const grouped = new Map<string, string[]>();
    for (const pathway of pathways) {
        const [sourceRaw, restRaw] = pathway.split(':');
        const source = sourceRaw?.trim() || 'Pathway';
        const rest = (restRaw?.trim() || pathway)
            .split(';')
            .map((v) => v.trim())
            .filter(Boolean);
        const current = grouped.get(source) ?? [];
        grouped.set(source, [...current, ...rest]);
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
            {Array.from(grouped.entries()).map(([source, items]) => (
                <Box key={source} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            color: 'text.secondary',
                            minWidth: 72,
                            pt: 0.5,
                            flexShrink: 0,
                        }}
                    >
                        {source}
                    </Typography>
                    <Box
                        sx={{
                            borderLeft: '2px solid #e2e8f0',
                            pl: 1.2,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.6,
                        }}
                    >
                        {items.map((item) => (
                            <Chip
                                key={`${source}-${item}`}
                                label={item}
                                size="small"
                                sx={{
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    color: '#334155',
                                    fontSize: '0.73rem',
                                    height: 'auto',
                                    '& .MuiChip-label': { whiteSpace: 'normal', py: 0.4 },
                                }}
                            />
                        ))}
                    </Box>
                </Box>
            ))}
        </Box>
    );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box
            sx={{
                display: 'flex',
                py: 1.1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                gap: 1.5,
                alignItems: 'flex-start',
            }}
        >
            <Box sx={{ width: '22%', minWidth: 200, flexShrink: 0, pt: 0.2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {label}
                </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
        </Box>
    );
}

function BooleanChip({ value }: { value: boolean }) {
    return (
        <Chip
            size="small"
            label={value ? 'Yes' : 'No'}
            sx={{
                fontWeight: 600,
                bgcolor: value ? '#ecfdf3' : '#f9fafb',
                color: value ? '#166534' : '#374151',
                border: '1px solid',
                borderColor: value ? '#bbf7d0' : '#e5e7eb',
            }}
        />
    );
}

function ReversibilityDisplay({ value }: { value?: string }) {
    const raw = (value ?? '').trim();

    let label = 'Unknown';
    let meaning = 'Directionality is not specified in this record.';
    let color = { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };

    if (raw === '=' || raw === '<=>') {
        label = 'Reversible';
        meaning = 'Reaction can proceed in both forward and reverse directions.';
        color = { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' };
    } else if (raw === '>' || raw === '=>') {
        label = 'Forward-only';
        meaning = 'Reaction is constrained to proceed left to right.';
        color = { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
    } else if (raw === '<' || raw === '<=') {
        label = 'Reverse-only';
        meaning = 'Reaction is constrained to proceed right to left.';
        color = { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' };
    } else if (raw) {
        label = `Custom (${raw})`;
        meaning = 'Reaction uses a non-standard reversibility code.';
        color = { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' };
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, flexWrap: 'wrap' }}>
            <Chip
                size="small"
                label={label}
                sx={{
                    fontWeight: 700,
                    bgcolor: color.bg,
                    color: color.text,
                    border: '1px solid',
                    borderColor: color.border,
                }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.45 }}>
                {meaning}
            </Typography>
        </Box>
    );
}

export default function ReactionDetailPage() {
    const { id } = useParams<{ id: string }>();

    const { data: rxn, isLoading, error } = useQuery({
        queryKey: ['reaction', id],
        queryFn: () => getReactionById(id),
        enabled: !!id,
    });

    const atomMapping = useMemo(() => normalizeAtomMapping(rxn), [rxn]);
    const atomPairs = useMemo(() => parseAtomMappings(atomMapping.entries), [atomMapping.entries]);

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

    const isObsolete = rxn.is_obsolete === '1';
    const linkedRxnIds = rxn.linked_reaction?.split(';').map((v) => v.trim()).filter(Boolean) ?? [];
    const replacementRxn = linkedRxnIds[0];

    const aliasesWithoutName = rxn.aliases?.filter((a) => !a.startsWith('Name:')) ?? [];
    const synonyms = parseNameAliases(rxn.aliases);
    const ecNumbers = (rxn.ec_numbers ?? []).map((v) => v.replace(/"/g, '').trim()).filter(Boolean);
    const pathways = (rxn.pathways ?? []).map((v) => v.replace(/"/g, '').trim()).filter(Boolean);

    const compoundIds = extractCompoundIds(rxn.equation || rxn.definition);

    const thermoRecords = rxn.thermodynamics ?? [];
    const agreement = directionAgreementFromRecords(thermoRecords);

    const dg = Number(rxn.deltag);
    const err = Number(rxn.deltagerr);
    const deltaGLabel = Number.isNaN(dg)
        ? 'N/A'
        : Number.isNaN(err)
          ? `${dg} kcal/mol`
          : `${dg} +/- ${err} kcal/mol`;

    return (
        <Box sx={{ px: 3, py: 2, maxWidth: 1240, mx: 'auto' }}>
            <Card variant="outlined" sx={{ borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Reaction {rxn.id}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                            {rxn.name}
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 0.2 }} />

                    <DetailRow label="Equation">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                            <ChemicalEquation equation={rxn.definition} />
                            {compoundIds.length > 0 && (
                                <ReactionStructureEquation
                                    equation={rxn.equation ?? rxn.definition}
                                    reversibility={rxn.reversibility}
                                />
                            )}
                        </Box>
                    </DetailRow>

                    <DetailRow label="Abbreviation">
                        <Chip size="small" label={rxn.abbreviation ?? 'N/A'} sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                    </DetailRow>

                    <DetailRow label="Reaction definition">
                        <ChemicalEquation equation={rxn.definition} />
                    </DetailRow>

                    <DetailRow label="Equation with compound IDs">
                        <ChemicalEquation equation={rxn.equation} />
                    </DetailRow>

                    {thermoRecords.length > 0 ? (
                        <DetailRow
                            label={
                                typeof rxn.n_sources_thermodynamics === 'number' &&
                                rxn.n_sources_thermodynamics > 0
                                    ? `Thermodynamics (${rxn.n_sources_thermodynamics} sources)`
                                    : 'Thermodynamics'
                            }
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {agreement !== null ? (
                                    <Chip
                                        size="small"
                                        label={DIRECTION_AGREEMENT_LABEL[agreement]}
                                        color={DIRECTION_AGREEMENT_COLOR[agreement]}
                                        sx={{ alignSelf: 'flex-start' }}
                                    />
                                ) : (
                                    typeof rxn.sources_agree_direction === 'boolean' && (
                                        <Chip
                                            size="small"
                                            label={
                                                rxn.sources_agree_direction
                                                    ? 'Sources agree on direction'
                                                    : 'Sources disagree on direction'
                                            }
                                            color={rxn.sources_agree_direction ? 'success' : 'warning'}
                                            sx={{ alignSelf: 'flex-start' }}
                                        />
                                    )
                                )}
                                <ThermodynamicsTable records={thermoRecords} showOperator />
                            </Box>
                        </DetailRow>
                    ) : (
                        <DetailRow label="Gibbs free energy change (ΔG)">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {deltaGLabel}
                            </Typography>
                        </DetailRow>
                    )}

                    <DetailRow label="EC numbers">
                        {ecNumbers.length ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {ecNumbers.map((ec) => (
                                    <Chip key={ec} size="small" label={ec} sx={{ fontFamily: 'monospace' }} />
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2">N/A</Typography>
                        )}
                    </DetailRow>

                    <DetailRow label="Thermodynamic reversibility">
                        <ReversibilityDisplay value={rxn.reversibility} />
                    </DetailRow>

                    <DetailRow label="Status">
                        <Chip
                            size="small"
                            label={rxn.status || 'N/A'}
                            sx={{
                                fontWeight: 700,
                                bgcolor: rxn.status?.toLowerCase().includes('ok') ? '#ecfdf3' : '#fef3c7',
                                color: rxn.status?.toLowerCase().includes('ok') ? '#166534' : '#92400e',
                            }}
                        />
                    </DetailRow>

                    <DetailRow label="Is obsolete?">
                        <BooleanChip value={isObsolete} />
                    </DetailRow>

                    {isObsolete && replacementRxn && (
                        <DetailRow label="Linked reaction">
                            <Link href={`/biochem/reactions/${replacementRxn}`} style={{ color: '#00838f', textDecoration: 'none', fontWeight: 600 }}>
                                {replacementRxn}
                            </Link>
                        </DetailRow>
                    )}

                    <DetailRow label="Aliases">
                        <AliasDisplay aliases={aliasesWithoutName} />
                    </DetailRow>

                    <DetailRow label="Synonyms">
                        <SynonymsDisplay synonyms={synonyms} />
                    </DetailRow>

                    <DetailRow label="Is transport?">
                        <BooleanChip value={Boolean(rxn.is_transport)} />
                    </DetailRow>

                    <DetailRow label="Source">
                        <Typography variant="body2">{rxn.source ?? 'N/A'}</Typography>
                    </DetailRow>

                    <DetailRow label="Pathways">
                        <PathwaysDisplay pathways={pathways} />
                    </DetailRow>

                    {rxn.ontology && rxn.ontology !== 'class:null|context:null|step:null' && (
                        <DetailRow label="Ontology">
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                {rxn.ontology}
                            </Typography>
                        </DetailRow>
                    )}

                    {atomPairs.length > 0 && (
                        <DetailRow label="Atom mappings">
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <AtomFlowDiagram pairs={atomPairs} />
                                <AtomMappingSummary
                                    entries={atomMapping.entries}
                                    confidence={atomMapping.confidence}
                                    hasSymmetryGroups={atomMapping.hasSymmetryGroups}
                                />
                            </Box>
                        </DetailRow>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
