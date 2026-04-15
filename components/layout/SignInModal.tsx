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
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Image from 'next/image';
import Link from 'next/link';

import { useAuth } from '@/components/auth/AuthProvider';

interface SignInModalProps {
    open: boolean;
    onClose: () => void;
}

export default function SignInModal({ open, onClose }: SignInModalProps) {
    const { login } = useAuth();
    const [method, setMethod] = useState<'RAST' | 'PATRIC'>('PATRIC');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(method, username, password);
            // Success — clear form and close
            setUsername('');
            setPassword('');
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const toggleMethod = () => {
        setMethod(method === 'PATRIC' ? 'RAST' : 'PATRIC');
        setError(null);
    };

    const handleClose = () => {
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableScrollLock>
            <DialogTitle sx={{ m: 0, p: 2, backgroundColor: '#0288d1', color: '#fff', display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 400 }}>
                    Please sign in
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    sx={{ color: '#fff' }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>

                    {/* Left Side - Login Form */}
                    <Box sx={{ flex: '0 0 70%' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontSize: '1.2rem', fontWeight: 500, color: '#333' }}>
                            Sign in with {method} account to continue
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mt: 1, mb: 1 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <form id="signin-form" onSubmit={handleLogin}>
                            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <TextField
                                    label={`${method} Username`}
                                    variant="standard"
                                    fullWidth
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    disabled={loading}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                                <TextField
                                    label="Password"
                                    type="password"
                                    variant="standard"
                                    fullWidth
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 2 }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        disabled={!username || !password || loading}
                                        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                                    >
                                        {loading ? 'Signing in…' : 'Sign In'}
                                    </Button>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <Typography variant="body2">
                                            <a
                                                href={method === 'PATRIC' ? 'https://user.bv-brc.org/register' : 'https://rast.nmpdr.org/rast.cgi?page=Register'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#1976d2', textDecoration: 'none' }}
                                            >
                                                Create new account
                                            </a>
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            <a
                                                href={method === 'PATRIC' ? 'https://user.bv-brc.org/reset-password' : 'https://rast.nmpdr.org/rast.cgi?page=RetrievePassword'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#1976d2', textDecoration: 'none' }}
                                            >
                                                Forgot password?
                                            </a>
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </form>
                    </Box>

                    {/* Right Side - Alternative Login */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body1" sx={{ color: '#555', mb: 2 }}>
                            Or, sign in with:
                        </Typography>

                        <Box
                            onClick={toggleMethod}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                p: 1,
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                            }}
                        >
                            {method === 'RAST' ? (
                                <>
                                    <Image src="/img/patric.jpg" alt="PATRIC" width={50} height={50} />
                                    <Typography variant="body1">PATRIC</Typography>
                                </>
                            ) : (
                                <>
                                    <Image src="/img/seed.png" alt="RAST" width={50} height={50} />
                                    <Typography variant="body1">RAST</Typography>
                                </>
                            )}
                        </Box>

                        
                    </Box>

                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: 'flex-start' }}>
                <Button onClick={handleClose} component={Link} href="/" variant="text" sx={{ color: '#555', textTransform: 'none' }}>
                    Go to homepage
                </Button>
            </DialogActions>
        </Dialog>
    );
}
