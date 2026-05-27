import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { submitReactionComment } from '@/lib/api/reactionComments';

interface ReactionCommentModalProps {
    open: boolean;
    onClose: () => void;
    reactionId: string | null;
}

export default function ReactionCommentModal({ open, onClose, reactionId }: ReactionCommentModalProps) {
    const [isAlias, setIsAlias] = useState(false);
    const [wrongStoichiometry, setWrongStoichiometry] = useState(false);
    const [comments, setComments] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reactionId) {
            alert('Unable to submit comment: reaction ID is missing.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { message } = await submitReactionComment({
                reactionId,
                isAlias,
                wrongStoichiometry,
                remarks: comments,
                email,
            });
            alert(message);

            // Reset and close
            setIsAlias(false);
            setWrongStoichiometry(false);
            setComments('');
            setEmail('');
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to submit comment.';
            alert(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 1 }
            }}
        >
            <DialogTitle sx={{
                bgcolor: '#00acc1', // Cyan header 
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1.5
            }}>
                <Typography variant="h6" component="span" fontWeight={500}>
                    Comment on Reaction: {reactionId}
                </Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                    Please let us know if you found an issue with this reaction. Your feedback helps us improve the database.
                </Typography>

                <Box>
                    <FormControlLabel
                        control={<Checkbox checked={isAlias} onChange={(e) => setIsAlias(e.target.checked)} />}
                        label="Is this reaction an alias for another?"
                    />
                    <FormControlLabel
                        control={<Checkbox checked={wrongStoichiometry} onChange={(e) => setWrongStoichiometry(e.target.checked)} />}
                        label="Does it have wrong stoichiometry?"
                    />
                </Box>

                <TextField
                    label="Other Comments"
                    multiline
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="Provide any additional details..."
                />

                <TextField
                    label="Email (optional)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    fullWidth
                    size="small"
                />
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{ bgcolor: '#00acc1', '&:hover': { bgcolor: '#008ba3' } }}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
