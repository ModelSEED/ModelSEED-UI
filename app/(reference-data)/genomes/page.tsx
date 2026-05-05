'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { workspaceLs } from '@/lib/api/workspace';
import { USE_NEW_PROXY } from '@/lib/api/config';
import DataControlHeader from '@/components/layout/DataControlHeader';
import { useToolbarGridFiltering } from '@/lib/hooks/useToolbarGridFiltering';

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
        type: 'dateTime',
        valueGetter: (_value, row) => (row.modDate ? new Date(row.modDate) : null),
        valueFormatter: (value: Date | null) => (value ? value.toLocaleString() : '-'),
    },
];

export default function PlantsPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'id', sort: 'asc' }]);
    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['plantsWorkspaceLs', USE_NEW_PROXY],
        queryFn: async () => {
            const data = await workspaceLs(['/plantseed/plantseed/']);
            const items = data['/plantseed/plantseed/'] || [];
            return items.map((item: unknown) => {
                const tuple = item as [string, unknown, unknown, string, unknown, unknown, unknown, Record<string, unknown>?];
                const meta = tuple[7] || {};
                const m = meta as {
                    name?: string;
                    source?: string;
                    num_reactions?: number;
                    num_genes?: number;
                    fba_count?: number;
                    integrated_gapfills?: number;
                };
                return {
                    id: tuple[0],
                    name: m.name || 'N/A',
                    source: m.source || 'N/A',
                    numReactions: m.num_reactions || 0,
                    numGenes: m.num_genes || 0,
                    fbaCount: m.fba_count || 0,
                    gapfills: m.integrated_gapfills || 0,
                    modDate: tuple[3],
                } as PlantModelItem;
            });
        },
        staleTime: 5 * 60 * 1000,
    });

    const {
        filteredRows,
        handleFilterModelChange,
        handleToolbarApplyFilterModel,
    } = useToolbarGridFiltering<PlantModelItem>({
        rows,
        onFilterApplied: () => setPaginationModel((prev) => ({ ...prev, page: 0 })),
    });

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Public Plant Models
            </Typography>
            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                PlantSEED v2.0<br />Update In Progress: Annotation and reconstruction services are temporarily offline for updates and will be restored shortly.
            </Alert>
            <DataGrid<PlantModelItem>
                rows={filteredRows}
                columns={columns}
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
