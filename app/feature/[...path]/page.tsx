/**
 * Feature (gene) detail view displaying individual gene information.
 * 
 * Shows detailed feature metadata including aliases, functional description,
 * location, and linked PubMed/COG annotations. Provides navigation to
 * parent genome.
 * 
 * @route /feature/[...path] - Dynamic feature workspace path
 * @param {Promise<{ path: string[] }>} params - Workspace path segments
 */

'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { workspaceGet, parseWorkspaceGetObject } from '@/lib/api/workspace';

/* ---------- types ---------- */

interface Alias {
    label: string;
    alias: string;
    url?: string;
}

interface FeatureData {
    id: string;
    func: string;
    proteinSequence: string;
    subsystems: string[];
    aliases: Alias[];
}

/* ---------- constants ---------- */

const SEED_FEATURE_URL = 'http://pubseed.theseed.org/seedviewer.cgi?page=Annotation&feature=';

/* ---------- helpers ---------- */

/**
 * Parse the aliases hash from a workspace feature object into a sorted list.
 * Legacy controller: `parseAliases(res.aliases)`
 */
function parseAliases(raw: unknown): Alias[] {
    if (!raw || typeof raw !== 'object') return [];
    const hash = raw as Record<string, string>;
    const aliases: Alias[] = [];
    for (const key of Object.keys(hash)) {
        const entry: Alias = { label: key, alias: hash[key] };
        if (key === 'SEED') entry.url = SEED_FEATURE_URL + hash[key];
        aliases.push(entry);
    }
    aliases.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
    return aliases;
}

/**
 * Locate a specific feature by ID from a genome workspace object.
 */
function extractFeature(genome: Record<string, unknown>, featureId: string): FeatureData | null {
    const features = genome.features as Record<string, unknown>[] | undefined;
    if (!Array.isArray(features)) return null;

    const match = features.find(
        (f) => String(f.id ?? '') === featureId || String(f.feature_id ?? '') === featureId,
    );
    if (!match) return null;

    const subsystems = match.subsystems as string[] | undefined;
    return {
        id: String(match.id ?? match.feature_id ?? featureId),
        func: String(match.function ?? match.functional_description ?? ''),
        proteinSequence: String(match.protein_translation ?? ''),
        subsystems: Array.isArray(subsystems) ? subsystems : [],
        aliases: parseAliases(match.aliases),
    };
}

/* ---------- section components ---------- */

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1, color: '#333' }}>
            {children}
        </Typography>
    );
}

function SectionBody({ children, empty }: { children: React.ReactNode; empty?: string }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 1, backgroundColor: '#fafafa' }}>
            {children || (
                <Typography color="text.secondary" fontStyle="italic">
                    {empty ?? 'None'}
                </Typography>
            )}
        </Paper>
    );
}

/* ---------- main component ---------- */

export default function FeaturePage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    // Legacy URL: /feature/{genome_ref}/{featureId}
    // The path segments encode the genome ref (all but last) and the feature ID (last segment).
    const allSegments = resolvedParams.path;
    const featureId = allSegments[allSegments.length - 1] || '';
    const genomePath = '/' + allSegments.slice(0, -1).join('/');

    const { data: featureData, isLoading, error } = useQuery({
        queryKey: ['featureDetail', genomePath, featureId],
        queryFn: async () => {
            const wsData = await workspaceGet([genomePath]);
            const genome = parseWorkspaceGetObject<Record<string, unknown>>(wsData);
            if (!genome) throw new Error('Genome object not found at workspace path');
            const feature = extractFeature(genome, featureId);
            if (!feature) throw new Error(`Feature "${featureId}" not found in genome`);
            return feature;
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });

    const genomeDisplayName = useMemo(() => {
        const parts = genomePath.split('/').filter(Boolean);
        return parts[parts.length - 1] || 'Genome';
    }, [genomePath]);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
                <Link href="/genomes" style={{ color: '#00acc1', textDecoration: 'none' }}>
                    Genomes
                </Link>
                <Link
                    href={`/genome${genomePath}`}
                    style={{ color: '#00acc1', textDecoration: 'none' }}
                >
                    {genomeDisplayName}
                </Link>
                <Typography color="text.primary">{featureId}</Typography>
            </Breadcrumbs>

            {/* Title */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                <Typography variant="h4" fontWeight={600}>
                    Genome Feature
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    {featureId}
                </Typography>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }} />

            {/* Loading */}
            {isLoading && (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }} color="text.secondary">
                        Loading feature data…
                    </Typography>
                </Box>
            )}

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mt: 4 }}>
                    Failed to load feature data: {(error as Error).message}.
                </Alert>
            )}

            {/* Feature detail */}
            {!isLoading && !error && featureData && (
                <>
                    {/* Function */}
                    <SectionHeading>Function</SectionHeading>
                    <SectionBody empty="No function present">
                        {featureData.func ? (
                            <Typography>{featureData.func}</Typography>
                        ) : null}
                    </SectionBody>

                    {/* Subsystems */}
                    <SectionHeading>Subsystems</SectionHeading>
                    <SectionBody empty="No subsystem(s) present">
                        {featureData.subsystems.length > 0 ? (
                            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                                {featureData.subsystems.map((sub, i) => (
                                    <li key={i}>
                                        <Typography>{sub}</Typography>
                                    </li>
                                ))}
                            </Box>
                        ) : null}
                    </SectionBody>

                    {/* Aliases */}
                    <SectionHeading>Aliases</SectionHeading>
                    {featureData.aliases.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Alias</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {featureData.aliases.map((alias) => (
                                        <TableRow key={alias.label}>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                                {alias.label}
                                            </TableCell>
                                            <TableCell>
                                                {alias.url ? (
                                                    <a
                                                        href={alias.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: '#00acc1' }}
                                                    >
                                                        {alias.alias}
                                                    </a>
                                                ) : (
                                                    alias.alias
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <SectionBody empty="No alias(es) present">{null}</SectionBody>
                    )}

                    {/* Protein Sequence */}
                    <SectionHeading>Protein Sequence</SectionHeading>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            mb: 1,
                            backgroundColor: '#fafafa',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: 400,
                            overflow: 'auto',
                        }}
                    >
                        {featureData.proteinSequence || 'No protein sequence'}
                    </Paper>
                </>
            )}
        </Container>
    );
}
