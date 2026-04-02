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
import TextField from '@mui/material/TextField';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { listPublicMediaFromApi, listMyMediaFromApi } from '@/lib/api/modelseed';

/** Advanced FBA options matching the legacy fba-plant.html configuration */
export interface FbaAdvancedOptions {
    reactionKnockouts: string;
}

interface MediaSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (
        mediaId: string,
        mediaName: string,
        mediaRef?: string,
        advancedOptions?: FbaAdvancedOptions,
    ) => void;
    title?: string;
    /** Whether to show advanced FBA options (reaction knockouts, etc.) */
    showAdvancedOptions?: boolean;
    /** Whether the model is a plant model — adjusts default messages */
    isPlantModel?: boolean;
}

export default function MediaSelectionDialog({
    open,
    onClose,
    onConfirm,
    title = 'Select Media for Simulation',
    showAdvancedOptions = false,
    isPlantModel = false,
}: MediaSelectionDialogProps) {
    const [userSelectedMedia, setUserSelectedMedia] = useState<string>('');
    const [reactionKnockouts, setReactionKnockouts] = useState('');

    const { data: mediaList = [], isLoading, error } = useQuery({
        queryKey: ['all-media-list'],
        queryFn: async () => {
            const [publicMedia, myMedia] = await Promise.all([
                listPublicMediaFromApi(),
                listMyMediaFromApi(),
            ]);
            const seen = new Set<string>();
            const combined = [...publicMedia, ...myMedia];
            return combined.filter(m => {
                if (seen.has(m.id)) return false;
                seen.add(m.id);
                return true;
            });
        },
        enabled: open,
        staleTime: 5 * 60 * 1000,
    });

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
            const advanced: FbaAdvancedOptions | undefined = showAdvancedOptions
                ? { reactionKnockouts: reactionKnockouts.trim() }
                : undefined;
            onConfirm(selectedMedia, media?.name || selectedMedia, media?.ref, advanced);
        }
    };

    const handleClose = () => {
        setReactionKnockouts('');
        onClose();
    };

    const defaultMediaNote = isPlantModel
        ? 'Plant Heterotrophic Media is used by default.'
        : 'Complete media is used by default.';

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {defaultMediaNote}
                </Typography>

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

                {showAdvancedOptions && (
                    <Accordion
                        disableGutters
                        elevation={0}
                        sx={{
                            mt: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            '&::before': { display: 'none' },
                        }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">Advanced Options</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Reaction Knockouts"
                                    value={reactionKnockouts}
                                    onChange={(e) => setReactionKnockouts(e.target.value)}
                                    placeholder="rxn00001;rxn00002 (semicolon-separated)"
                                    helperText="Specify reaction IDs to knock out during simulation, separated by semicolons."
                                    fullWidth
                                    size="small"
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
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