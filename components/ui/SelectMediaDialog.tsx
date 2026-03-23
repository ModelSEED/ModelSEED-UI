'use client';

import { useState, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useQuery } from '@tanstack/react-query';
import { listPublicMediaFromApi, listMyMediaFromApi, type ModelseedMediaSummary } from '@/lib/api/modelseed';
import { useAuth } from '@/components/auth/AuthProvider';

interface SelectMediaDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (media: ModelseedMediaSummary) => void;
    title?: string;
}

export default function SelectMediaDialog({
    open,
    onClose,
    onSelect,
    title = 'Select Media',
}: SelectMediaDialogProps) {
    const { isAuthenticated } = useAuth();
    const [selectedMedia, setSelectedMedia] = useState<ModelseedMediaSummary | null>(null);

    // Fetch public media
    const { data: publicMedia, isLoading: loadingPublic } = useQuery({
        queryKey: ['public-media'],
        queryFn: listPublicMediaFromApi,
        enabled: open,
    });

    // Fetch user media (only if authenticated)
    const { data: userMedia, isLoading: loadingUser } = useQuery({
        queryKey: ['user-media'],
        queryFn: listMyMediaFromApi,
        enabled: open && isAuthenticated,
    });

    // Combine and deduplicate media
    const allMedia = useMemo(() => {
        const combined: ModelseedMediaSummary[] = [];
        const seenIds = new Set<string>();

        // Add user media first (prioritize)
        if (userMedia) {
            for (const m of userMedia) {
                if (!seenIds.has(m.id)) {
                    seenIds.add(m.id);
                    combined.push({ ...m, _source: 'user' } as ModelseedMediaSummary & { _source: string });
                }
            }
        }

        // Add public media
        if (publicMedia) {
            for (const m of publicMedia) {
                if (!seenIds.has(m.id)) {
                    seenIds.add(m.id);
                    combined.push({ ...m, _source: 'public' } as ModelseedMediaSummary & { _source: string });
                }
            }
        }

        return combined;
    }, [publicMedia, userMedia]);

    const isLoading = loadingPublic || loadingUser;

    const handleSelect = () => {
        if (selectedMedia) {
            onSelect(selectedMedia);
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedMedia(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Autocomplete
                            options={allMedia}
                            getOptionLabel={(option) => `${option.id} - ${option.name || option.id}`}
                            value={selectedMedia}
                            onChange={(_, newValue) => setSelectedMedia(newValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Search media"
                                    placeholder="Type to search..."
                                    autoFocus
                                />
                            )}
                            renderOption={(props, option) => {
                                const { key, ...rest } = props;
                                const source = (option as ModelseedMediaSummary & { _source?: string })._source;
                                return (
                                    <li key={key} {...rest}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                            <Typography variant="body2" sx={{ flex: 1 }}>
                                                {option.id}
                                                {option.name && option.name !== option.id && (
                                                    <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                                                        ({option.name})
                                                    </Typography>
                                                )}
                                            </Typography>
                                            {source === 'user' && (
                                                <Chip label="My Media" size="small" color="primary" variant="outlined" />
                                            )}
                                            {option.isMinimal && (
                                                <Chip label="Minimal" size="small" variant="outlined" />
                                            )}
                                        </Box>
                                    </li>
                                );
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            noOptionsText="No media found"
                        />
                    )}

                    {selectedMedia && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Selected: {selectedMedia.id}
                            </Typography>
                            {selectedMedia.name && (
                                <Typography variant="body2" color="text.secondary">
                                    Name: {selectedMedia.name}
                                </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                Type: {selectedMedia.type || 'Standard'}
                            </Typography>
                            {selectedMedia.isMinimal !== undefined && (
                                <Typography variant="body2" color="text.secondary">
                                    Minimal: {selectedMedia.isMinimal ? 'Yes' : 'No'}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSelect}
                    disabled={!selectedMedia}
                >
                    Select
                </Button>
            </DialogActions>
        </Dialog>
    );
}
