'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { workspaceLs } from '@/lib/api/workspace';

interface PlantModelItem {
    id: string;
    name: string;
    source: string;
    numReactions: number;
    numGenes: number;
    fbaCount: number;
    gapfills: number;
    modDate: string;
}

const columns: GridColDef<PlantModelItem>[] = [
    { field: 'id', headerName: 'ID', width: 220 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'source', headerName: 'Source', width: 140 },
    { field: 'numReactions', headerName: 'Reactions', width: 100, type: 'number' },
    { field: 'numGenes', headerName: 'Genes', width: 80, type: 'number' },
    { field: 'fbaCount', headerName: 'FBA', width: 80, type: 'number' },
    { field: 'gapfills', headerName: 'Gapfills', width: 80, type: 'number' },
    {
        field: 'modDate',
        headerName: 'Modification Date',
        width: 200,
        valueGetter: (_value, row) => new Date(row.modDate).toLocaleString(),
    },
];

export default function PlantsPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'id', sort: 'asc' }]);
    const [search, setSearch] = useState('');

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['plantsWorkspaceLs'],
        queryFn: async () => {
            const data = await workspaceLs(['/plantseed/plantseed/']);
            const items = data['/plantseed/plantseed/'] || [];
            return items.map((item: any) => ({
                id: item[0],
                name: item[7]?.name || 'N/A',
                source: item[7]?.source || 'N/A',
                numReactions: item[7]?.num_reactions || 0,
                numGenes: item[7]?.num_genes || 0,
                fbaCount: item[7]?.fba_count || 0,
                gapfills: item[7]?.integrated_gapfills || 0,
                modDate: item[3],
            })) as PlantModelItem[];
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
                Public Plant Models
            </Typography>
            <Box sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search plant models..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: 400 }}
                />
            </Box>
            <DataGrid<PlantModelItem>
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
