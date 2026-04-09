'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

interface SaveAsDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (newName: string) => Promise<void>;
    currentName?: string;
    entityType?: string;
}

export default function SaveAsDialog({
    open,
    onClose,
    onSave,
    currentName = '',
    entityType = 'model',
}: SaveAsDialogProps) {
    const [newName, setNewName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        const trimmedName = newName.trim();

        if (!trimmedName) {
            setError('Name is required');
            return;
        }

        // Validate name (alphanumeric, underscores, hyphens)
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
            setError('Name can only contain letters, numbers, underscores, and hyphens');
            return;
        }

        if (trimmedName === currentName) {
            setError('Please enter a different name');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(trimmedName);
            handleClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save. Please try again.';
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (isSaving) return;
        setNewName('');
        setError(null);
        onClose();
    };

    const handleNameChange = (value: string) => {
        setNewName(value);
        if (error) setError(null);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Save {entityType} As</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    {currentName && (
                        <Box sx={{ mb: 2, color: 'text.secondary' }}>
                            Current name: <strong>{currentName}</strong>
                        </Box>
                    )}

                    <TextField
                        autoFocus
                        fullWidth
                        label={`New ${entityType} name`}
                        value={newName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Enter a new name"
                        error={!!error}
                        disabled={isSaving}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isSaving) {
                                handleSave();
                            }
                        }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isSaving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving || !newName.trim()}
                    startIcon={isSaving ? <CircularProgress size={16} /> : null}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
