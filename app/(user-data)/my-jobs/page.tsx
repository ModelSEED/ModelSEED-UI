'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import QueueIcon from '@mui/icons-material/HourglassEmpty';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { getJobsFromApi } from '@/lib/api/modelseed';
import { listTrackedJobs, isTerminalJobStatus, isActiveJobStatus, TrackedJob } from '@/lib/api/jobTracker';
import { USE_MODELSEED_API } from '@/lib/api/config';
import AuthGuard from '@/components/auth/AuthGuard';
import DataControlHeader from '@/components/layout/DataControlHeader';

/* ---------- types ---------- */

interface JobRow {
    id: string;
    task: string;
    params: string;
    submitted: string;
    started: string;
    status: string;
    rawStatus: string;
}

/* ---------- helpers ---------- */

const STDERR_BASE = 'https://p3c.theseed.org/services/app_service/task_info';

function relativeTime(timestamp: string | undefined): string {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function statusColor(status: string): 'error' | 'success' | 'warning' | 'info' | 'default' {
    const s = status.toLowerCase();
    if (s === 'failed' || s === 'error') return 'error';
    if (s === 'completed') return 'success';
    if (s === 'running' || s === 'in-progress') return 'warning';
    if (s === 'queued' || s === 'submitted') return 'info';
    return 'default';
}

function normalizeStatus(status: string): 'queued' | 'running' | 'completed' {
    const s = status.toLowerCase();
    if (['completed', 'failed', 'error', 'cancelled', 'canceled', 'terminated'].includes(s)) return 'completed';
    if (['running', 'in-progress', 'executing'].includes(s)) return 'running';
    return 'queued';
}

function mergeApiAndTrackedJobs(
    apiJobs: Record<string, unknown>[],
    trackedJobs: TrackedJob[],
): JobRow[] {
    const seen = new Set<string>();
    const rows: JobRow[] = [];

    // API jobs take precedence
    for (const job of apiJobs) {
        const id = String(job.id ?? '');
        if (!id || seen.has(id)) continue;
        seen.add(id);

        const params = job.parameters as Record<string, unknown> | undefined;
        const args = params?.arguments as Record<string, unknown> | undefined;
        const paramStr = args
            ? Object.entries(args).map(([k, v]) => `${k}: ${String(v)}`).join(', ')
            : '';

        rows.push({
            id,
            task: String(params?.command ?? job.app ?? job.type ?? 'Unknown'),
            params: paramStr,
            submitted: String(job.submitTimestamp ?? job.created_at ?? job.submit_time ?? ''),
            started: String(job.startTimestamp ?? job.start_time ?? ''),
            status: String(job.status ?? 'unknown'),
            rawStatus: String(job.status ?? 'unknown'),
        });
    }

    // Add locally tracked jobs not already in API response
    for (const tracked of trackedJobs) {
        if (seen.has(tracked.id)) continue;
        seen.add(tracked.id);
        rows.push({
            id: tracked.id,
            task: tracked.label || tracked.kind,
            params: tracked.relatedRef ? `ref: ${tracked.relatedRef}` : '',
            submitted: tracked.submittedAt,
            started: '',
            status: 'queued',
            rawStatus: 'queued',
        });
    }

    return rows;
}

/* ---------- component ---------- */

function MyJobsContent() {
    const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'submitted', sort: 'desc' }]);

    const { data: jobRows = [], isLoading, error } = useQuery({
        queryKey: ['myJobs'],
        queryFn: async () => {
            const tracked = listTrackedJobs();
            let apiJobs: Record<string, unknown>[] = [];

            if (USE_MODELSEED_API) {
                try {
                    const trackedIds = tracked.map((t) => t.id);
                    const result = await getJobsFromApi(trackedIds);
                    if (Array.isArray(result)) {
                        apiJobs = result as Record<string, unknown>[];
                    }
                } catch (err) {
                    console.warn('Failed to fetch jobs from API:', err);
                }
            }

            return mergeApiAndTrackedJobs(apiJobs, tracked);
        },
        refetchInterval: 10_000, // Poll every 10 seconds
        staleTime: 5_000,
    });

    const counts = useMemo(() => {
        const result = { queued: 0, running: 0, completed: 0 };
        for (const job of jobRows) {
            result[normalizeStatus(job.status)]++;
        }
        return result;
    }, [jobRows]);

    const columns: GridColDef<JobRow>[] = useMemo(() => [
        { field: 'task', headerName: 'Task', width: 200 },
        { field: 'params', headerName: 'Parameters', width: 340, sortable: false },
        {
            field: 'submitted',
            headerName: 'Submitted',
            width: 140,
            renderCell: (p) => relativeTime(p.row.submitted),
        },
        {
            field: 'started',
            headerName: 'Started',
            width: 140,
            renderCell: (p) => relativeTime(p.row.started),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 140,
            renderCell: (p) => (
                <Chip
                    label={p.row.status}
                    size="small"
                    color={statusColor(p.row.status)}
                    variant="outlined"
                />
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 60,
            sortable: false,
            renderCell: (p) => {
                if (p.row.rawStatus.toLowerCase() === 'failed') {
                    return (
                        <Tooltip title="View stderr">
                            <IconButton
                                size="small"
                                component="a"
                                href={`${STDERR_BASE}/${p.row.id}/stderr`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    );
                }
                return null;
            },
        },
    ], []);

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Job Status
            </Typography>

            {/* Status count cards */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2, border: '1px solid #e0e0e0', minWidth: 160 }}>
                    <QueueIcon sx={{ fontSize: 40, color: '#90a4ae' }} />
                    <Box>
                        <Typography variant="h4" fontWeight={600}>{isLoading ? '…' : counts.queued}</Typography>
                        <Typography variant="body2" color="text.secondary">Queued</Typography>
                    </Box>
                </Paper>
                <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2, border: '1px solid #e0e0e0', minWidth: 160 }}>
                    <PlayCircleOutlineIcon sx={{ fontSize: 40, color: '#ff9800' }} />
                    <Box>
                        <Typography variant="h4" fontWeight={600}>{isLoading ? '…' : counts.running}</Typography>
                        <Typography variant="body2" color="text.secondary">In Progress</Typography>
                    </Box>
                </Paper>
                <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2, border: '1px solid #e0e0e0', minWidth: 160 }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 40, color: '#4caf50' }} />
                    <Box>
                        <Typography variant="h4" fontWeight={600}>{isLoading ? '…' : counts.completed}</Typography>
                        <Typography variant="body2" color="text.secondary">Completed</Typography>
                    </Box>
                </Paper>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    Failed to load jobs: {(error as Error).message}
                </Alert>
            )}

            {isLoading && jobRows.length === 0 && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }} color="text.secondary">Loading jobs…</Typography>
                </Box>
            )}

            <DataGrid<JobRow>
                rows={jobRows}
                columns={columns}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={pagination}
                onPaginationModelChange={setPagination}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                showToolbar
                slots={{ toolbar: DataControlHeader }}
                slotProps={{ toolbar: { showQuickFilter: true } }}
                disableRowSelectionOnClick
                getRowId={(row) => row.id}
                autoHeight
                sx={{
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fff',
                    minHeight: 300,
                    '& .MuiDataGrid-cell': { py: 1 },
                }}
            />

            {!isLoading && jobRows.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    No jobs found. Submit an FBA, Gapfill, or Reconstruction job to see it here.
                </Typography>
            )}
        </>
    );
}

export default function MyJobsPage() {
    return (
        <AuthGuard>
            <MyJobsContent />
        </AuthGuard>
    );
}
