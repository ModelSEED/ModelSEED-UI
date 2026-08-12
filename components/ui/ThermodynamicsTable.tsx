'use client';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ThermodynamicsRecord } from '@/lib/api/biochem';

export interface ThermodynamicsTableProps {
    records: ThermodynamicsRecord[];
    showOperator?: boolean;
}

function displayValue(value: number | null | undefined): string {
    return typeof value === 'number' ? String(value) : 'N/A';
}

export default function ThermodynamicsTable({ records, showOperator }: ThermodynamicsTableProps) {
    if (!Array.isArray(records) || records.length === 0) return null;

    return (
        <Table size="small" sx={{ '& td, & th': { py: 0.4 } }}>
            <TableHead>
                <TableRow>
                    <TableCell>Source</TableCell>
                    <TableCell>ΔG (kcal/mol)</TableCell>
                    <TableCell>Error</TableCell>
                    {showOperator && <TableCell>Operator</TableCell>}
                </TableRow>
            </TableHead>
            <TableBody>
                {records.map((record, index) => (
                    <TableRow key={`${record.source_name}-${index}`}>
                        <TableCell>
                            <Typography variant="body2">{record.source_name}</Typography>
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2">{displayValue(record.energy)}</Typography>
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2">{displayValue(record.error)}</Typography>
                        </TableCell>
                        {showOperator && (
                            <TableCell>
                                <Typography variant="body2">{record.operator || '—'}</Typography>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
