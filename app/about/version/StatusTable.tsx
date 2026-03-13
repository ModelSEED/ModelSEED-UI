'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
import { useAuth } from '@/components/auth/AuthProvider';
import {
    MODELSEED_API_URL,
    PROBMODELSEED_URL,
    USE_MODELSEED_API,
    USE_NEW_PROXY,
    WORKSPACE_URL,
} from '@/lib/api/config';

interface ServiceConfig {
    id: string;
    service: string;
    endpoint: string;
    pingUrl: string | null;
    authReq: boolean;
    link?: string;
    api?: { label: string; url: string }[];
}

const SERVICES: ServiceConfig[] = [
    { id: 'auth', service: 'RAST Auth', endpoint: 'https://p3.theseed.org/Sessions/Login', pingUrl: null, authReq: false },
    { id: 'patric', service: 'PATRIC Auth', endpoint: 'https://user.patricbrc.org/authenticate', pingUrl: null, authReq: false },
    { id: 'shock', service: 'Shock', endpoint: 'https://p3.theseed.org/services/shock_api', link: 'https://github.com/MG-RAST/Shock', pingUrl: 'https://p3.theseed.org/services/shock_api', authReq: false, api: [{ label: 'GitHub', url: 'https://github.com/MG-RAST/Shock' }] },
    { id: 'solr', service: 'SOLR', endpoint: 'https://modelseed.org/solr/', pingUrl: 'https://modelseed.org/solr/', authReq: false },
    { id: 'api', service: 'API', endpoint: 'https://modelseed.org/api/test-service', pingUrl: 'https://modelseed.org/api/test-service', authReq: false },
    {
        id: 'pms',
        service: 'ProbModelSEED',
        endpoint: PROBMODELSEED_URL,
        pingUrl: PROBMODELSEED_URL,
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
        endpoint: WORKSPACE_URL,
        pingUrl: WORKSPACE_URL,
        authReq: true,
        api: [
            { label: 'Spec', url: 'https://github.com/PATRIC3/Workspace/blob/master/Workspace.spec' },
            { label: 'Python', url: 'https://github.com/PATRIC3/Workspace/blob/master/lib/biop3/Workspace/WorkspaceClient.py' },
            { label: 'Perl', url: 'https://github.com/PATRIC3/Workspace/blob/master/lib/Bio/P3/Workspace/WorkspaceClient.pm' }
        ]
    },
    { id: 'support', service: 'ModelSEED Support Service', endpoint: 'https://modelseed.org/services/ms_fba', pingUrl: 'https://modelseed.org/services/ms_fba', authReq: true },
    { id: 'app', service: 'App Service', endpoint: 'https://p3.theseed.org/services/app_service', pingUrl: 'https://p3.theseed.org/services/app_service', authReq: true }
];

export default function StatusTable() {
    const [status, setStatus] = useState<Record<string, 'loading' | 'success' | 'error' | 'unauth' | 'skip'>>({});
    const { isAuthenticated, token } = useAuth();

    const isMockToken = token?.startsWith('mock:');

    const parseServiceResponse = async (
        response: Response,
    ): Promise<'success' | 'error' | 'unauth'> => {
        if (response.status === 401 || response.status === 403) {
            return 'unauth';
        }
        if (!response.ok) {
            return 'error';
        }
        const body = await response.json().catch(() => null) as
            | { error?: unknown }
            | null;
        if (body && typeof body === 'object' && 'error' in body && body.error) {
            return 'error';
        }
        return 'success';
    };

    const checkWorkspaceService = useCallback(async (authToken: string | null): Promise<'success' | 'error' | 'unauth'> => {
        if (isMockToken) {
            return 'success';
        }

        if (!authToken) {
            return 'unauth';
        }

        try {
            const response = await fetch(
                USE_NEW_PROXY ? `${WORKSPACE_URL}/ls` : WORKSPACE_URL,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authToken,
                    },
                    body: JSON.stringify(
                        USE_NEW_PROXY
                            ? { paths: ['/plantseed/plantseed/'] }
                            : {
                                version: '1.1',
                                method: 'Workspace.ls',
                                id: Math.floor(Math.random() * 100000),
                                params: [{ paths: ['/plantseed/plantseed/'] }],
                            },
                    ),
                },
            );

            return parseServiceResponse(response);
        } catch {
            return 'error';
        }
    }, [isMockToken]);

    const checkProbModelseedService = useCallback(async (authToken: string | null): Promise<'success' | 'error' | 'unauth'> => {
        if (isMockToken) {
            return 'success';
        }

        if (!authToken) {
            return 'unauth';
        }

        try {
            if (USE_MODELSEED_API) {
                const response = await fetch(`${MODELSEED_API_URL}/api/models`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': authToken,
                    },
                });
                return parseServiceResponse(response);
            }

            const response = await fetch(PROBMODELSEED_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken,
                },
                body: JSON.stringify({
                    version: '1.1',
                    method: 'ProbModelSEED.list_models',
                    id: Math.floor(Math.random() * 100000),
                    params: [{}],
                }),
            });
            return parseServiceResponse(response);
        } catch {
            return 'error';
        }
    }, [isMockToken]);

    useEffect(() => {
        const checkStatuses = async () => {
            const tempStatus: Record<string, 'loading' | 'success' | 'error' | 'unauth' | 'skip'> = {};

            for (const s of SERVICES) {
                if (s.authReq && !isAuthenticated && !isMockToken) {
                    tempStatus[s.id] = 'unauth';
                    continue;
                }

                if (!s.pingUrl) {
                    tempStatus[s.id] = 'skip';
                    continue;
                }

                if (s.id === 'ws') {
                    tempStatus[s.id] = 'loading';
                    setStatus(prev => ({ ...prev, ...tempStatus }));

                    const result = await checkWorkspaceService(token);
                    tempStatus[s.id] = result;
                    setStatus(prev => ({ ...prev, ...tempStatus }));
                    continue;
                }

                if (s.id === 'pms') {
                    tempStatus[s.id] = 'loading';
                    setStatus(prev => ({ ...prev, ...tempStatus }));

                    const result = await checkProbModelseedService(token);
                    tempStatus[s.id] = result;
                    setStatus(prev => ({ ...prev, ...tempStatus }));
                    continue;
                }

                tempStatus[s.id] = 'loading';
                setStatus(prev => ({ ...prev, ...tempStatus }));

                try {
                    await fetch(s.pingUrl, { mode: 'no-cors', method: 'GET' });
                    tempStatus[s.id] = 'success';
                } catch {
                    tempStatus[s.id] = 'error';
                }

                setStatus(prev => ({ ...prev, ...tempStatus }));
            }
        };

        checkStatuses();
    }, [isAuthenticated, token, isMockToken, checkProbModelseedService, checkWorkspaceService]);

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
                                    row.api.map((apiLink, idx, arr) => (
                                        <React.Fragment key={apiLink.label}>
                                            <Link href={apiLink.url} target="_blank" rel="noreferrer">{apiLink.label}</Link>
                                            {idx < arr.length - 1 && ', '}
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
