import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import GitHubIcon from '@mui/icons-material/GitHub';

export default function Footer() {
    return (
        <Box component="footer" sx={{ color: '#fff' }}>
            {/* Upper Footer */}
            <Box sx={{ backgroundColor: '#201838', pt: 6, pb: 2 }}>
                <Container maxWidth="lg">
                    <Grid container spacing={4} justifyContent="center">
                        {/* Column 1: Mailing List */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box sx={{ textAlign: 'center', mb: 6 }}>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>
                                    Join the Mailing List!
                                </Typography>
                                <Box
                                    component="form"
                                    action="//theseed.us11.list-manage.com/subscribe/post?u=dcadcc832fbfbab13d3b62a5e&amp;id=4c3f21e2f7"
                                    method="post"
                                    target="_blank"
                                    noValidate
                                    sx={{ display: 'flex', justifyContent: 'center', gap: 0 }}
                                >
                                    <input
                                        type="email"
                                        name="EMAIL"
                                        placeholder="you@example.com"
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #555',
                                            borderRight: 'none',
                                            borderRadius: 0,
                                            fontSize: '14px',
                                            width: '200px',
                                            backgroundColor: '#fff',
                                            color: '#333',
                                        }}
                                    />
                                    {/* Honeypot field */}
                                    <div style={{ position: 'absolute', left: -5000 }} aria-hidden="true">
                                        <input
                                            type="text"
                                            name="b_dcadcc832fbfbab13d3b62a5e_4c3f21e2f7"
                                            tabIndex={-1}
                                            defaultValue=""
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        sx={{
                                            backgroundColor: '#30BCCF',
                                            borderRadius: 0,
                                            px: 3,
                                            '&:hover': { backgroundColor: '#1ba3b4' },
                                        }}
                                    >
                                        Subscribe
                                    </Button>
                                </Box>
                                <Typography variant="body2" sx={{ mt: 2, fontSize: 16, opacity: 0.85 }}>
                                    Stay up to date with the latest on ModelSEED 2.0.
                                    <br />
                                    Unsubscribe at any time.
                                </Typography>
                            </Box>
                        </Grid>

                        {/* Column 2: GitHub */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box sx={{ textAlign: 'center', mb: 6 }}>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>
                                    On Github!
                                </Typography>
                                <IconButton
                                    component="a"
                                    href="https://github.com/ModelSEED/ModelSEED-UI"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="GitHub"
                                    sx={{
                                        mt: 1,
                                        width: 50,
                                        height: 50,
                                        border: '2px solid #fff',
                                        color: '#fff',
                                        transition: 'all 0.17s ease-in-out',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                        },
                                    }}
                                >
                                    <GitHubIcon />
                                </IconButton>
                            </Box>
                        </Grid>

                        {/* Column 3: About */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box sx={{ textAlign: 'center', mb: 6 }}>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>
                                    About ModelSEED
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: 16, opacity: 0.85 }}>
                                    ModelSEED is a free, open source application created by{' '}
                                    <Link
                                        href="/team"
                                        style={{ color: '#30BCCF', textDecoration: 'none' }}
                                    >
                                        The ModelSEED Team
                                    </Link>
                                    .
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Lower Footer (Copyright) */}
            <Box sx={{ backgroundColor: '#130E21', py: 3, textAlign: 'center' }}>
                <Container maxWidth="lg">
                    <Typography variant="body2" sx={{ fontSize: 14 }}>
                        Copyright &copy; 2015 ModelSEED
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
}
