'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { workspaceLs } from '@/lib/api/workspace';
import { USE_MODELSEED_API } from '@/lib/api/config';
import { listUserMediaFromApi } from '@/lib/api/modelseed';
import { useAuth } from '@/components/auth/AuthProvider';

interface MyMediaItem {
    id: string;
    name: string;
    isMinimal: string;
    isDefined: string;
    type: string;
    modDate: string;
    path: string;
}

const columns: GridColDef<MyMediaItem>[] = [
    {
        field: 'name',
        headerName: 'Media ID',
        width: 250,
        renderCell: (params) => (
            <Link
                href={`/media${params.row.path}`}
                style={{ color: '#00acc1', textDecoration: 'none', fontWeight: 500 }}
            >
                {params.value}
            </Link>
        )
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
];

export default function MyMediaPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'modDate', sort: 'desc' }]);
    const [search, setSearch] = useState('');
    const { isAuthenticated } = useAuth();

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: ['myMedia', USE_MODELSEED_API],
        enabled: isAuthenticated,
        queryFn: async () => {
            if (USE_MODELSEED_API) {
                const apiMedia = await listUserMediaFromApi();
                return apiMedia.map((m) => ({
                    id: m.id,
                    name: m.name || m.id,
                    isMinimal:
                        m.isMinimal === true || m.isMinimal === '1' ? 'Yes' : 'No',
                    isDefined:
                        m.isDefined === true || m.isDefined === '1' ? 'Yes' : 'No',
                    type: m.type || 'unknown',
                    modDate: m.modDate ?? new Date().toISOString(),
                    // Until modelseed-api exposes a direct workspace ref, link by id only.
                    path: `/${m.id}`,
                })) as MyMediaItem[];
            }

            throw new Error(
                'My Media requires modelseed-api. Set NEXT_PUBLIC_USE_MODELSEED_API=true and point NEXT_PUBLIC_MODELSEED_API_URL at a running modelseed-api instance.',
            );
        },
        staleTime: 5 * 60 * 1000,
    });

    const filteredRows = rows.filter((row) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return row.name.toLowerCase().includes(q) || row.type.toLowerCase().includes(q);
    });

    return (
        <AuthGuard>
            <Box sx={{ maxWidth: '1400px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                        // Note: This would typically navigate to a "Create New media" route
                        onClick={() => alert("Creating media is functional conceptually, not wired yet in React UI.")}
                    >
                        Create New media
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

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Search my media..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ flexGrow: 1, maxWidth: 400 }}
                    />
                </Box>

                {error ? (
                    <Typography color="error">
                        {error.message}
                    </Typography>
                ) : (
                    <DataGrid<MyMediaItem>
                        rows={filteredRows}
                        columns={columns}
                        loading={isLoading}
                        pageSizeOptions={[10, 25, 50, 100]}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        sortModel={sortModel}
                        onSortModelChange={setSortModel}
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

                {!isLoading && filteredRows.length === 0 && !error && (
                    <Typography sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                        You have no media formulations.
                    </Typography>
                )}
            </Box>
        </AuthGuard>
    );
}
