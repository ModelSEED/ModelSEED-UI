'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { USE_MODELSEED_API } from '@/lib/api/config';
import { listUserModelsFromApi } from '@/lib/api/modelseed';
import { useAuth } from '@/components/auth/AuthProvider';
import DownloadModelMenu from '@/components/ui/DownloadModelMenu';
import DeleteModelModal from '@/components/ui/DeleteModelModal';
import DataControlHeader from '@/components/layout/DataControlHeader';

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

export default function MyModelsPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'modDate', sort: 'desc' }]);
    const { isAuthenticated } = useAuth();

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
                    path: m.ref.startsWith('/') ? m.ref : `/${m.ref}`,
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

    const handleModelDeleted = useCallback(() => {
        void refetch();
    }, [refetch]);

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
    ], [handleModelDeleted]);

    return (
        <AuthGuard>
            <Box sx={{ maxWidth: '1400px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        component={Link}
                        href="/plant"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Build New Model
                    </Button>
                </Box>

                <Box sx={{ borderBottom: '1px solid #ddd', pb: 1, mb: 1 }}>
                    <Typography variant="h5" component="div">
                        My Models
                    </Typography>
                </Box>

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
            </Box>
        </AuthGuard>
    );
}
