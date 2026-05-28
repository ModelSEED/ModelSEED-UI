'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import { workspaceLs } from '@/lib/api/workspace';
import { listPublicMediaFromApi } from '@/lib/api/modelseed';
import { USE_MODELSEED_API, USE_NEW_PROXY } from '@/lib/api/config';
import DataControlHeader, { withQuickSearchHeaders } from '@/components/layout/DataControlHeader';
import { useToolbarGridFiltering } from '@/lib/hooks/useToolbarGridFiltering';

interface MediaItem {
    id: string;
    name: string;
    type: string;
    isDefined: string;
    isMinimal: string;
    path: string;
}

export default function MediaPage() {
    const router = useRouter();
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'name', sort: 'asc' }]);
    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['mediaWorkspaceLs', USE_MODELSEED_API, USE_NEW_PROXY],
        queryFn: async () => {
            if (USE_MODELSEED_API) {
                const apiMedia = await listPublicMediaFromApi();
                return apiMedia.map((m) => ({
                    id: m.id,
                    name: m.name || m.id,
                    type: m.type || 'unknown',
                    isDefined: m.isDefined === true || m.isDefined === '1' ? 'true' : 'false',
                    isMinimal: m.isMinimal === true || m.isMinimal === '1' ? 'true' : 'false',
                    path: m.ref || `/chenry/public/modelsupport/media/${m.id}`,
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
                        isDefined: m.isDefined === '1' || m.isDefined === 1 ? 'true' : 'false',
                        isMinimal: m.isMinimal === '1' || m.isMinimal === 1 ? 'true' : 'false',
                        path: String(tuple[2] ?? `/${tuple[0]}`),
                    } as MediaItem;
                });
        },
        staleTime: 5 * 60 * 1000,
    });

    const goToMediaPath = (path: string) => {
        if (!path) return;
        const target = path.startsWith('/') ? `/media${path}` : `/media/${path}`;
        router.push(target);
    };

    const columns = useMemo<GridColDef<MediaItem>[]>(() => [
        {
            field: 'name',
            headerName: 'Name',
            minWidth: 360,
            flex: 1,
            renderCell: (params) => (
                <Link
                    href={params.row.path.startsWith('/') ? `/media${params.row.path}` : `/media/${params.row.path}`}
                    onClick={(event) => event.stopPropagation()}
                    style={{ color: '#00acc1', textDecoration: 'none' }}
                >
                    {String(params.value ?? params.row.id)}
                </Link>
            ),
        },
        { field: 'isMinimal', headerName: 'Minimal?', width: 140 },
        { field: 'isDefined', headerName: 'Defined?', width: 140 },
        { field: 'type', headerName: 'Type', width: 180 },
    ], []);

    const {
        filteredRows,
        handleFilterModelChange,
        handleToolbarApplyFilterModel,
    } = useToolbarGridFiltering<MediaItem>({
        rows,
        onFilterApplied: () => setPaginationModel((prev) => ({ ...prev, page: 0 })),
    });

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Media Formulations
            </Typography>
            <DataGrid<MediaItem>
                rows={filteredRows}
                columns={withQuickSearchHeaders(columns)}
                loading={isLoading}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                filterMode="server"
                onFilterModelChange={handleFilterModelChange}
                showToolbar
                slots={{ toolbar: DataControlHeader }}
                slotProps={{
                    toolbar: {
                        showQuickFilter: true,
                        onApplyFilterModel: handleToolbarApplyFilterModel,
                    },
                }}
                hideFooter
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                onRowClick={(params) => goToMediaPath(params.row.path)}
                autoHeight
                sx={{
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fff',
                }}
            />
        </>
    );
}
