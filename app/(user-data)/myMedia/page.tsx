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

    // Default workspace path assumption for user media
    const workspacePath = '/user/home/media/';

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: ['myMediaWorkspaceLs', workspacePath],
        queryFn: async () => {
            try {
                const data = await workspaceLs([workspacePath]);
                const items = data[workspacePath] || [];

                return items.map((item: any) => ({
                    id: item[0],
                    name: item[7]?.name || item[0],
                    isMinimal: item[7]?.isMinimal ? 'Yes' : 'No',
                    isDefined: item[7]?.isDefined ? 'Yes' : 'No',
                    type: item[7]?.type || '-',
                    modDate: item[3],
                    path: item[2] + item[0],
                })) as MyMediaItem[];
            } catch (err) {
                console.error("Failed to load My Media", err);
                return [];
            }
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
                        Error loading media. Ensure you are signed in and the workspace path '{workspacePath}' exists.
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
