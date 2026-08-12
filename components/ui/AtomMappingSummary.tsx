'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import NextLink from 'next/link';
import {
    parseAtomMappings,
    groupAtomMappingsByCompound,
    countAtomsPerElement,
} from '@/lib/utils/atomMapping';

export interface AtomMappingSummaryProps {
    entries: readonly string[] | undefined;
    confidence?: string;
}

function confidenceColor(value: string): 'success' | 'warning' | 'default' {
    if (value === 'clean') return 'success';
    if (value === 'salvaged') return 'warning';
    return 'default';
}

const compoundLinkStyle = { color: '#00838f', textDecoration: 'none', fontWeight: 600 };

export default function AtomMappingSummary({ entries, confidence }: AtomMappingSummaryProps) {
    const pairs = useMemo(() => parseAtomMappings(entries), [entries]);
    const [showAll, setShowAll] = useState(false);

    if (pairs.length === 0) return null;

    const groups = groupAtomMappingsByCompound(pairs);
    const compoundIds = Array.from(groups.keys());
    const elementCounts = countAtomsPerElement(pairs);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {pairs.length} atom mappings across {compoundIds.length} compounds
                </Typography>
                {typeof confidence === 'string' && confidence.length > 0 && (
                    <Chip size="small" label={confidence} color={confidenceColor(confidence)} />
                )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                {compoundIds.map((compoundId) => {
                    const counts = elementCounts.get(compoundId);
                    const countText = counts
                        ? Array.from(counts.entries())
                              .map(([element, count]) => `${element} x${count}`)
                              .join(', ')
                        : '';
                    return (
                        <Box
                            key={compoundId}
                            sx={{ display: 'flex', gap: 0.4, alignItems: 'baseline', flexWrap: 'wrap' }}
                        >
                            <NextLink href={`/biochem/compounds/${compoundId}`} style={compoundLinkStyle}>
                                {compoundId}
                            </NextLink>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                : {countText}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            <Box>
                <Button
                    size="small"
                    onClick={() => setShowAll((prev) => !prev)}
                    sx={{ textTransform: 'none', px: 0 }}
                >
                    {showAll ? 'Hide all mappings' : 'Show all mappings'}
                </Button>
                <Collapse in={showAll} unmountOnExit>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                        {pairs.map((pair, index) => (
                            <Typography
                                key={`${pair.raw}-${index}`}
                                variant="body2"
                                sx={{ fontFamily: 'monospace' }}
                            >
                                {pair.raw}
                            </Typography>
                        ))}
                    </Box>
                </Collapse>
            </Box>
        </Box>
    );
}
