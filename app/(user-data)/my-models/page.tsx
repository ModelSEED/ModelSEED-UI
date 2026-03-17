'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    DataGrid,
    GridColDef,
    GridPaginationModel,
    GridRowSelectionModel,
    GridSortModel,
} from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { USE_MODELSEED_API } from '@/lib/api/config';
import {
    getJobsFromApi,
    listUserModelsFromApi,
    manageJobFromApi,
    ModelseedJobSummary,
    submitMergeJobFromApi,
} from '@/lib/api/modelseed';
import { useAuth } from '@/components/auth/AuthProvider';
import DownloadModelMenu from '@/components/ui/DownloadModelMenu';
import DeleteModelModal from '@/components/ui/DeleteModelModal';
import DataControlHeader from '@/components/layout/DataControlHeader';
import {
    isActiveJobStatus,
    extractTrackedJobId,
    listTrackedJobs,
    removeTrackedJob,
    trackJob,
    TrackedJob,
} from '@/lib/api/jobTracker';

interface MyModelItem {
    id: string; // Model name / filename
    name: string;
    orgName: string;
    numReactions: number;
    numGenes: number;
    fbaCount: number;
    gapfills: number;
    status: string;
    modDate: string;
    path: string;
}

interface TrackedJobWithStatus extends TrackedJob {
    status?: string;
    app?: string;
    type?: string;
}

function normalizeModelRef(ref: string): string {
    const trimmed = ref.trim();
    if (!trimmed) return '/';
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export default function MyModelsPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'modDate', sort: 'desc' }]);
    const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [mergeModelName, setMergeModelName] = useState('merged_model');
    const [mergeOutputPath, setMergeOutputPath] = useState('');
    const [isSubmittingMerge, setIsSubmittingMerge] = useState(false);
    const [mergeMessage, setMergeMessage] = useState<string | null>(null);
    const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
    const [jobActionError, setJobActionError] = useState<string | null>(null);
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const syncTrackedJobs = () => {
            setTrackedJobs(listTrackedJobs());
        };
        syncTrackedJobs();
        window.addEventListener('storage', syncTrackedJobs);
        return () => window.removeEventListener('storage', syncTrackedJobs);
    }, []);

    const { data: rows = [], isLoading, error, refetch } = useQuery({
        queryKey: ['myModels', USE_MODELSEED_API],
        enabled: isAuthenticated,
        queryFn: async () => {
            if (USE_MODELSEED_API) {
                const apiModels = await listUserModelsFromApi();
                return apiModels.map((m) => ({
                    id: m.id,
                    name: m.name || m.id,
                    orgName: m.name || '',
                    numReactions: m.num_reactions ?? 0,
                    numGenes: m.num_genes ?? 0,
                    fbaCount: m.fba_count ?? 0,
                    gapfills: (m.unintegrated_gapfills ?? 0) + (m.integrated_gapfills ?? 0),
                    status: m.status ?? 'complete',
                    modDate: m.rundate ?? new Date().toISOString(),
                    path: normalizeModelRef(m.ref),
                })) as MyModelItem[];
            }

            // When modelseed-api is not enabled, avoid calling the legacy
            // Workspace directly, since many users will not have permission
            // for the legacy paths. Instead, surface a clear configuration
            // error so the environment can be fixed explicitly.
            throw new Error(
                'My Models requires modelseed-api. Set NEXT_PUBLIC_USE_MODELSEED_API=true and point NEXT_PUBLIC_MODELSEED_API_URL at a running modelseed-api instance.',
            );
        },
        staleTime: 5 * 60 * 1000,
    });

    const trackedJobIds = useMemo(
        () => trackedJobs.map((job) => job.id),
        [trackedJobs],
    );

    const { data: trackedJobStatuses = [], refetch: refetchTrackedJobs } = useQuery({
        queryKey: ['trackedJobs', trackedJobIds],
        enabled: isAuthenticated && USE_MODELSEED_API && trackedJobIds.length > 0,
        queryFn: async () => getJobsFromApi(trackedJobIds),
        refetchInterval: trackedJobIds.length > 0 ? 15000 : false,
        staleTime: 5000,
    });

    const handleModelDeleted = useCallback(() => {
        void refetch();
    }, [refetch]);

    const trackedJobStatusMap = useMemo(() => {
        const list = Array.isArray(trackedJobStatuses) ? trackedJobStatuses : [];
        return new Map(
            list.map((job) => [job.id, job] satisfies [string, ModelseedJobSummary]),
        );
    }, [trackedJobStatuses]);

    const trackedJobsWithStatus = useMemo<TrackedJobWithStatus[]>(() => {
        return trackedJobs.map((job) => {
            const status = trackedJobStatusMap.get(job.id);
            return {
                ...job,
                status: typeof status?.status === 'string' ? status.status : undefined,
                app: typeof status?.app === 'string' ? status.app : undefined,
                type: typeof status?.type === 'string' ? status.type : undefined,
            };
        });
    }, [trackedJobs, trackedJobStatusMap]);

    const recentJobByRow = useMemo(() => {
        const map = new Map<string, TrackedJobWithStatus>();
        for (const job of trackedJobsWithStatus) {
            if (job.relatedRef) {
                map.set(`ref:${job.relatedRef}`, job);
            }
            if (job.modelId) {
                map.set(`model:${job.modelId}`, job);
            }
        }
        return map;
    }, [trackedJobsWithStatus]);

    const handleDismissJob = useCallback((jobId: string) => {
        removeTrackedJob(jobId);
        setTrackedJobs(listTrackedJobs());
    }, []);

    const handleCancelJob = useCallback(async (jobId: string) => {
        setJobActionError(null);
        try {
            await manageJobFromApi({ ids: [jobId], action: 'cancel' });
            await refetchTrackedJobs();
            removeTrackedJob(jobId);
            setTrackedJobs(listTrackedJobs());
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to cancel job';
            setJobActionError(message);
        }
    }, [refetchTrackedJobs]);

    const selectedModels = useMemo(
        () => rows.filter((row) => selectedModelIds.includes(row.id)),
        [rows, selectedModelIds],
    );

    useEffect(() => {
        if (selectedModels.length === 0) return;
        const firstPath = selectedModels[0]?.path ?? '';
        const basePath = firstPath.includes('/')
            ? firstPath.slice(0, firstPath.lastIndexOf('/')) || `/${user ?? ''}/modelseed`
            : `/${user ?? ''}/modelseed`;
        setMergeOutputPath(basePath);
    }, [selectedModels, user]);

    const handleMergeDialogClose = useCallback(() => {
        if (isSubmittingMerge) return;
        setMergeDialogOpen(false);
        setMergeMessage(null);
    }, [isSubmittingMerge]);

    const handleSubmitMerge = useCallback(async () => {
        if (selectedModels.length < 2) {
            setMergeMessage('Select at least two models to merge.');
            return;
        }
        const trimmedName = mergeModelName.trim();
        const trimmedPath = mergeOutputPath.trim();
        if (!trimmedName) {
            setMergeMessage('Merged model name is required.');
            return;
        }
        if (!trimmedPath) {
            setMergeMessage('Output workspace path is required.');
            return;
        }

        setMergeMessage(null);
        setIsSubmittingMerge(true);
        try {
            const payload = await submitMergeJobFromApi({
                models: selectedModels.map((model) => [model.path, 1]),
                output_file: trimmedName,
                output_path: trimmedPath,
            });
            const jobId = extractTrackedJobId(payload);
            if (jobId) {
                trackJob({
                    id: jobId,
                    kind: 'merge',
                    label: `Merge ${selectedModels.length} models`,
                    modelId: trimmedName,
                    relatedRef: `${trimmedPath}/${trimmedName}`,
                    submittedAt: new Date().toISOString(),
                });
                setTrackedJobs(listTrackedJobs());
            }
            setMergeMessage(
                jobId
                    ? `Merge job submitted. Job ID: ${jobId}`
                    : 'Merge job submitted successfully.',
            );
            setMergeDialogOpen(false);
            setSelectedModelIds([]);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit merge job';
            setMergeMessage(message);
        } finally {
            setIsSubmittingMerge(false);
        }
    }, [mergeModelName, mergeOutputPath, selectedModels]);

    const columns = useMemo<GridColDef<MyModelItem>[]>(() => [
        {
            field: 'id',
            headerName: 'Model ID',
            width: 250,
            renderCell: (params) => (
                <Link
                    href={`/model${params.row.path}`}
                    style={{ color: '#00acc1', textDecoration: 'none', fontWeight: 500 }}
                >
                    {params.value}
                </Link>
            )
        },
        {
            field: 'orgName',
            headerName: 'Species Name',
            width: 220,
            renderCell: (params) => (
                <Link
                    href={`/model${params.row.path}`}
                    style={{ color: '#00acc1', textDecoration: 'none' }}
                >
                    {params.value || '-'}
                </Link>
            )
        },
        { field: 'numReactions', headerName: 'Reactions', width: 100, type: 'number' },
        { field: 'numGenes', headerName: 'Genes', width: 100, type: 'number' },
        { field: 'fbaCount', headerName: 'FBA', width: 100, type: 'number' },
        { field: 'gapfills', headerName: 'Gapfilling', width: 100, type: 'number' },
        {
            field: 'status',
            headerName: 'Status',
            width: 140,
            renderCell: (params) => (
                <Box sx={{ fontWeight: params.value === 'complete' ? 'normal' : 'bold' }}>
                    {params.value || 'None'}
                </Box>
            )
        },
        {
            field: 'recentJob',
            headerName: 'Recent Job',
            width: 160,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => {
                const trackedJob =
                    recentJobByRow.get(`ref:${params.row.path}`) ??
                    recentJobByRow.get(`model:${params.row.id}`);
                if (!trackedJob) {
                    return <Box sx={{ color: 'text.secondary' }}>-</Box>;
                }
                return (
                    <Chip
                        size="small"
                        label={trackedJob.status ?? 'submitted'}
                        color={isActiveJobStatus(trackedJob.status) ? 'warning' : 'default'}
                        variant={isActiveJobStatus(trackedJob.status) ? 'filled' : 'outlined'}
                    />
                );
            },
        },
        {
            field: 'modDate',
            headerName: 'Modification Date',
            width: 220,
            valueGetter: (_value, row) => new Date(row.modDate).toLocaleString(),
        },
        {
            field: 'commands',
            headerName: 'Commands',
            width: 170,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DownloadModelMenu modelRef={params.row.path} modelId={params.row.id} />
                    <DeleteModelModal
                        modelRef={params.row.path}
                        modelId={params.row.id}
                        onDeleted={handleModelDeleted}
                    />
                </Box>
            ),
        },
    ], [handleModelDeleted, recentJobByRow]);

    return (
        <AuthGuard>
            <Box sx={{ maxWidth: '1400px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                    <Stack direction="row" spacing={1.5}>
                        <Button
                            variant="contained"
                            color="primary"
                            component={Link}
                            href="/plant"
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Build New Model
                        </Button>
                        {selectedModelIds.length >= 2 && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => setMergeDialogOpen(true)}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Merge Models ({selectedModelIds.length})
                            </Button>
                        )}
                    </Stack>
                </Box>

                <Box sx={{ borderBottom: '1px solid #ddd', pb: 1, mb: 1 }}>
                    <Typography variant="h5" component="div">
                        My Models
                    </Typography>
                </Box>

                {trackedJobsWithStatus.length > 0 && (
                    <Alert severity="info" variant="outlined">
                        <AlertTitle>Tracked jobs</AlertTitle>
                        <Stack spacing={1.5}>
                            {trackedJobsWithStatus.map((job) => (
                                <Box
                                    key={job.id}
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography variant="body2" fontWeight={600}>
                                            {job.label}
                                        </Typography>
                                        <Chip size="small" label={job.kind} variant="outlined" />
                                        <Chip
                                            size="small"
                                            label={job.status ?? 'submitted'}
                                            color={isActiveJobStatus(job.status) ? 'warning' : 'default'}
                                            variant={isActiveJobStatus(job.status) ? 'filled' : 'outlined'}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(job.submittedAt).toLocaleString()}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {isActiveJobStatus(job.status) && (
                                            <Button
                                                size="small"
                                                color="warning"
                                                onClick={() => void handleCancelJob(job.id)}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        <Button size="small" onClick={() => handleDismissJob(job.id)}>
                                            Dismiss
                                        </Button>
                                    </Box>
                                </Box>
                            ))}
                            {jobActionError && (
                                <Typography variant="caption" color="error">
                                    {jobActionError}
                                </Typography>
                            )}
                        </Stack>
                    </Alert>
                )}

                {mergeMessage && (
                    <Alert severity={mergeMessage.includes('failed') || mergeMessage.includes('required') ? 'error' : 'success'} variant="outlined">
                        {mergeMessage}
                    </Alert>
                )}

                {error ? (
                    <Typography color="error">
                        {error.message}
                    </Typography>
                ) : (
                    <DataGrid<MyModelItem>
                        rows={rows}
                        columns={columns}
                        loading={isLoading}
                        pageSizeOptions={[10, 25, 50, 100]}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        sortModel={sortModel}
                        onSortModelChange={setSortModel}
                        showToolbar
                        slots={{ toolbar: DataControlHeader }}
                        slotProps={{
                            toolbar: { showQuickFilter: true },
                        }}
                        hideFooter
                        disableColumnMenu
                        checkboxSelection
                        disableMultipleRowSelection={false}
                        rowSelectionModel={{
                            type: 'include',
                            ids: new Set(selectedModelIds),
                        }}
                        onRowSelectionModelChange={(selectionModel: GridRowSelectionModel) => {
                            const ids =
                                Array.isArray(selectionModel)
                                    ? selectionModel.map((value) => String(value))
                                    : Array.from(selectionModel.ids, (value) => String(value));
                            setSelectedModelIds(ids);
                        }}
                        getRowId={(row) => row.id}
                        disableRowSelectionOnClick
                        autoHeight
                        sx={{
                            border: '1px solid #e0e0e0',
                            backgroundColor: '#fff',
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: '#f5f5f5',
                                borderBottom: '1px solid #ddd',
                            },
                        }}
                    />
                )}

                {!isLoading && rows.length === 0 && !error && (
                    <Typography sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                        You have no models. Consider reconstructing a model.
                    </Typography>
                )}

                <Dialog
                    open={mergeDialogOpen}
                    onClose={handleMergeDialogClose}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Merge Models</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Merge the selected models into a new workspace object. Each selected model currently uses an equal abundance weight of `1`.
                        </Typography>
                        <Stack spacing={2} sx={{ mb: 2 }}>
                            <TextField
                                label="Merged Model Name"
                                value={mergeModelName}
                                onChange={(event) => setMergeModelName(event.target.value)}
                                fullWidth
                                disabled={isSubmittingMerge}
                            />
                            <TextField
                                label="Output Workspace Path"
                                value={mergeOutputPath}
                                onChange={(event) => setMergeOutputPath(event.target.value)}
                                fullWidth
                                disabled={isSubmittingMerge}
                            />
                        </Stack>
                        <Stack spacing={1}>
                            {selectedModels.map((model) => (
                                <Typography key={model.id} variant="body2">
                                    {model.id} <Box component="span" sx={{ color: 'text.secondary' }}>({model.path})</Box>
                                </Typography>
                            ))}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleMergeDialogClose} disabled={isSubmittingMerge}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={() => void handleSubmitMerge()}
                            disabled={isSubmittingMerge || selectedModels.length < 2}
                        >
                            {isSubmittingMerge ? 'Submitting...' : 'Submit Merge'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AuthGuard>
    );
}
