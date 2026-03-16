'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { workspaceLs } from '@/lib/api/workspace';
import { exportMediaFromApi, listPublicMediaFromApi } from '@/lib/api/modelseed';
import { USE_MODELSEED_API, USE_NEW_PROXY } from '@/lib/api/config';
import DataControlHeader from '@/components/layout/DataControlHeader';

interface MediaItem {
    id: string;
    name: string;
    type: string;
    isDefined: string;
    isMinimal: string;
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

export default function MediaPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'id', sort: 'asc' }]);
    const [exportingMediaId, setExportingMediaId] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['mediaWorkspaceLs', USE_MODELSEED_API, USE_NEW_PROXY],
        queryFn: async () => {
            if (USE_MODELSEED_API) {
                const apiMedia = await listPublicMediaFromApi();
                return apiMedia.map((m) => ({
                    id: m.id,
                    name: m.name || m.id,
                    type: m.type || 'unknown',
                    isDefined: m.isDefined === true || m.isDefined === '1' ? 'Yes' : 'No',
                    isMinimal: m.isMinimal === true || m.isMinimal === '1' ? 'Yes' : 'No',
                    modDate: m.modDate ?? new Date().toISOString(),
                    path: m.ref || `/${m.id}`,
                })) as MediaItem[];
            }

            const data = await workspaceLs(['/chenry/public/modelsupport/media']);
            const items = data['/chenry/public/modelsupport/media'] || [];
            return items
                .filter((item: unknown) => {
                    const tuple = item as [string, string];
                    return tuple[1] === 'media';
                })
                .map((item: unknown) => {
                    const tuple = item as [string, string, unknown, string, unknown, unknown, unknown, Record<string, unknown>?];
                    const meta = tuple[7] || {};
                    const m = meta as {
                        name?: string;
                        type?: string;
                        isDefined?: string | number;
                        isMinimal?: string | number;
                    };
                    return {
                        id: tuple[0],
                        name: m.name || tuple[0],
                        type: m.type || 'N/A',
                        isDefined: m.isDefined === '1' || m.isDefined === 1 ? 'Yes' : 'No',
                        isMinimal: m.isMinimal === '1' || m.isMinimal === 1 ? 'Yes' : 'No',
                        modDate: tuple[3],
                        path: String(tuple[2] ?? `/${tuple[0]}`),
                    } as MediaItem;
                });
        },
        staleTime: 5 * 60 * 1000,
    });

    const handleExportMedia = async (row: MediaItem) => {
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

    const columns = useMemo<GridColDef<MediaItem>[]>(() => [
        { field: 'id', headerName: 'ID', width: 280 },
        { field: 'name', headerName: 'Name', width: 300 },
        { field: 'type', headerName: 'Type', width: 150 },
        { field: 'isDefined', headerName: 'Defined?', width: 120 },
        { field: 'isMinimal', headerName: 'Minimal?', width: 120 },
        {
            field: 'modDate',
            headerName: 'Modification Date',
            width: 200,
            valueGetter: (_value, row) => new Date(row.modDate).toLocaleString(),
        },
        {
            field: 'commands',
            headerName: 'Commands',
            width: 160,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <Button
                    variant="text"
                    size="small"
                    sx={{ textTransform: 'none', minWidth: 0 }}
                    disabled={exportingMediaId !== null}
                    onClick={() => void handleExportMedia(params.row)}
                >
                    {exportingMediaId === params.row.id ? 'Exporting...' : 'Export'}
                </Button>
            ),
        },
    ], [exportingMediaId]);

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Media Formulations
            </Typography>
            <DataGrid<MediaItem>
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
                }}
            />
            {exportError && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    {exportError}
                </Typography>
            )}
        </>
    );
}
