'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';

interface MetadataEntry {
    key: string;
    value: string | number | boolean | null | undefined;
}

interface Permission {
    user: string;
    level: string;
}

/** Fields that are editable by the user */
const EDITABLE_FIELDS = new Set(['name', 'description']);

/** Fields that should never be displayed as editable */
const READONLY_FIELDS = new Set([
    'owner', 'type', 'uuid', 'id', 'path', 'creation_date',
    'moddate', 'mod_date', 'creation_time', 'workspace_id',
    'ref', 'object_type', 'shocknode', 'autoMetadata',
]);

interface ShowMetadataDialogProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    metadata: MetadataEntry[] | Record<string, unknown>;
    permissions?: Permission[];
    /** When provided, enables save functionality for editable fields */
    onSave?: (updatedMetadata: Record<string, unknown>) => Promise<boolean>;
    /** When true, disables all editing */
    readOnly?: boolean;
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function formatKey(key: string): string {
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
    onSave,
    readOnly = false,
}: ShowMetadataDialogProps) {
    // Normalize metadata to array format
    const metadataArray: MetadataEntry[] = useMemo(
        () =>
            Array.isArray(metadata)
                ? metadata
                : Object.entries(metadata).map(([key, value]) => ({
                      key,
                      value: value as string | number | boolean | null | undefined,
                  })),
        [metadata],
    );

    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Reset edit state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setIsEditing(false);
            setEditValues({});
            setSaveError(null);
        }
    }, [open]);

    const canEdit = !!onSave && !readOnly;

    const hasEditableFields = useMemo(
        () => metadataArray.some((entry) => EDITABLE_FIELDS.has(entry.key)),
        [metadataArray],
    );

    const handleStartEdit = useCallback(() => {
        const initial: Record<string, string> = {};
        for (const entry of metadataArray) {
            if (EDITABLE_FIELDS.has(entry.key)) {
                initial[entry.key] = formatValue(entry.value);
            }
        }
        setEditValues(initial);
        setIsEditing(true);
        setSaveError(null);
    }, [metadataArray]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        setEditValues({});
        setSaveError(null);
    }, []);

    const handleSave = useCallback(async () => {
        if (!onSave) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            const success = await onSave(editValues);
            if (success) {
                setIsEditing(false);
                setEditValues({});
            } else {
                setSaveError('Save failed. Please try again.');
            }
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save metadata');
        } finally {
            setIsSaving(false);
        }
    }, [editValues, onSave]);

    const hasChanges = useMemo(() => {
        for (const entry of metadataArray) {
            if (EDITABLE_FIELDS.has(entry.key)) {
                const original = formatValue(entry.value);
                if (editValues[entry.key] !== undefined && editValues[entry.key] !== original) {
                    return true;
                }
            }
        }
        return false;
    }, [editValues, metadataArray]);

    return (
        <Dialog open={open} onClose={isSaving ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {title}
                {canEdit && hasEditableFields && !isEditing && (
                    <IconButton size="small" onClick={handleStartEdit} title="Edit metadata">
                        <EditIcon fontSize="small" />
                    </IconButton>
                )}
            </DialogTitle>
            <DialogContent>
                {saveError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
                        {saveError}
                    </Alert>
                )}

                {metadataArray.length > 0 ? (
                    <Table size="small">
                        <TableBody>
                            {metadataArray.map((entry, index) => {
                                const isFieldEditable =
                                    isEditing &&
                                    EDITABLE_FIELDS.has(entry.key) &&
                                    !READONLY_FIELDS.has(entry.key);

                                return (
                                    <TableRow key={index}>
                                        <TableCell
                                            component="th"
                                            scope="row"
                                            sx={{ fontWeight: 600, width: '40%', color: 'text.secondary', verticalAlign: 'top', pt: isFieldEditable ? 2.5 : undefined }}
                                        >
                                            {formatKey(entry.key)}
                                        </TableCell>
                                        <TableCell sx={{ wordBreak: 'break-word' }}>
                                            {isFieldEditable ? (
                                                <TextField
                                                    value={editValues[entry.key] ?? ''}
                                                    onChange={(e) =>
                                                        setEditValues((prev) => ({
                                                            ...prev,
                                                            [entry.key]: e.target.value,
                                                        }))
                                                    }
                                                    fullWidth
                                                    size="small"
                                                    multiline={entry.key === 'description'}
                                                    minRows={entry.key === 'description' ? 2 : 1}
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                formatValue(entry.value)
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
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
                {isEditing ? (
                    <>
                        <Button onClick={handleCancelEdit} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            disabled={!hasChanges || isSaving}
                            startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
                        >
                            {isSaving ? 'Saving…' : 'Save'}
                        </Button>
                    </>
                ) : (
                    <Button onClick={onClose}>Close</Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
