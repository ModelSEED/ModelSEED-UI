'use client';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { LlmCouncilProposal, ThermodynamicsRecord, ThermoEvidence } from '@/lib/api/biochem';

export interface ThermodynamicsTableProps {
    records: ThermodynamicsRecord[];
    evidence?: ThermoEvidence[];
    llmCouncilProposals?: LlmCouncilProposal[];
    showOperator?: boolean;
}

function displayValue(value: number | null | undefined): string {
    return typeof value === 'number' ? String(value) : 'N/A';
}

function evidenceColor(grade: string | undefined): { background: string; border: string; text: string } {
    switch (grade?.toLowerCase()) {
        case 'gold': return { background: '#713f12', border: '#facc15', text: '#fff' };
        case 'silver': return { background: '#334155', border: '#cbd5e1', text: '#fff' };
        case 'bronze': return { background: '#78350f', border: '#fdba74', text: '#fff' };
        default: return { background: '#334155', border: '#cbd5e1', text: '#fff' };
    }
}

export function DirectionOperator({ direction }: { direction: string }) {
    const isDirectional = direction === '>' || direction === '<';
    const color = direction === '>'
        ? 'success.contrastText'
        : direction === '<'
            ? 'info.contrastText'
            : 'text.primary';
    const backgroundColor = direction === '>'
        ? 'success.main'
        : direction === '<'
            ? 'info.main'
            : 'background.paper';
    return (
        <Box
            component="span"
            className="thermo-direction-operator"
            data-direction={direction}
            aria-label={direction}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 4 * 8,
                px: 0.625,
                py: 0.25,
                border: '1px solid',
                borderColor: isDirectional ? (direction === '>' ? 'success.main' : 'info.main') : 'divider',
                borderRadius: 999,
                bgcolor: backgroundColor,
                color,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '0.08em',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
            }}
        >
            {direction}
        </Box>
    );
}

const EVIDENCE_TOOLTIPS: Record<string, string> = {
    gold: 'Strongest evidence: matches experiment, or the deciding source is >=90% likely to be within 2 kcal/mol.',
    silver: 'Good evidence: the source is >=70% likely to be within 2 kcal/mol, or a second source corroborates it.',
    bronze: 'Weakest evidence: below 70% likely, or contradicted by the other sources.',
    measured: 'Checked directly against an experimental value. Overrides everything else.',
    'self-certain': 'At least 90% likely to land within 2 kcal/mol of the truth.',
    'self-confident': 'At least 70% likely to land within 2 kcal/mol.',
    unconfident: 'Below 70% likely. Most reactions sit here.',
    corroborated: 'Another source agrees, within both their error bars. Can lift bronze to silver, never to gold.',
    outvoted: 'The other sources disagree by more than their error bars allow, and this one is the outlier. Costs a tier.',
    unpaired: 'Only one source scored this reaction, so no cross-check was possible.',
    '(absent)': 'A cross-check ran and settled neither way - it neither helped nor penalised.',
    TECRDB: 'An experimental measurement from the NIST thermodynamics database.',
    eQ: "eQuilibrator's component-contribution estimate.",
    dGP: "dGPredictor's fragment-based estimate.",
    GC: 'The 2008 group-contribution estimate.',
};

export function EvidenceSummary({ item }: { item: ThermoEvidence }) {
    const grade = item.grade ?? 'N/A';
    const assessment = item.assessment ?? 'N/A';
    const crossSource = item.cross_source ?? '(absent)';
    const source = item.source ?? 'N/A';
    const fields = [grade, assessment, crossSource, source];
    const colors = evidenceColor(item.grade);
    return (
        <Box
            className={`thermo-evidence thermo-evidence--${grade.toLowerCase()}`}
            data-grade={grade.toLowerCase()}
            aria-label={`Thermo evidence: grade ${grade}, assessment ${assessment}, cross-source ${crossSource}, source ${source}`}
            sx={{
                display: 'inline-block',
                color: colors.text,
                px: 1,
                py: 0.5,
                border: '1px solid',
                borderColor: colors.border,
                borderRadius: 1,
                fontWeight: 700,
            }}
            style={{ backgroundColor: colors.background }}
        >
            {fields.map((value, index) => {
                const label = index === 0 ? 'grade' : index === 1 ? 'assessment' : index === 2 ? 'cross-source' : 'source';
                return (
                    <Typography component="span" variant="body2" key={`${value}-${index}`}>
                        {index > 0 && '/'}
                        <Tooltip title={EVIDENCE_TOOLTIPS[value] ?? `Thermodynamic evidence ${label}: ${value}.`} arrow>
                            <Box component="span" tabIndex={0} aria-label={`${label} ${value}`} sx={{ outlineOffset: 2 }}>{value}</Box>
                        </Tooltip>
                    </Typography>
                );
            })}
        </Box>
    );
}

export default function ThermodynamicsTable({ records, evidence = [], llmCouncilProposals = [], showOperator }: ThermodynamicsTableProps) {
    if (!Array.isArray(records) || (records.length === 0 && evidence.length === 0 && llmCouncilProposals.length === 0)) return null;
    const showDirection = showOperator || llmCouncilProposals.length > 0;

    return (
        <Table size="small" sx={{ '& td, & th': { py: 0.4 } }}>
            <TableHead>
                <TableRow>
                    <TableCell>Source</TableCell>
                    <TableCell>ΔG (kcal/mol)</TableCell>
                    <TableCell>Error</TableCell>
                    {showDirection && <TableCell>Operator</TableCell>}
                </TableRow>
            </TableHead>
            <TableBody>
                {records.map((record, index) => (
                    <TableRow key={`${record.source_name}-${index}`}>
                        <TableCell><Typography variant="body2">{record.source_name}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{displayValue(record.energy)}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{displayValue(record.error)}</Typography></TableCell>
                        {showDirection && <TableCell><DirectionOperator direction={record.operator || '—'} /></TableCell>}
                    </TableRow>
                ))}
                {llmCouncilProposals.map((proposal, index) => (
                    <TableRow key={`llm-council-${proposal.source_name}-${index}`}>
                        <TableCell><Typography variant="body2">LLM Council</Typography></TableCell>
                        <TableCell><Typography variant="body2">-</Typography></TableCell>
                        <TableCell><Typography variant="body2">-</Typography></TableCell>
                        <TableCell><DirectionOperator direction={proposal.proposed_direction} /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
