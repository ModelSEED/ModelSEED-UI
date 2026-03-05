'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from 'next/link';

// Using a temporary hardcoded workspace or one provided from auth state eventually
// Assuming Vibhav's default structure: '/vibhav/home/models/'
import { workspaceLs } from '@/lib/api/workspace';

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

const columns: GridColDef<MyModelItem>[] = [
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
];

export default function MyModelsPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'modDate', sort: 'desc' }]);
    const [search, setSearch] = useState('');

    // Hardcode paths to poll based on the legacy structure "/{user}/home/models/"
    // Currently relying on auth token in cookie + static user string or just public paths?
    // We assume /vibhav/home/models/ for this task per plan
    const workspacePath = '/vibhav/home/models/';

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: ['myModelsWorkspaceLs', workspacePath],
        queryFn: async () => {
            try {
                const data = await workspaceLs([workspacePath]);
                const items = data[workspacePath] || [];

                return items.map((item: any) => ({
                    id: item[0], // filename
                    name: item[7]?.name || item[0],
                    orgName: item[7]?.orgName || item[7]?.name || '', // Map to orgName
                    numReactions: item[7]?.num_reactions || item[7]?.rxnCount || 0,
                    numGenes: item[7]?.num_genes || item[7]?.geneCount || 0,
                    fbaCount: item[7]?.fba_count || item[7]?.fbaCount || 0,
                    gapfills: item[7]?.integrated_gapfills || item[7]?.gapfillCount || 0,
                    status: item[7]?.status || 'complete', // legacy default assumption 
                    modDate: item[3],
                    path: item[2] + item[0], // path + name
                })) as MyModelItem[];
            } catch (err) {
                console.error("Failed to load My Models", err);
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    const filteredRows = rows.filter((row) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return row.id.toLowerCase().includes(q) || (row.orgName && row.orgName.toLowerCase().includes(q));
    });

    return (
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

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Search models..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flexGrow: 1, maxWidth: 400 }}
                />
            </Box>

            {error ? (
                <Typography color="error">
                    Error loading models. Ensure you are signed in and the workspace path '{workspacePath}' exists.
                </Typography>
            ) : (
                <DataGrid<MyModelItem>
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
                    You have no models. Consider reconstructing a model.
                </Typography>
            )}
        </Box>
    );
}
