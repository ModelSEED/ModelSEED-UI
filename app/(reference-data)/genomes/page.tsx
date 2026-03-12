'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import { workspaceLs } from '@/lib/api/workspace';
import BiochemToolbar from '@/components/BiochemToolbar';

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

import Link from 'next/link';

const columns: GridColDef<PlantModelItem>[] = [
    {
        field: 'id',
        headerName: 'Model ID',
        width: 220,
        renderCell: (params) => (
            <Link
                href={`/model/plantseed/plantseed/${params.value}`}
                style={{ color: '#00acc1', textDecoration: 'none' }}
                target="_blank"
                rel="noopener noreferrer"
            >
                {params.value}
            </Link>
        )
    },
    {
        field: 'name',
        headerName: 'Species Name',
        width: 200,
        renderCell: (params) => (
            <Link
                href={`/model/plantseed/plantseed/${params.row.id}`}
                style={{ color: '#00acc1', textDecoration: 'none' }}
                target="_blank"
                rel="noopener noreferrer"
            >
                {params.value}
            </Link>
        )
    },
    { field: 'source', headerName: 'Domain', width: 140 },
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

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Public Plant Models
            </Typography>
            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                <AlertTitle sx={{ fontWeight: 700 }}>PlantSEED v3.0 Update In Progress</AlertTitle>
                PlantSEED is being updated to version 3.0. Existing public plant models below remain
                available for reference, these were generated as part of <a href="https://onlinelibrary.wiley.com/doi/10.1111/tpj.14003" target="_blank" rel="noopener noreferrer" style={{ color: '#00acc1', textDecoration: 'underline' }}>PlantSEED v2</a>. New annotation and reconstruction services will be restored
                shortly with an improved pipeline.
            </Alert>
            <DataGrid<PlantModelItem>
                rows={rows}
                columns={columns}
                loading={isLoading}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                showToolbar
                slots={{ toolbar: BiochemToolbar }}
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
        </>
    );
}
