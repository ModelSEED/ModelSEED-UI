import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import Image from 'next/image';

const SERVICES = [
    { service: 'RAST Auth', endpoint: 'https://p3.theseed.org/Sessions/Login', api: null },
    { service: 'PATRIC Auth', endpoint: 'https://user.patricbrc.org/authenticate', api: null },
    { service: 'Shock', endpoint: 'https://p3.theseed.org/services/shock_api', link: 'https://github.com/MG-RAST/Shock', api: null },
    { service: 'SOLR', endpoint: 'https://modelseed.org/solr/', api: null },
    { service: 'API', endpoint: 'https://modelseed.org/api/test-service', api: null },
    {
        service: 'ProbModelSEED',
        endpoint: 'https://p3.theseed.org/services/ProbModelSEED/',
        link: 'https://github.com/ModelSEED/ProbModelSEED',
        api: [
            { label: 'Spec', url: 'https://github.com/ModelSEED/ProbModelSEED/blob/master/ProbModelSEED.spec' },
            { label: 'Python', url: 'https://github.com/ModelSEED/ProbModelSEED/blob/master/lib/biop3/ProbModelSEED/ProbModelSEEDClient.py' },
            { label: 'Perl', url: 'https://github.com/ModelSEED/ProbModelSEED/blob/master/lib/Bio/ModelSEED/ProbModelSEED/ProbModelSEEDClient.pm' }
        ]
    },
    {
        service: 'Workspace',
        endpoint: 'https://p3.theseed.org/services/Workspace',
        link: 'https://github.com/PATRIC3/Workspace',
        api: [
            { label: 'Spec', url: 'https://github.com/PATRIC3/Workspace/blob/master/Workspace.spec' },
            { label: 'Python', url: 'https://github.com/PATRIC3/Workspace/blob/master/lib/biop3/Workspace/WorkspaceClient.py' },
            { label: 'Perl', url: 'https://github.com/PATRIC3/Workspace/blob/master/lib/Bio/P3/Workspace/WorkspaceClient.pm' }
        ]
    },
    { service: 'ModelSEED Support Service', endpoint: 'https://modelseed.org/services/ms_fba', api: null },
    { service: 'App Service', endpoint: 'https://p3.theseed.org/services/app_service', api: null }
];

export default function VersionPage() {
    return (
        <Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', mb: 5, gap: 4 }}>
                <Box>
                    <Image src="/img/ModelSEED-logo-vertical-small.png" alt="ModelSEED" width={125} height={125} style={{ objectFit: 'contain' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" component="h3" sx={{ fontWeight: 600 }}>v2.6.1</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Deployed: N/A<br />
                        Commit: dev
                    </Typography>
                </Box>
                <Box>
                    <Link href="http://github.com/modelseed" target="_blank" rel="noreferrer" sx={{ color: 'inherit', '&:hover': { color: '#000' } }}>
                        {/* Simplistic GitHub logo mapping for pure svg without heavy deps */}
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                        </svg>
                    </Link>
                </Box>
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small" aria-label="version status table">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Service</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Endpoint</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>API</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {SERVICES.map((row) => (
                            <TableRow key={row.service} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell component="th" scope="row">
                                    {row.link ? (
                                        <Link href={row.link} target="_blank" rel="noreferrer">{row.service}</Link>
                                    ) : (
                                        row.service
                                    )}
                                </TableCell>
                                <TableCell sx={{ wordBreak: 'break-all' }}>{row.endpoint}</TableCell>
                                <TableCell>
                                    {row.api ? (
                                        row.api.map((apiLink, idx) => (
                                            <React.Fragment key={apiLink.label}>
                                                <Link href={apiLink.url} target="_blank" rel="noreferrer">{apiLink.label}</Link>
                                                {idx < row.api.length - 1 && ', '}
                                            </React.Fragment>
                                        ))
                                    ) : null}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
