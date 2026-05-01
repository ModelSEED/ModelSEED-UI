'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { copyModelFromApi } from '@/lib/api/modelseed';
import { useAuth } from '@/components/auth/AuthProvider';
import { extractTrackedJobId, trackJob } from '@/lib/api/jobTracker';

interface CopyModelModalProps {
    open: boolean;
    onClose: () => void;
    sourcePath: string;
    modelName: string;
}

export default function CopyModelModal({ open, onClose, sourcePath, modelName }: CopyModelModalProps) {
    const { user } = useAuth();
    const [newName, setNewName] = useState(`Copy_of_${modelName}`);
    const [isCopying, setIsCopying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const outputPath = user ? `/${user}/modelseed` : null;
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (open) {
            setNewName(`Copy_of_${modelName}`);
            setError(null);
            setSuccess(false);
        }
    }, [open, modelName]);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    const handleCopy = useCallback(async () => {
        if (!user || !outputPath) {
            setError('You must be logged in to copy a model');
            return;
        }

        if (!newName.trim()) {
            setError('Model name is required');
            return;
        }

        const trimmedName = newName.trim();
        if (!/^[A-Za-z0-9_.-]+$/.test(trimmedName)) {
            setError('Model name can only include letters, numbers, dot, underscore, and hyphen');
            return;
        }

        setIsCopying(true);
        setError(null);
        setSuccess(false);

        try {
            const destinationPath = `${outputPath}/${trimmedName}`;
            const payload = {
                objects: [[sourcePath, destinationPath]],
            };

            const result = await copyModelFromApi(payload);

            const jobId = extractTrackedJobId(result);
            if (jobId && user) {
                trackJob({
                    id: jobId,
                    kind: 'copy',
                    label: `Copy ${modelName} to ${newName}`,
                    modelId: trimmedName,
                    relatedRef: destinationPath,
                    submittedAt: new Date().toISOString(),
                });
            }

            setSuccess(true);
            closeTimeoutRef.current = setTimeout(() => {
                onClose();
                // Reset state after closing
                setNewName(`Copy_of_${modelName}`);
                setSuccess(false);
                closeTimeoutRef.current = null;
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to copy model');
        } finally {
            setIsCopying(false);
        }
    }, [newName, outputPath, sourcePath, modelName, onClose, user]);

    const handleClose = useCallback(() => {
        if (isCopying) return;
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        onClose();
        setError(null);
        setSuccess(false);
        setNewName(`Copy_of_${modelName}`);
    }, [isCopying, onClose, modelName]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Copy Model to My Workspace</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    This will create a copy of &quot;{modelName}&quot; in your workspace. You can then edit the copied model.
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Model copied successfully! You can find it in &quot;My Models&quot;.
                    </Alert>
                )}

                <TextField
                    label="New Model Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    fullWidth
                    disabled={isCopying || success}
                    sx={{ mb: 2 }}
                />

                <Typography variant="caption" color="text.secondary">
                    Destination: {(outputPath ?? '[login required]')}/{newName || '[model name]'}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isCopying}>
                    {success ? 'Close' : 'Cancel'}
                </Button>
                {!success && (
                    <Button
                        variant="contained"
                        onClick={handleCopy}
                        disabled={isCopying || !newName.trim()}
                    >
                        {isCopying ? 'Copying...' : 'Copy Model'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
