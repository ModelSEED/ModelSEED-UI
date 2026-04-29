'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import AuthGuard from '@/components/auth/AuthGuard';
import { USE_MODELSEED_API } from '@/lib/api/config';
import { exportMediaFromApi, listMyMediaFromApi } from '@/lib/api/modelseed';
import { workspaceDelete } from '@/lib/api/workspace';
import { useAuth } from '@/components/auth/AuthProvider';
import DataControlHeader from '@/components/layout/DataControlHeader';
import ExportModal from '@/components/ui/ExportModal';

interface MyMediaItem {
    id: string;
    name: string;
    isMinimal: string;
    isDefined: string;
    type: string;
    modDate: string;
    path: string;
}

function downloadJsonPayload(payload: unknown, filename: string): void {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export default function MyMediaPage() {
    const router = useRouter();
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'modDate', sort: 'desc' }]);
    const [exportingMediaId, setExportingMediaId] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<MyMediaItem | null>(null);
    const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
    const [isDeletingMedia, setIsDeletingMedia] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const { isAuthenticated, user } = useAuth();

    const { data: rows = [], isLoading, error, refetch } = useQuery({
        queryKey: ['myMedia', USE_MODELSEED_API],
        enabled: isAuthenticated,
        queryFn: async () => {
            if (USE_MODELSEED_API) {
                const apiMedia = await listMyMediaFromApi();
                return apiMedia.map((m) => ({
                    id: m.id,
                    name: m.name || m.id,
                    isMinimal:
                        m.isMinimal === true || m.isMinimal === '1' ? 'Yes' : 'No',
                    isDefined:
                        m.isDefined === true || m.isDefined === '1' ? 'Yes' : 'No',
                    type: m.type || 'unknown',
                    modDate: m.modDate ?? new Date().toISOString(),
                    path: m.ref || `/${m.id}`,
                })) as MyMediaItem[];
            }

            throw new Error(
                'My Media requires modelseed-api. Set NEXT_PUBLIC_USE_MODELSEED_API=true and point NEXT_PUBLIC_MODELSEED_API_URL at a running modelseed-api instance.',
            );
        },
        staleTime: 5 * 60 * 1000,
    });

    const goToMediaPath = useCallback((path: string) => {
        if (!path) return;
        const target = path.startsWith('/') ? `/media${path}` : `/media/${path}`;
        router.push(target);
    }, [router]);

    const handleExportMedia = async (row: MyMediaItem) => {
        setExportError(null);
        setExportingMediaId(row.id);
        try {
            const payload = await exportMediaFromApi(row.path);
            const safeId = row.id.replace(/[^A-Za-z0-9._-]/g, '_');
            downloadJsonPayload(payload, `${safeId}.media.json`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to export media';
            setExportError(message);
        } finally {
            setExportingMediaId(null);
        }
    };

    const handleDeleteMedia = async () => {
        if (!deleteTarget) return;
        setDeleteMessage(null);
        setIsDeletingMedia(true);
        try {
            await workspaceDelete({
                objects: [deleteTarget.path],
                deleteDirectories: false,
                force: false,
            });
            await refetch();
            setDeleteMessage(`Deleted media ${deleteTarget.name}.`);
            setDeleteTarget(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete media';
            setDeleteMessage(message);
        } finally {
            setIsDeletingMedia(false);
        }
    };

    const columns = useMemo<GridColDef<MyMediaItem>[]>(() => [
        {
            field: 'name',
            headerName: 'Media ID',
            width: 250,
            renderCell: (params) => (
                <Box sx={{ color: '#00acc1', fontWeight: 500 }}>
                    {params.value}
                </Box>
            ),
        },
        { field: 'isMinimal', headerName: 'Minimal?', width: 150 },
        { field: 'isDefined', headerName: 'Defined?', width: 150 },
        { field: 'type', headerName: 'Type', width: 200 },
        {
            field: 'modDate',
            headerName: 'Modification Date',
            width: 250,
            type: 'dateTime',
            valueGetter: (_value, row) => (row.modDate ? new Date(row.modDate) : null),
            valueFormatter: (value: Date | null) => (value ? value.toLocaleString() : '-'),
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
                    <Button
                        variant="text"
                        size="small"
                        sx={{ textTransform: 'none', minWidth: 0 }}
                        disabled={exportingMediaId !== null}
                        onClick={(event) => {
                            event.stopPropagation();
                            void handleExportMedia(params.row);
                        }}
                    >
                        {exportingMediaId === params.row.id ? 'Exporting...' : 'Export'}
                    </Button>
                    <Button
                        variant="text"
                        size="small"
                        sx={{ textTransform: 'none', minWidth: 0 }}
                        onClick={(event) => {
                            event.stopPropagation();
                            goToMediaPath(params.row.path);
                        }}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="text"
                        size="small"
                        color="error"
                        sx={{ textTransform: 'none', minWidth: 0 }}
                        disabled={isDeletingMedia}
                        onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(params.row);
                        }}
                    >
                        Delete
                    </Button>
                </Box>
            ),
        },
    ], [exportingMediaId, isDeletingMedia, goToMediaPath]);

    const exportColumns = useMemo(() => [
        { field: 'id', headerName: 'Media ID', defaultSelected: true },
        { field: 'name', headerName: 'Name', defaultSelected: true },
        { field: 'type', headerName: 'Type', defaultSelected: true },
        { field: 'isMinimal', headerName: 'Minimal?', defaultSelected: false },
        { field: 'isDefined', headerName: 'Defined?', defaultSelected: false },
        { field: 'modDate', headerName: 'Modification Date', defaultSelected: true },
    ], []);

    return (
        <AuthGuard>
            <Box sx={{ maxWidth: '1400px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            if (!user) return;
                            router.push(`/media/${user}/media/new-media`);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Create New Media
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setExportModalOpen(true)}
                        disabled={!rows || rows.length === 0}
                    >
                        Export CSV
                    </Button>
                </Box>

                <Box sx={{ borderBottom: '1px solid #ddd', pb: 1, mb: 1 }}>
                    <Typography variant="h5" component="div">
                        My Media
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Click on a media row to view format details and properties.
                    </Typography>
                </Box>

                {deleteMessage && (
                    <Alert severity={deleteMessage.startsWith('Deleted media') ? 'success' : 'error'} variant="outlined">
                        {deleteMessage}
                    </Alert>
                )}

                {error ? (
                    <Typography color="error">
                        {error.message}
                    </Typography>
                ) : (
                    <DataGrid<MyMediaItem>
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
                        getRowId={(row) => row.id}
                        disableRowSelectionOnClick
                        onRowClick={(params) => goToMediaPath(params.row.path)}
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

                {exportError && (
                    <Typography color="error" variant="body2">
                        {exportError}
                    </Typography>
                )}

                {!isLoading && rows.length === 0 && !error && (
                    <Typography sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                        You have no media formulations.
                    </Typography>
                )}

                <Dialog open={deleteTarget !== null} onClose={() => !isDeletingMedia && setDeleteTarget(null)} maxWidth="sm" fullWidth>
                    <DialogTitle>Delete Media</DialogTitle>
                    <DialogContent>
                        <Stack spacing={1} sx={{ mt: 1 }}>
                            <Typography variant="body2">
                                Delete <strong>{deleteTarget?.name}</strong> from your workspace?
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Path: {deleteTarget?.path}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Only delete media you created for this account or this test session.
                            </Typography>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteTarget(null)} disabled={isDeletingMedia}>
                            Cancel
                        </Button>
                        <Button color="error" variant="contained" onClick={() => void handleDeleteMedia()} disabled={isDeletingMedia}>
                            {isDeletingMedia ? 'Deleting...' : 'Delete Media'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <ExportModal
                    open={exportModalOpen}
                    onClose={() => setExportModalOpen(false)}
                    columns={exportColumns}
                    currentData={rows}
                    totalRows={rows.length}
                    filename="modelseed_my_media.csv"
                    columnLabels={{
                        id: 'Media ID',
                        name: 'Name',
                        type: 'Type',
                        isMinimal: 'Minimal?',
                        isDefined: 'Defined?',
                        modDate: 'Modification Date',
                    }}
                />
            </Box>
        </AuthGuard>
    );
}
