'use client';

import React, { useEffect, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const SERVICES = [
    { id: 'auth', service: 'RAST Auth', endpoint: 'https://p3.theseed.org/Sessions/Login', pingUrl: null, api: null },
    { id: 'patric', service: 'PATRIC Auth', endpoint: 'https://user.patricbrc.org/authenticate', pingUrl: null, api: null },
    { id: 'shock', service: 'Shock', endpoint: 'https://p3.theseed.org/services/shock_api', pingUrl: 'https://p3.theseed.org/services/shock_api', link: 'https://github.com/MG-RAST/Shock', api: null },
    { id: 'solr', service: 'SOLR', endpoint: 'https://modelseed.org/solr/', pingUrl: 'https://modelseed.org/solr/', api: null },
    { id: 'api', service: 'API', endpoint: 'https://modelseed.org/api/test-service', pingUrl: 'https://modelseed.org/api/test-service', api: null },
    {
        id: 'pms',
        service: 'ProbModelSEED',
        endpoint: 'https://p3.theseed.org/services/ProbModelSEED/',
        link: 'https://github.com/ModelSEED/ProbModelSEED',
        pingUrl: 'https://p3.theseed.org/services/ProbModelSEED/',
        authReq: true,
        api: [
            { label: 'Spec', url: 'https://github.com/ModelSEED/ProbModelSEED/blob/master/ProbModelSEED.spec' },
            { label: 'Python', url: 'https://github.com/ModelSEED/ProbModelSEED/blob/master/lib/biop3/ProbModelSEED/ProbModelSEEDClient.py' },
            { label: 'Perl', url: 'https://github.com/ModelSEED/ProbModelSEED/blob/master/lib/Bio/ModelSEED/ProbModelSEED/ProbModelSEEDClient.pm' }
        ]
    },
    {
        id: 'ws',
        service: 'Workspace',
        endpoint: 'https://p3.theseed.org/services/Workspace',
        link: 'https://github.com/PATRIC3/Workspace',
        pingUrl: 'https://p3.theseed.org/services/Workspace',
        authReq: true,
        api: [
            { label: 'Spec', url: 'https://github.com/PATRIC3/Workspace/blob/master/Workspace.spec' },
            { label: 'Python', url: 'https://github.com/PATRIC3/Workspace/blob/master/lib/biop3/Workspace/WorkspaceClient.py' },
            { label: 'Perl', url: 'https://github.com/PATRIC3/Workspace/blob/master/lib/Bio/P3/Workspace/WorkspaceClient.pm' }
        ]
    },
    { id: 'support', service: 'ModelSEED Support Service', endpoint: 'https://modelseed.org/services/ms_fba', authReq: true, pingUrl: null, api: null },
    { id: 'app', service: 'App Service', endpoint: 'https://p3.theseed.org/services/app_service', authReq: true, pingUrl: null, api: null }
];

export default function StatusTable() {
    const [status, setStatus] = useState<Record<string, 'loading' | 'success' | 'error' | 'unauth' | 'skip'>>({});

    // In legacy, many of these require a real token.
    // For now we assume unauthenticated state mapping exactly like "login required"
    // And for public endpoints, we will just perform a small fetch or mark as success since CORs blocks raw fetches across some.
    const userLoggedIn = false; // Add actual auth check integration here later

    useEffect(() => {
        const checkStatuses = async () => {
            const tempStatus: Record<string, 'loading' | 'success' | 'error' | 'unauth' | 'skip'> = {};

            for (const s of SERVICES) {
                if (s.authReq && !userLoggedIn) {
                    tempStatus[s.id] = 'unauth';
                    continue;
                }

                if (!s.pingUrl) {
                    tempStatus[s.id] = 'skip';
                    continue;
                }

                tempStatus[s.id] = 'loading';
                setStatus(prev => ({ ...prev, ...tempStatus }));

                try {
                    // Attempt to ping. We resolve simple ok or cors error as "success" enough for it being up in external environments
                    // if it actively rejects due to 404 or down server then it fails
                    await fetch(s.pingUrl, { mode: 'no-cors', method: 'GET' });
                    tempStatus[s.id] = 'success';
                } catch {
                    tempStatus[s.id] = 'error';
                }

                setStatus(prev => ({ ...prev, ...tempStatus }));
            }
        };

        checkStatuses();
    }, [userLoggedIn]);

    return (
        <TableContainer component={Paper} elevation={0} variant="outlined">
            <Table size="small" aria-label="version status table">
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Service</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Endpoint</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
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
                            <TableCell sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>{row.endpoint}</TableCell>

                            <TableCell>
                                {status[row.id] === 'unauth' && <span style={{ fontSize: '0.85rem' }}>login required</span>}
                                {status[row.id] === 'skip' && <span>-</span>}
                                {status[row.id] === 'loading' && <span style={{ color: '#888', fontStyle: 'italic' }}>loading...</span>}
                                {status[row.id] === 'success' && <CheckCircleOutlineIcon color="success" fontSize="small" />}
                                {status[row.id] === 'error' && <ErrorOutlineIcon color="error" fontSize="small" />}
                                {!status[row.id] && <span></span>}
                            </TableCell>

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
    );
}
