'use client';

import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { red, grey, cyan } from '@mui/material/colors';

interface ApiTag {
    tag: string;
    type?: string;
    name?: string;
    description?: string;
    source?: string;
}

interface ApiEndpoint {
    tags: ApiTag[];
    description: string;
}

export default function ApiDocsPage() {
    const [endpoints, setEndpoints] = useState<ApiEndpoint[][]>([]);

    useEffect(() => {
        fetch('/data/api-docs.json')
            .then(res => res.json())
            .then(data => setEndpoints(data))
            .catch(console.error);
    }, []);

    // Helper to extract a tag from endpoint
    const getTag = (endpoint: ApiEndpoint[], tagName: string) => {
        for (const item of endpoint) {
            const found = item.tags?.find(t => t.tag === tagName);
            if (found) return found;
        }
        return null;
    };

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 400, color: '#333' }}>
                ModelSEED REST API
            </Typography>

            <Box sx={{ bgcolor: red[50], border: `1px solid ${red[200]}`, p: 2, mb: 4, borderRadius: 1 }}>
                <Typography variant="body2" color="error">
                    <b>Warning</b>: this API and documentation is pre-beta and should not be
                    used for workflows or external applications.
                </Typography>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {endpoints.map((group, idx) => {
                const apiDef = getTag(group, 'api');
                const successDef = getTag(group, 'apiSuccessExample');

                if (!apiDef) return null;

                const method = (apiDef.type || 'GET').toUpperCase();
                const route = apiDef.name;
                const desc = apiDef.description;

                return (
                    <Box key={idx} sx={{ mb: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1.5 }}>
                            <Box sx={{
                                bgcolor: method === 'GET' ? cyan[500] : grey[800],
                                color: '#fff',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: '0.85rem',
                                fontWeight: 'bold'
                            }}>
                                {method}
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#444' }}>
                                {route} <Typography component="span" variant="body2" color="text.secondary">(requires auth)</Typography>
                            </Typography>
                        </Box>

                        <Box sx={{ ml: { xs: 0, sm: 6 } }}>
                            <Typography variant="subtitle2" sx={{ color: grey[600], textTransform: 'uppercase', mt: 2, mb: 0.5 }}>
                                Description
                            </Typography>
                            <Typography variant="body2" paragraph>
                                {desc}
                            </Typography>

                            {successDef && (
                                <>
                                    <Typography variant="subtitle2" sx={{ color: grey[600], textTransform: 'uppercase', mt: 2, mb: 0.5 }}>
                                        Example Response
                                    </Typography>
                                    <Box
                                        sx={{
                                            bgcolor: grey[100],
                                            p: 2,
                                            borderRadius: 1,
                                            fontFamily: 'monospace',
                                            fontSize: '0.85rem',
                                            whiteSpace: 'pre-wrap',
                                            borderLeft: `4px solid ${cyan[500]}`,
                                            overflowX: 'auto'
                                        }}
                                    >
                                        {successDef.source?.replace('@apiSuccessExample {json} Success-Response:\n', '')}
                                    </Box>
                                </>
                            )}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}
