'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import styles from './home.module.css';
import { useAuth } from '@/components/auth/AuthProvider';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

type AuthMethod = 'rast' | 'patric';

const AUTH_METHODS = {
    rast: {
        name: 'RAST',
        newAccountURL: 'http://rast.nmpdr.org/rast.cgi?page=Register',
        forgotPasswordUrl: 'http://rast.nmpdr.org/rast.cgi?page=RequestNewPassword',
    },
    patric: {
        name: 'PATRIC',
        newAccountURL: 'http://rast.nmpdr.org/rast.cgi?page=Register',
        forgotPasswordUrl: 'http://rast.nmpdr.org/rast.cgi?page=RequestNewPassword',
    },
};

const FEATURES_ROW_1 = [
    {
        image: '/img/home/fast.png',
        alt: 'Fast',
        title: 'Fast',
        description: 'Faster reconstruction and gapfilling of models from annotated genomes',
        width: 170,
    },
    {
        image: '/img/home/pencil.png',
        alt: 'Easy',
        title: 'Easy',
        description: 'Editable media, models, and more makes experimenting with models a breeze',
        width: 150,
    },
    {
        image: null, // special composite
        alt: 'Microbes and Plants',
        title: 'Microbes and Plants',
        description: 'Unified resources for microbial and plant modeling, allowing for cross-disciplinary research',
        width: 0,
    },
];

const FEATURES_ROW_2 = [
    {
        image: '/img/home/test-tubes.png',
        alt: 'Enabling Science',
        title: 'Enabling Science',
        description: 'Incorporating cutting-edge and experimental methods/algorithms',
        width: 160,
    },
    {
        image: '/img/home/box.png',
        alt: 'Open Source',
        title: 'Open Source',
        description: 'Open source with community contributions',
        width: 170,
    },
    {
        image: '/img/home/code.png',
        alt: 'Programatic Access',
        title: 'Programatic Access',
        description: 'API clients for Perl and Python are currently available here.',
        width: 170,
    },
];

function HomePageContent() {
    const [method, setMethod] = useState<AuthMethod>('rast');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isAuthenticated, user, loading } = useAuth();

    const currentMethod = AUTH_METHODS[method];
    const altMethod = method === 'rast' ? 'patric' : 'rast';

    useEffect(() => {
        if (isAuthenticated) {
            const returnTo = searchParams.get('returnTo');
            if (returnTo) {
                router.push(returnTo);
            }
        }
    }, [isAuthenticated, searchParams, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password || loading) return;
        setError(null);
        try {
            const authMethod = method === 'rast' ? 'RAST' : 'PATRIC';
            await login(authMethod, username, password);
        } catch (err) {
            console.error('Failed to login from home page', err);
            setError('Sign in failed. Please check your credentials and try again.');
        }
    };

    return (
        <>
            {/* ─── HERO HEADER ─── */}
            <Box component="header" className={styles.hero}>
                <Container maxWidth="lg">
                    <Grid container spacing={4} alignItems="flex-start">
                        {/* Left: Logo + Biochemistry Button */}
                        <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
                            <Box className={styles.introText}>
                                <Image
                                    src="/img/ModelSEED-logo-horizontal.png"
                                    alt="ModelSEED"
                                    width={280}
                                    height={70}
                                    style={{ objectFit: 'contain' }}
                                    priority
                                />
                                <Typography className={styles.logoSubText}>
                                    Metabolic Modeling Made Simple.
                                </Typography>
                                <Button
                                    component={Link}
                                    href="/biochem/reactions"
                                    variant="contained"
                                    className={styles.biochemButton}
                                    sx={{
                                        backgroundColor: '#30BCCF',
                                        color: '#fff',
                                        lineHeight: 1.3,
                                        '&:hover': { backgroundColor: '#1ba3b4' },
                                    }}
                                >
                                    <span>
                                        Biochemistry
                                        <br />
                                        <small style={{ fontSize: '0.55em' }}>(No login required)</small>
                                    </span>
                                </Button>
                            </Box>
                        </Grid>

                        {/* Center: Login Form or Authenticated Summary */}
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Box className={styles.login}>
                                {isAuthenticated ? (
                                    <>
                                        <Typography variant="h6" sx={{ mb: 2 }}>
                                            Welcome back{user ? `, ${user}` : ''}.
                                        </Typography>
                                        <Typography sx={{ mb: 2 }}>
                                            You are signed in. Continue exploring ModelSEED resources.
                                        </Typography>
                                        <Button
                                            component={Link}
                                            href="/biochem/reactions"
                                            variant="contained"
                                            sx={{
                                                backgroundColor: '#30BCCF',
                                                '&:hover': { backgroundColor: '#1ba3b4' },
                                            }}
                                        >
                                            Continue to ModelSEED
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h6" sx={{ mb: 2 }}>
                                            Sign in with {currentMethod.name} account to continue
                                        </Typography>
                                        {error && (
                                            <Alert severity="error" sx={{ mb: 2 }}>
                                                <AlertTitle>Error</AlertTitle>
                                                {error}
                                            </Alert>
                                        )}
                                        <Box component="form" noValidate autoComplete="off" onSubmit={handleSubmit}>
                                            <TextField
                                                label={`${currentMethod.name} Username`}
                                                variant="standard"
                                                fullWidth
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                sx={{ mb: 2 }}
                                            />
                                            <TextField
                                                label="Password"
                                                type="password"
                                                variant="standard"
                                                fullWidth
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                sx={{ mb: 2 }}
                                            />
                                            <Button
                                                variant="contained"
                                                type="submit"
                                                disabled={!username || !password || loading}
                                                sx={{
                                                    backgroundColor: '#30BCCF',
                                                    '&:hover': { backgroundColor: '#1ba3b4' },
                                                }}
                                            >
                                                {loading ? 'Signing In…' : 'Sign In'}
                                            </Button>
                                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <Typography
                                                    component="a"
                                                    href={currentMethod.newAccountURL}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    variant="body2"
                                                    sx={{ color: '#30BCCF', textDecoration: 'none', '&:hover': { color: '#006C86' } }}
                                                >
                                                    Create new account
                                                </Typography>
                                                <Typography
                                                    component="a"
                                                    href={currentMethod.forgotPasswordUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    variant="body2"
                                                    sx={{ color: '#30BCCF', textDecoration: 'none', '&:hover': { color: '#006C86' } }}
                                                >
                                                    Forgot password?
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Box>
                        </Grid>

                        {/* Right: Alt Login Toggle (hidden when already authenticated) */}
                        {!isAuthenticated && (
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Box className={styles.altLoginContainer}>
                                    <Typography variant="body2">Or, sign in with:</Typography>
                                    <Box
                                        className={styles.altLogin}
                                        onClick={() => setMethod(altMethod)}
                                    >
                                        <Image
                                            src={altMethod === 'patric' ? '/img/patric.jpg' : '/img/seed.png'}
                                            alt={AUTH_METHODS[altMethod].name}
                                            width={50}
                                            height={50}
                                        />
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {AUTH_METHODS[altMethod].name}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </Container>
            </Box>

            {/* ─── WHAT IS MODELSEED? FEATURES ─── */}
            <Box component="section" className={styles.about}>
                <Container maxWidth="lg">
                    <Typography variant="h2" sx={{ color: '#04A0B5', fontSize: '3em', mb: 1 }}>
                        What is the ModelSEED?
                    </Typography>
                    <Typography sx={{ fontWeight: 200, fontSize: 20, mb: 5 }}>
                        ModelSEED is a resource for the reconstruction, exploration, comparison, and analysis of metabolic models.
                    </Typography>

                    {/* Row 1 */}
                    <Box sx={{ mb: 3 }}>
                        {FEATURES_ROW_1.map((feat) => (
                            <Box key={feat.title} className={styles.aboutItem}>
                                {feat.image ? (
                                    <Image
                                        src={feat.image}
                                        alt={feat.alt}
                                        width={feat.width}
                                        height={feat.width}
                                        style={{ objectFit: 'contain' }}
                                    />
                                ) : (
                                    <Box sx={{ height: 170, position: 'relative' }}>
                                        <Image
                                            src="/img/home/leaves.png"
                                            alt="Plants"
                                            width={120}
                                            height={120}
                                            className={styles.plantImg}
                                            style={{ objectFit: 'contain' }}
                                        />
                                        <Image
                                            src="/img/home/microbes.png"
                                            alt="Microbes"
                                            width={70}
                                            height={70}
                                            className={styles.microbeImg}
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </Box>
                                )}
                                <h4>{feat.title}</h4>
                                <small>{feat.description}</small>
                            </Box>
                        ))}
                    </Box>

                    {/* Row 2 */}
                    <Box>
                        {FEATURES_ROW_2.map((feat) => (
                            <Box key={feat.title} className={styles.aboutItem}>
                                <Image
                                    src={feat.image}
                                    alt={feat.alt}
                                    width={feat.width}
                                    height={feat.width}
                                    style={{ objectFit: 'contain' }}
                                />
                                <h4>{feat.title}</h4>
                                <small>
                                    {feat.title === 'Programatic Access' ? (
                                        <>
                                            API clients for Perl and Python are currently available{' '}
                                            <Link href="/about/version" style={{ color: '#30BCCF' }}>
                                                here
                                            </Link>
                                            .
                                        </>
                                    ) : (
                                        feat.description
                                    )}
                                </small>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>


            {/* ─── MORE INFO ─── */}
            <Box component="section" className={styles.moreInfo}>
                <Container maxWidth="lg">
                    <Typography variant="h2" sx={{ fontSize: '2.5em', mb: 3 }}>
                        More Info
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                        Utilized Data Sources
                    </Typography>
                    <Typography>
                        Data sources ModelSEED relies on are listed{' '}
                        <Link href="/about/data-sources" style={{ color: '#30BCCF', textDecoration: 'none' }}>
                            here
                        </Link>
                        .
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                        Sources Funding Development
                    </Typography>
                    <Typography sx={{ lineHeight: 1.7 }}>
                        This site and the tools and data hosted by it were developed and are maintained with support
                        from the U.S. Department of Energy, Office of Biological and Environmental Research; under
                        contract DE-AC02-06CH11357 (KBase project) and by the National Science Foundation under grant
                        numbers PGRP-1025398 (for PlantSEED), MCB-1153357 (for ModelSEED modeling), PGRP-1444202 (for
                        ModelSEED biochemistry), and MCB-1611952 (for ModelSEED modeling).
                    </Typography>
                    <Typography sx={{ mt: 2, lineHeight: 1.7 }}>
                        This material was based upon work supported by the U.S. Department of Energy, Office of
                        Biological and Environmental Research; under contract DE-AC02-06CH11357 and by the National
                        Science Foundation grant number MCB-1153357
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                        Citing the ModelSEED
                    </Typography>
                    <Typography sx={{ lineHeight: 1.7 }}>
                        Henry, C.S., DeJongh, M., Best, A.B., Frybarger, P.M., Linsay, B., and R.L. Stevens.
                        High-throughput Generation and Optimization of Genome-scale Metabolic Models. Nature
                        Biotechnology, (2010).
                    </Typography>
                    <Typography sx={{ mt: 1 }}>[New citation to follow]</Typography>

                    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                        Questions, comments, and bug reports?
                    </Typography>
                    <Typography>
                        <a href="mailto:help@modelseed.org" style={{ color: '#30BCCF', textDecoration: 'none' }}>
                            Contact us
                        </a>
                    </Typography>
                </Container>
            </Box>
        </>
    );
}

export default function HomePage() {
    return (
        <Suspense fallback={<div />}>
            <HomePageContent />
        </Suspense>
    );
}
