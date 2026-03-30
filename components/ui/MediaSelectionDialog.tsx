'use client';

import { useState, useMemo } from 'react';
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
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { listPublicMediaFromApi } from '@/lib/api/modelseed';

interface MediaSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (mediaId: string, mediaName: string, mediaRef?: string) => void;
    title?: string;
}

export default function MediaSelectionDialog({
    open,
    onClose,
    onConfirm,
    title = 'Select Media for Simulation',
}: MediaSelectionDialogProps) {
    const [userSelectedMedia, setUserSelectedMedia] = useState<string>('');

    const { data: mediaList = [], isLoading, error } = useQuery({
        queryKey: ['public-media-list'],
        queryFn: listPublicMediaFromApi,
        enabled: open,
        staleTime: 5 * 60 * 1000,
    });

    // Derive the effective selection: user choice or default from loaded list
    const selectedMedia = useMemo(() => {
        if (userSelectedMedia) return userSelectedMedia;
        if (mediaList.length > 0) {
            const defaultMedia = mediaList.find(m => m.name.toLowerCase().includes('complete')) || mediaList[0];
            return defaultMedia.id;
        }
        return '';
    }, [userSelectedMedia, mediaList]);

    const handleConfirm = () => {
        if (selectedMedia) {
            const media = mediaList.find(m => m.id === selectedMedia);
            onConfirm(selectedMedia, media?.name || selectedMedia, media?.ref);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
            <DialogContent>
                {isLoading && (
                    <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
                )}
                {error && (
                    <Typography sx={{ color: 'error.main' }}>Failed to load media list</Typography>
                )}
                {!isLoading && !error && (
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel id="media-select-label">Media</InputLabel>
                        <Select
                            labelId="media-select-label"
                            value={selectedMedia}
                            label="Media"
                            onChange={(e) => setUserSelectedMedia(e.target.value)}
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
                    disabled={!selectedMedia || isLoading}
                >
                    Run
                </Button>
            </DialogActions>
        </Dialog>
    );
}