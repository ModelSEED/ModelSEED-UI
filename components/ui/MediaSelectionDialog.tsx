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
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listPublicMediaFromApi, listMyMediaFromApi } from '@/lib/api/modelseed';
import ReactionKnockoutsDialog from '@/components/ui/ReactionKnockoutsDialog';

/** Advanced FBA options matching the legacy fba-plant.html configuration */
export interface FbaAdvancedOptions {
    reactionKnockouts: string;
}

interface ModelReaction {
    id: string;
    name: string;
    direction?: string;
    equation?: string;
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
    /** Model reactions for knockout selection dialog */
    modelReactions?: ModelReaction[];
}

export default function MediaSelectionDialog({
    open,
    onClose,
    onConfirm,
    title = 'Select Media for Simulation',
    showAdvancedOptions = false,
    isPlantModel = false,
    modelReactions = [],
}: MediaSelectionDialogProps) {
    const [userSelectedMedia, setUserSelectedMedia] = useState<string>('');
    const [reactionKnockouts, setReactionKnockouts] = useState<string[]>([]);
    const [knockoutsDialogOpen, setKnockoutsDialogOpen] = useState(false);

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
                ? { reactionKnockouts: reactionKnockouts.join(';') }
                : undefined;
            onConfirm(selectedMedia, media?.name || selectedMedia, media?.ref, advanced);
        }
    };

    const handleClose = () => {
        setReactionKnockouts([]);
        onClose();
    };

    const handleSaveKnockouts = (selectedIds: string[]) => {
        setReactionKnockouts(selectedIds);
    };

    const handleRemoveKnockout = (id: string) => {
        setReactionKnockouts(prev => prev.filter(rxnId => rxnId !== id));
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
                                <Box>
                                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                        Reaction Knockouts
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => setKnockoutsDialogOpen(true)}
                                        sx={{ mb: 1 }}
                                    >
                                        {reactionKnockouts.length > 0
                                            ? `Edit Knockouts (${reactionKnockouts.length} selected)`
                                            : 'Select Reactions to Knock Out'}
                                    </Button>
                                    {reactionKnockouts.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                            {reactionKnockouts.map((rxnId) => {
                                                const reaction = modelReactions.find(r => r.id === rxnId);
                                                return (
                                                    <Chip
                                                        key={rxnId}
                                                        label={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <Link
                                                                    href={`/biochem/reactions/${rxnId}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        color: 'inherit',
                                                                        textDecoration: 'none',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 4,
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {rxnId}
                                                                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                                                                </Link>
                                                                {reaction?.name && (
                                                                    <span style={{ opacity: 0.7, fontSize: '0.875em', marginLeft: 4 }}>
                                                                        {reaction.name.substring(0, 20)}
                                                                        {reaction.name.length > 20 ? '...' : ''}
                                                                    </span>
                                                                )}
                                                            </Box>
                                                        }
                                                        onDelete={() => handleRemoveKnockout(rxnId)}
                                                        size="small"
                                                    />
                                                );
                                            })}
                                        </Box>
                                    )}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        Specify reactions to knock out during simulation
                                    </Typography>
                                </Box>
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

            <ReactionKnockoutsDialog
                open={knockoutsDialogOpen}
                onClose={() => setKnockoutsDialogOpen(false)}
                onSave={handleSaveKnockouts}
                reactions={modelReactions}
                initialSelectedIds={reactionKnockouts}
            />
        </Dialog>
    );
}