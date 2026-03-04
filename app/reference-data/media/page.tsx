'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { workspaceLs } from '@/lib/api/workspace';

interface MediaItem {
    id: string;
    name: string;
    type: string;
    isDefined: string;
    isMinimal: string;
    modDate: string;
}

const columns: GridColDef<MediaItem>[] = [
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
];

export default function MediaPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'id', sort: 'asc' }]);
    const [search, setSearch] = useState('');

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['mediaWorkspaceLs'],
        queryFn: async () => {
            const data = await workspaceLs(['/chenry/public/modelsupport/media']);
            const items = data['/chenry/public/modelsupport/media'] || [];
            return items
                .filter((item: any) => item[1] === 'media') // ensure we only list media items
                .map((item: any) => ({
                    id: item[0],
                    name: item[7]?.name || item[0],
                    type: item[7]?.type || 'N/A',
                    isDefined: item[7]?.isDefined === '1' || item[7]?.isDefined === 1 ? 'Yes' : 'No',
                    isMinimal: item[7]?.isMinimal === '1' || item[7]?.isMinimal === 1 ? 'Yes' : 'No',
                    modDate: item[3],
                })) as MediaItem[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const filteredRows = rows.filter((row) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return row.id.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
    });

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Media Formulations
            </Typography>
            <Box sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search media..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: 400 }}
                />
            </Box>
            <DataGrid<MediaItem>
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
                }}
            />
        </>
    );
}
