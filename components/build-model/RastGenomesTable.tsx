'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DataControlHeader from '@/components/layout/DataControlHeader';
import { listRastGenomes, RastGenomeJob } from '@/lib/api/modelseed';
import { useToolbarGridFiltering } from '@/lib/hooks/useToolbarGridFiltering';

interface RastGenomesTableProps {
    onSelectGenome: (job: RastGenomeJob) => void;
    disabled?: boolean;
}

export default function RastGenomesTable({ onSelectGenome, disabled = false }: RastGenomesTableProps) {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'mod_time', sort: 'desc' }]);

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: ['rast-genomes'],
        queryFn: listRastGenomes,
        staleTime: 30_000,
    });

    const columns = useMemo<GridColDef<RastGenomeJob>[]>(
        () => [
            { field: 'genome_id', headerName: 'Genome ID', minWidth: 220, flex: 1 },
            { field: 'genome_name', headerName: 'Genome Name', minWidth: 280, flex: 1.6 },
            { field: 'contig_count', headerName: 'Contigs', minWidth: 100, type: 'number', flex: 0.6 },
            {
                field: 'mod_time',
                headerName: 'Modified',
                minWidth: 180,
                flex: 1,
                type: 'dateTime',
                valueGetter: (_value, row) => (row.mod_time ? new Date(row.mod_time) : null),
                valueFormatter: (value: Date | null) => (value ? value.toLocaleString() : '-'),
            },
            {
                field: 'build',
                headerName: 'Build Model',
                sortable: false,
                filterable: false,
                disableColumnMenu: true,
                width: 140,
                renderCell: (params) => (
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={disabled}
                        onClick={() => onSelectGenome(params.row)}
                    >
                        Build Model
                    </Button>
                ),
            },
        ],
        [disabled, onSelectGenome],
    );

    const {
        filteredRows,
        handleFilterModelChange,
        handleToolbarApplyFilterModel,
    } = useToolbarGridFiltering<RastGenomeJob>({
        rows,
        onFilterApplied: () => setPaginationModel((prev) => ({ ...prev, page: 0 })),
    });

    return (
        <Box>
            {error && (
                <Typography color="error" sx={{ mb: 1 }}>
                    {error.message}
                </Typography>
            )}
            <DataGrid<RastGenomeJob>
                autoHeight
                rows={filteredRows}
                columns={columns}
                loading={isLoading}
                getRowId={(row) => row.id || row.genome_id}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                filterMode="server"
                onFilterModelChange={handleFilterModelChange}
                showToolbar
                slots={{ toolbar: DataControlHeader }}
                slotProps={{ toolbar: { onApplyFilterModel: handleToolbarApplyFilterModel } }}
                hideFooter
                disableRowSelectionOnClick
                disableColumnMenu
                sx={{
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fff',
                }}
            />
        </Box>
    );
}
