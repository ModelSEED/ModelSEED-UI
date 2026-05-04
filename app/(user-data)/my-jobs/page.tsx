'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import QueueIcon from '@mui/icons-material/HourglassEmpty';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { getJobsFromApi } from '@/lib/api/modelseed';
import { listTrackedJobs, TrackedJob } from '@/lib/api/jobTracker';
import { USE_MODELSEED_API } from '@/lib/api/config';
import AuthGuard from '@/components/auth/AuthGuard';
import DataControlHeader from '@/components/layout/DataControlHeader';
import ExportModal from '@/components/ui/ExportModal';

/* ---------- types ---------- */

interface JobRow {
    id: string;
    task: string;
    params: string;
    submitted: string;
    started: string;
    status: string;
    rawStatus: string;
    isStuck?: boolean;
    errorMsg?: string;
    outputPath?: string;
    app?: string;
}

interface JobStatusHistory {
    status: string;
    timestamp: number;
    sameCount: number;
}

/* ---------- constants ---------- */

const STUCK_THRESHOLD_POLLS = 3; // Consider job stuck after 3 same-status polls (~30s)

/* ---------- helpers ---------- */

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

function statusColor(status: string, isStuck?: boolean): 'error' | 'success' | 'warning' | 'info' | 'default' {
    if (isStuck) return 'warning';
    const s = status.toLowerCase();
    if (s === 'failed' || s === 'error') return 'error';
    if (s === 'completed') return 'success';
    if (s === 'running' || s === 'in-progress') return 'warning';
    if (s === 'queued' || s === 'submitted') return 'info';
    return 'default';
}

function normalizeStatus(status: string): 'queued' | 'running' | 'completed' | 'failed' {
    const s = status.toLowerCase();
    if (['failed', 'error', 'cancelled', 'canceled', 'terminated'].includes(s)) return 'failed';
    if (['completed'].includes(s)) return 'completed';
    if (['running', 'in-progress', 'executing'].includes(s)) return 'running';
    return 'queued';
}

function mergeApiAndTrackedJobs(
    apiJobs: Record<string, unknown>[],
    trackedJobs: TrackedJob[],
    statusHistory: Map<string, JobStatusHistory>,
): JobRow[] {
    const seen = new Set<string>();
    const rows: JobRow[] = [];
    const now = Date.now();

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

        const status = String(job.status ?? 'unknown');
        
        // Track status history for stuck detection
        const history = statusHistory.get(id);
        let isStuck = false;
        
        if (history) {
            if (history.status === status) {
                history.sameCount++;
                history.timestamp = now;
            } else {
                history.status = status;
                history.sameCount = 1;
                history.timestamp = now;
            }
            // Mark as stuck if same non-terminal status for too many polls
            const isNonTerminal = ['queued', 'submitted', 'running', 'in-progress'].includes(status.toLowerCase());
            if (isNonTerminal && history.sameCount >= STUCK_THRESHOLD_POLLS) {
                isStuck = true;
            }
        } else {
            statusHistory.set(id, { status, timestamp: now, sameCount: 1 });
        }

        const errorMsg = job.error ? String(job.error) : undefined;
        const outputPath = args?.output_path ? String(args.output_path) : undefined;
        const app = String(params?.command ?? job.app ?? job.type ?? 'Unknown');

        rows.push({
            id,
            task: app,
            params: paramStr,
            submitted: String(job.submitTimestamp ?? job.created_at ?? job.submit_time ?? ''),
            started: String(job.startTimestamp ?? job.start_time ?? ''),
            status,
            rawStatus: status,
            isStuck,
            errorMsg,
            outputPath,
            app,
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
            isStuck: false,
        });
    }

    return rows;
}

/* ---------- component ---------- */

function MyJobsContent() {
    const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'submitted', sort: 'desc' }]);
    
    // Track job status history for stuck detection
    const statusHistoryRef = useRef<Map<string, JobStatusHistory>>(new Map());

    const [exportModalOpen, setExportModalOpen] = useState(false);

    const { data: jobRows = [], isLoading, error, refetch } = useQuery({
        queryKey: ['myJobs'],
        queryFn: async () => {
            const tracked = listTrackedJobs();
            let apiJobs: Record<string, unknown>[] = [];

            if (USE_MODELSEED_API) {
                try {
                    const result = await getJobsFromApi([]);
                    if (Array.isArray(result)) {
                        apiJobs = result as Record<string, unknown>[];
                    }
                } catch (err) {
                    console.warn('Failed to fetch jobs from API:', err);
                }
            }

            return mergeApiAndTrackedJobs(apiJobs, tracked, statusHistoryRef.current);
        },
        refetchInterval: 10_000, // Poll every 10 seconds
        staleTime: 5_000,
    });
    
    const handleRefreshJob = useCallback(() => {
        // Clear history to reset stuck detection
        statusHistoryRef.current.clear();
        refetch();
    }, [refetch]);

    const counts = useMemo(() => {
        const result = { queued: 0, running: 0, completed: 0, failed: 0 };
        for (const job of jobRows) {
            const status = normalizeStatus(job.status);
            result[status as keyof typeof result]++;
        }
        return result;
    }, [jobRows]);

    const columns: GridColDef<JobRow>[] = useMemo(() => [
        { 
            field: 'task', 
            headerName: 'Task', 
            width: 200,
            renderCell: (p) => {
                if (p.row.rawStatus.toLowerCase() === 'completed' && p.row.outputPath && p.row.app?.includes('Model')) {
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <Box 
                                component="a" 
                                href={`/model${p.row.outputPath}`}
                                sx={{ 
                                    textDecoration: 'none', 
                                    color: 'primary.main',
                                    fontWeight: 500,
                                    '&:hover': { textDecoration: 'underline' } 
                                }}
                            >
                                {p.row.task}
                            </Box>
                        </Box>
                    );
                }
                return p.row.task;
            }
        },
        { field: 'params', headerName: 'Parameters', width: 340, sortable: false },
        {
            field: 'submitted',
            headerName: 'Submitted',
            width: 140,
            type: 'dateTime',
            valueGetter: (_value, row) => (row.submitted ? new Date(row.submitted) : null),
            renderCell: (p) => relativeTime(p.row.submitted),
        },
        {
            field: 'started',
            headerName: 'Started',
            width: 140,
            type: 'dateTime',
            valueGetter: (_value, row) => (row.started ? new Date(row.started) : null),
            renderCell: (p) => relativeTime(p.row.started),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 180,
            renderCell: (p) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                        label={p.row.isStuck ? `${p.row.status} (possibly stuck)` : p.row.status}
                        size="small"
                        color={statusColor(p.row.status, p.row.isStuck)}
                        variant="outlined"
                        icon={p.row.isStuck ? <WarningAmberIcon /> : undefined}
                    />
                </Box>
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            renderCell: (p) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {p.row.isStuck && (
                        <Tooltip title="Job may be stuck - click to refresh">
                            <IconButton size="small" onClick={handleRefreshJob}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {p.row.rawStatus.toLowerCase() === 'failed' && (
                        <Tooltip title={p.row.errorMsg || "Job failed. No error details provided by API."}>
                            <IconButton
                                size="small"
                                color="error"
                            >
                                <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {p.row.rawStatus.toLowerCase() === 'completed' && p.row.outputPath && p.row.app?.includes('Model') && (
                        <Tooltip title="View Model">
                            <IconButton
                                size="small"
                                component="a"
                                href={`/model${p.row.outputPath}`}
                                color="primary"
                            >
                                <PlayCircleOutlineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
    ], [handleRefreshJob]);

    const exportColumns = useMemo(() => [
        { field: 'id', headerName: 'Job ID', defaultSelected: true },
        { field: 'task', headerName: 'Task', defaultSelected: true },
        { field: 'params', headerName: 'Parameters', defaultSelected: false },
        { field: 'submitted', headerName: 'Submitted', defaultSelected: true },
        { field: 'started', headerName: 'Started', defaultSelected: false },
        { field: 'status', headerName: 'Status', defaultSelected: true },
        { field: 'app', headerName: 'App', defaultSelected: false },
    ], []);

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" fontWeight={600}>
                    Job Status
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setExportModalOpen(true)}
                    disabled={!jobRows || jobRows.length === 0}
                >
                    Export CSV
                </Button>
            </Box>

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
                <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2, border: '1px solid #e0e0e0', minWidth: 160 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 40, color: '#f44336' }} />
                    <Box>
                        <Typography variant="h4" fontWeight={600}>{isLoading ? '…' : counts.failed}</Typography>
                        <Typography variant="body2" color="text.secondary">Failed</Typography>
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
                initialState={{
                    sorting: {
                        sortModel: [{ field: 'submitted', sort: 'desc' }],
                    },
                }}
                showToolbar
                slots={{ toolbar: DataControlHeader }}
                slotProps={{ toolbar: { showQuickFilter: true } }}
                hideFooter
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

            <ExportModal
                open={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                columns={exportColumns}
                currentData={jobRows}
                totalRows={jobRows.length}
                filename="modelseed_jobs.csv"
                columnLabels={{
                    id: 'Job ID',
                    task: 'Task',
                    params: 'Parameters',
                    submitted: 'Submitted',
                    started: 'Started',
                    status: 'Status',
                    app: 'App',
                }}
            />
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
