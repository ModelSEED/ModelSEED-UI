'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

interface SignInModalProps {
    open: boolean;
    onClose: () => void;
}

export default function SignInModal({ open, onClose }: SignInModalProps) {
    const [loginMethod, setLoginMethod] = useState<'patric' | 'rast'>('rast');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Since this is a mockup for now, just close the modal.
        // In a real implementation we would authenticate with the backend,
        // set user state, and save token via a provider.
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="h6" fontWeight="bold">Sign In</Typography>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                        variant={loginMethod === 'patric' ? 'contained' : 'outlined'}
                        onClick={() => setLoginMethod('patric')}
                        size="small"
                        color="primary"
                    >
                        PATRIC
                    </Button>
                    <Button
                        variant={loginMethod === 'rast' ? 'contained' : 'outlined'}
                        onClick={() => setLoginMethod('rast')}
                        size="small"
                        color="primary"
                    >
                        RAST
                    </Button>
                </Box>

                <form id="signin-form" onSubmit={handleLogin}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Username"
                            variant="outlined"
                            fullWidth
                            size="small"
                            required
                        />
                        <TextField
                            label="Password"
                            type="password"
                            variant="outlined"
                            fullWidth
                            size="small"
                            required
                        />
                    </Stack>
                </form>

                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
                    Use the same Email/Username and Password as you use to login to PATRIC.
                </Typography>

                <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                    Not registered? <a href="https://p3.theseed.org/register" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>Register here.</a>
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button type="submit" form="signin-form" variant="contained" color="primary">
                    Sign In
                </Button>
            </DialogActions>
        </Dialog>
    );
}
