'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AuthGuard from '@/components/auth/AuthGuard';
import MediaEditor from '@/components/ui/MediaEditor';
import { USE_MODELSEED_API } from '@/lib/api/config';
import { exportMediaFromApi, listMyMediaFromApi } from '@/lib/api/modelseed';
import { workspaceCreate, workspaceDelete, workspaceGet } from '@/lib/api/workspace';
import { useAuth } from '@/components/auth/AuthProvider';
import DataControlHeader from '@/components/layout/DataControlHeader';

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
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'modDate', sort: 'desc' }]);
    const [exportingMediaId, setExportingMediaId] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newMediaName, setNewMediaName] = useState('');
    const [newMediaType, setNewMediaType] = useState('custom');
    const [newMediaMinimal, setNewMediaMinimal] = useState(false);
    const [newMediaDefined, setNewMediaDefined] = useState(false);
    const [createMessage, setCreateMessage] = useState<string | null>(null);
    const [isCreatingMedia, setIsCreatingMedia] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<MyMediaItem | null>(null);
    const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
    const [isDeletingMedia, setIsDeletingMedia] = useState(false);
    const [editingMedia, setEditingMedia] = useState<MyMediaItem | null>(null);
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

    const { data: mediaData, isLoading: isLoadingMedia } = useQuery({
        queryKey: ['mediaData', editingMedia?.path, USE_MODELSEED_API],
        enabled: !!editingMedia,
        queryFn: async () => {
            if (!editingMedia) return null;
            
            if (USE_MODELSEED_API) {
                const data = await exportMediaFromApi(editingMedia.path);
                return {
                    id: editingMedia.id,
                    name: editingMedia.name,
                    type: 'media' as const,
                    compounds: ((data as Record<string, unknown>).compounds as Array<Record<string, unknown>> || []).map((c: Record<string, unknown>) => ({
                        id: String(c.id || c.compound_id || ''),
                        name: String(c.name || c.compound_name || ''),
                        formula: c.formula as string | undefined,
                        charge: c.charge as number | undefined,
                        concentration: Number(c.concentration) || 0,
                        minFlux: Number(c.minflux) || -1000,
                        maxFlux: Number(c.maxflux) || 1000,
                    })),
                    isDefined: editingMedia.isDefined === 'Yes',
                    isMinimal: editingMedia.isMinimal === 'Yes',
                };
            }

            const wsData = await workspaceGet([editingMedia.path]);
            const obj = wsData[0] as unknown as [string, string, string, string] | null;
            if (!obj) throw new Error('Media not found');
            if (!obj) throw new Error('Media not found');
            
            const lines = (obj[3] as string || '').split('\n').filter(l => l.trim());
            const compounds = lines.slice(1).map(line => {
                const parts = line.split('\t');
                return {
                    id: parts[0] || '',
                    name: parts[0] || '',
                    concentration: Number(parts[2]) || 0,
                    minFlux: Number(parts[3]) || -1000,
                    maxFlux: Number(parts[4]) || 1000,
                };
            });
            
            return {
                id: editingMedia.id,
                name: editingMedia.name,
                type: 'media' as const,
                compounds,
                isDefined: editingMedia.isDefined === 'Yes',
                isMinimal: editingMedia.isMinimal === 'Yes',
            };
        },
    });

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

    const handleCreateMedia = async () => {
        const trimmedName = newMediaName.trim();
        if (!trimmedName) {
            setCreateMessage('Media name is required.');
            return;
        }
        if (!user) {
            setCreateMessage('You must be authenticated to create media.');
            return;
        }

        setCreateMessage(null);
        setIsCreatingMedia(true);
        try {
            const mediaPath = `/${user}/media/${trimmedName}`;
            const mediaTable = 'id\tname\tconcentration\tminflux\tmaxflux\r\n';
            await workspaceCreate({
                objects: [[
                    mediaPath,
                    'media',
                    {
                        name: trimmedName,
                        isMinimal: newMediaMinimal ? 1 : 0,
                        isDefined: newMediaDefined ? 1 : 0,
                        type: newMediaType.trim() || 'custom',
                    },
                    mediaTable,
                ]],
                overwrite: false,
            });
            await refetch();
            setCreateDialogOpen(false);
            setNewMediaName('');
            setNewMediaType('custom');
            setNewMediaMinimal(false);
            setNewMediaDefined(false);
            setCreateMessage(`Created media ${trimmedName}.`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create media';
            setCreateMessage(message);
        } finally {
            setIsCreatingMedia(false);
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
                    <Button
                        variant="text"
                        size="small"
                        sx={{ textTransform: 'none', minWidth: 0 }}
                        disabled={exportingMediaId !== null}
                        onClick={() => void handleExportMedia(params.row)}
                    >
                        {exportingMediaId === params.row.id ? 'Exporting...' : 'Export'}
                    </Button>
                    <Button
                        variant="text"
                        size="small"
                        sx={{ textTransform: 'none', minWidth: 0 }}
                        onClick={() => setEditingMedia(params.row)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="text"
                        size="small"
                        color="error"
                        sx={{ textTransform: 'none', minWidth: 0 }}
                        disabled={isDeletingMedia}
                        onClick={() => setDeleteTarget(params.row)}
                    >
                        Delete
                    </Button>
                </Box>
            ),
        },
    ], [exportingMediaId, isDeletingMedia]);

    return (
        <AuthGuard>
            <Box sx={{ maxWidth: '1400px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Create New Media
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

                {createMessage && (
                    <Alert severity={createMessage.startsWith('Created media') ? 'success' : 'error'} variant="outlined">
                        {createMessage}
                    </Alert>
                )}

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

                <Dialog open={createDialogOpen} onClose={() => !isCreatingMedia && setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Create New Media</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                label="Media Name"
                                value={newMediaName}
                                onChange={(event) => setNewMediaName(event.target.value)}
                                fullWidth
                                disabled={isCreatingMedia}
                            />
                            <TextField
                                label="Media Type"
                                value={newMediaType}
                                onChange={(event) => setNewMediaType(event.target.value)}
                                fullWidth
                                disabled={isCreatingMedia}
                            />
                            <FormControlLabel
                                control={(
                                    <Checkbox
                                        checked={newMediaMinimal}
                                        onChange={(event) => setNewMediaMinimal(event.target.checked)}
                                        disabled={isCreatingMedia}
                                    />
                                )}
                                label="Minimal media"
                            />
                            <FormControlLabel
                                control={(
                                    <Checkbox
                                        checked={newMediaDefined}
                                        onChange={(event) => setNewMediaDefined(event.target.checked)}
                                        disabled={isCreatingMedia}
                                    />
                                )}
                                label="Defined media"
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateDialogOpen(false)} disabled={isCreatingMedia}>
                            Cancel
                        </Button>
                        <Button variant="contained" onClick={() => void handleCreateMedia()} disabled={isCreatingMedia}>
                            {isCreatingMedia ? 'Creating...' : 'Create Media'}
                        </Button>
                    </DialogActions>
                </Dialog>

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

                {editingMedia && (
                    <Dialog open={!!editingMedia} onClose={() => setEditingMedia(null)} maxWidth="lg" fullWidth>
                        <DialogTitle>Edit Media: {editingMedia.name}</DialogTitle>
                        <DialogContent>
                            {isLoadingMedia ? (
                                <Typography>Loading media data...</Typography>
                            ) : mediaData ? (
                                <MediaEditor
                                    initialMedia={mediaData}
                                    onSave={async (updatedMedia) => {
                                        console.log('Saving media:', updatedMedia);
                                        return true;
                                    }}
                                    readOnly={!USE_MODELSEED_API}
                                    saveDisabled={!USE_MODELSEED_API}
                                    saveDisabledMessage={USE_MODELSEED_API ? '' : 'API not available. Enable NEXT_PUBLIC_USE_MODELSEED_API=true.'}
                                />
                            ) : (
                                <Typography color="error">Failed to load media data</Typography>
                            )}
                        </DialogContent>
                    </Dialog>
                )}
            </Box>
        </AuthGuard>
    );
}
