'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import { listPublicMediaFromApi, ModelseedMediaSummary } from '@/lib/api/modelseed';

interface MediaSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (mediaId: string, mediaName: string) => void;
    title?: string;
}

export default function MediaSelectionDialog({
    open,
    onClose,
    onConfirm,
    title = 'Select Media for Simulation',
}: MediaSelectionDialogProps) {
    const [mediaList, setMediaList] = useState<ModelseedMediaSummary[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setLoading(true);
            setError(null);
            listPublicMediaFromApi()
                .then((media) => {
                    setMediaList(media);
                    if (media.length > 0) {
                        const defaultMedia = media.find(m => m.name.toLowerCase().includes('complete')) || media[0];
                        setSelectedMedia(defaultMedia.id);
                    }
                })
                .catch((err) => {
                    console.error('Failed to load media:', err);
                    setError('Failed to load media list');
                })
                .finally(() => setLoading(false));
        }
    }, [open]);

    const handleConfirm = () => {
        if (selectedMedia) {
            const media = mediaList.find(m => m.id === selectedMedia);
            onConfirm(selectedMedia, media?.name || selectedMedia);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
            <DialogContent>
                {loading && (
                    <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
                )}
                {error && (
                    <DialogContent sx={{ color: 'error.main' }}>{error}</DialogContent>
                )}
                {!loading && !error && (
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel id="media-select-label">Media</InputLabel>
                        <Select
                            labelId="media-select-label"
                            value={selectedMedia}
                            label="Media"
                            onChange={(e) => setSelectedMedia(e.target.value)}
                        >
                            {mediaList.map((media) => (
                                <MenuItem key={media.id} value={media.id}>
                                    {media.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!selectedMedia || loading}
                >
                    Run
                </Button>
            </DialogActions>
        </Dialog>
    );
}