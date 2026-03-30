import React from 'react';
import fs from 'fs';
import path from 'path';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import StatusTable from '@/app/about/version/StatusTable';

// Server side data loading
async function getChangelog() {
    try {
        const filePath = path.join(process.cwd(), 'CHANGELOG.md');
        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return 'Changelog not found or could not be loaded.';
    }
}

export default async function VersionPage() {
    const rawChangelog = await getChangelog();

    // Fix: legacy changelog missing spaces after hashes (e.g., ####v2.6.1)
    const changelog = rawChangelog.replace(/^(#+)(?![\s#])/gm, '$1 ');

    return (
        <Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', mb: 5, gap: 4 }}>
                <Box>
                    <Image src="/img/ModelSEED-logo-vertical-small.png" alt="ModelSEED" width={125} height={125} style={{ objectFit: 'contain' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" component="h3" sx={{ fontWeight: 600 }}>v0.1.3</Typography>
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

            {/* Client-side table status checker */}
            <StatusTable />

            <Box sx={{
                mt: 6,
                '& .markdown-body h2': { mt: 4, mb: 2, pb: 1, borderBottom: '1px solid #e0e0e0', color: '#2D224E', fontWeight: 600 },
                '& .markdown-body h3': { mt: 3, mb: 1, color: '#333', fontWeight: 600 },
                '& .markdown-body h4': { mt: 3, mb: 1, color: '#555', fontWeight: 600 },
                '& .markdown-body ul': { pl: 3, mb: 2 },
                '& .markdown-body li': { mb: 0.5 },
                '& .markdown-body p': { mb: 2 }
            }}>
                <Box className="markdown-body">
                    <ReactMarkdown>{changelog}</ReactMarkdown>
                </Box>
            </Box>
        </Box>
    );
}
