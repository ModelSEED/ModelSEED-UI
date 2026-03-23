'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

interface MetadataEntry {
    key: string;
    value: string | number | boolean | null | undefined;
}

interface Permission {
    user: string;
    level: string;
}

interface ShowMetadataDialogProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    metadata: MetadataEntry[] | Record<string, unknown>;
    permissions?: Permission[];
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function formatKey(key: string): string {
    // Convert camelCase or snake_case to readable format
    return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}

export default function ShowMetadataDialog({
    open,
    onClose,
    title = 'Metadata',
    metadata,
    permissions,
}: ShowMetadataDialogProps) {
    // Normalize metadata to array format
    const metadataArray: MetadataEntry[] = Array.isArray(metadata)
        ? metadata
        : Object.entries(metadata).map(([key, value]) => ({
              key,
              value: value as string | number | boolean | null | undefined,
          }));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {metadataArray.length > 0 ? (
                    <Table size="small">
                        <TableBody>
                            {metadataArray.map((entry, index) => (
                                <TableRow key={index}>
                                    <TableCell
                                        component="th"
                                        scope="row"
                                        sx={{ fontWeight: 600, width: '40%', color: 'text.secondary' }}
                                    >
                                        {formatKey(entry.key)}
                                    </TableCell>
                                    <TableCell sx={{ wordBreak: 'break-word' }}>
                                        {formatValue(entry.value)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No metadata available
                    </Typography>
                )}

                {permissions && permissions.length > 0 && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" gutterBottom>
                            Permissions
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {permissions.map((perm, index) => (
                                <Chip
                                    key={index}
                                    label={`${perm.user}: ${perm.level}`}
                                    size="small"
                                    variant="outlined"
                                    color={perm.level === 'owner' ? 'primary' : 'default'}
                                />
                            ))}
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
