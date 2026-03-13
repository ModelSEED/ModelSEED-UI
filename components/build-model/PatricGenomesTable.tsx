'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    DataGrid,
    GridColDef,
    GridFilterModel,
    GridPaginationModel,
    GridSortModel,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DataControlHeader from '@/components/layout/DataControlHeader';
import { PatricGenome, searchPatricGenomes } from '@/lib/api/patric';

interface PatricGenomesTableProps {
    onSelectGenome: (genome: PatricGenome) => void;
}

function toSortToken(sortModel: GridSortModel): string {
    const sort = sortModel[0];
    if (!sort?.field) return '+genome_name';
    return `${sort.sort === 'desc' ? '-' : '+'}${sort.field}`;
}

function extractQuickFilterQuery(filterModel: GridFilterModel): string {
    const values = filterModel.quickFilterValues ?? [];
    if (!Array.isArray(values) || values.length === 0) return '';
    return String(values[0] ?? '').trim();
}

export default function PatricGenomesTable({ onSelectGenome }: PatricGenomesTableProps) {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'genome_name', sort: 'asc' }]);
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] });

    const query = extractQuickFilterQuery(filterModel);
    const sortToken = toSortToken(sortModel);

    const { data, isLoading, error } = useQuery({
        queryKey: [
            'patric-genomes',
            query,
            paginationModel.page,
            paginationModel.pageSize,
            sortToken,
        ],
        queryFn: () =>
            searchPatricGenomes({
                query,
                limit: paginationModel.pageSize,
                offset: paginationModel.page * paginationModel.pageSize,
                sort: sortToken,
            }),
        staleTime: 30_000,
    });

    const columns = useMemo<GridColDef<PatricGenome>[]>(
        () => [
            { field: 'genome_id', headerName: 'Genome ID', minWidth: 220, flex: 1 },
            { field: 'genome_name', headerName: 'Genome Name', minWidth: 280, flex: 1.5 },
            { field: 'scientific_name', headerName: 'Scientific Name', minWidth: 220, flex: 1.2 },
            { field: 'genome_status', headerName: 'Status', minWidth: 120, flex: 0.7 },
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
                        onClick={() => onSelectGenome(params.row)}
                    >
                        Build Model
                    </Button>
                ),
            },
        ],
        [onSelectGenome],
    );

    return (
        <Box>
            {error && (
                <Typography color="error" sx={{ mb: 1 }}>
                    {error.message}
                </Typography>
            )}
            <DataGrid<PatricGenome>
                autoHeight
                rows={data?.rows ?? []}
                rowCount={data?.total ?? 0}
                loading={isLoading}
                columns={columns}
                getRowId={(row) => row.genome_id}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                paginationMode="server"
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                sortingMode="server"
                filterModel={filterModel}
                onFilterModelChange={(next) => {
                    setFilterModel(next);
                    setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
                filterMode="server"
                showToolbar
                slots={{ toolbar: DataControlHeader }}
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
