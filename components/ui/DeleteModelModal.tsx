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
                onClick={() => setOpen(true)}
                sx={{ textTransform: 'none', minWidth: 0 }}
            >
                Delete
            </Button>
            <Dialog open={open} onClose={() => !isDeleting && setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Model</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Delete <strong>{modelId}</strong>? This action cannot be undone.
                    </Typography>
                    {error && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                            {error}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={isDeleting}>
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
