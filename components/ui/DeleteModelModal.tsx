'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { deleteModelFromApi } from '@/lib/api/modelseed';

interface DeleteModelModalProps {
    modelRef: string;
    modelId: string;
    onDeleted: () => void;
}

export default function DeleteModelModal({ modelRef, modelId, onDeleted }: DeleteModelModalProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOpen = () => {
        if (isDeleting) return;
        setError(null);
        setOpen(true);
    };

    const handleClose = () => {
        if (isDeleting) return;
        setError(null);
        setOpen(false);
    };

    const handleDelete = async () => {
        setError(null);
        setIsDeleting(true);
        try {
            await deleteModelFromApi(modelRef);
            setOpen(false);
            onDeleted();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete model';
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Button
                variant="text"
                size="small"
                color="error"
                onClick={handleOpen}
                disabled={isDeleting}
                sx={{ textTransform: 'none', minWidth: 0 }}
            >
                Delete
            </Button>
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Model</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Delete <strong>{modelId}</strong>? This action cannot be undone and will remove the model from your workspace.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Full model reference:
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            mt: 0.5,
                            px: 1,
                            py: 0.75,
                            borderRadius: 1,
                            bgcolor: 'grey.100',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                        }}
                    >
                        {modelRef}
                    </Typography>
                    {error && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                            {error}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button color="error" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? (
                            <>
                                <CircularProgress size={14} sx={{ mr: 1 }} />
                                Deleting...
                            </>
                        ) : (
                            'Delete'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
