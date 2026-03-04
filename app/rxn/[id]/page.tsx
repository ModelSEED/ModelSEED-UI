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
import { getReactionById, EXTERNAL_DBS } from '@/lib/api/biochem';

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
                                    <a href={`${baseUrl}${v}`} target="_blank" rel="noopener noreferrer">{v}</a>
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

    const backUrl = '/reference-data/reactions';
    const eqDisplay = (rxn.equation ?? rxn.definition ?? '')
        .replace(/\(1\)/g, '')
        .replace(/\[0\]/g, '');
    const defDisplay = (rxn.definition ?? '')
        .replace(/\(1\)/g, '')
        .replace(/\[0\]/g, '');

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
                        {rxn.definition ?? 'N/A'}
                    </DetailRow>
                    <Divider />

                    <DetailRow label="Abbreviation">
                        {rxn.abbreviation ?? 'N/A'}
                    </DetailRow>

                    <DetailRow label="Reaction definition">
                        {defDisplay}
                    </DetailRow>

                    <DetailRow label="Equation with compound IDs">
                        {eqDisplay}
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
                            <Link href={`/rxn/${replaceRxn}`} style={{ color: '#1976d2' }}>
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
