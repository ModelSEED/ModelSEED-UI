'use client';

import { useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    DataGrid,
    GridColDef,
    type GridFilterItem,
    GridFilterModel,
    GridPaginationModel,
    GridSortModel,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DataControlHeader from '@/components/layout/DataControlHeader';
import { filterDocsByGridModel, sortGridDocsLocally } from '@/lib/api/biochem';
import { PatricGenome, searchPatricGenomes } from '@/lib/api/patric';

/** Max rows to pull when column filters need client-side evaluation (PATRIC RQL cannot express MUI operators). */
const PATRIC_LOCAL_FILTER_BATCH = 5000;

function hasActiveColumnFilters(items: GridFilterItem[] | undefined): boolean {
    return (items ?? []).some((item) => {
        if (!item.field || !item.operator) return false;
        const op = String(item.operator);
        if (op === 'isEmpty' || op === 'isNotEmpty') return true;
        if (Array.isArray(item.value)) return item.value.length > 0;
        return String(item.value ?? '').trim().length > 0;
    });
}

interface PatricGenomesTableProps {
    onSelectGenome: (genome: PatricGenome) => void;
    disabled?: boolean;
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

export default function PatricGenomesTable({ onSelectGenome, disabled = false }: PatricGenomesTableProps) {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'genome_name', sort: 'asc' }]);
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] });
    // Tracks authoritative multi-filter items from the toolbar (bypasses grid truncation).
    const committedFilterItemsRef = useRef<GridFilterItem[]>([]);
    const committedLogicOperatorRef = useRef<GridFilterModel['logicOperator']>(undefined);

    const query = extractQuickFilterQuery(filterModel);
    const sortToken = toSortToken(sortModel);
    const columnFiltersActive = hasActiveColumnFilters(filterModel.items as GridFilterItem[]);

    const { data, isLoading, error } = useQuery({
        queryKey: [
            'patric-genomes',
            query,
            columnFiltersActive,
            // Only include pagination in query key for server mode (client-mode paginates in memory)
            ...(columnFiltersActive ? [] : [paginationModel.page, paginationModel.pageSize]),
            sortToken,
            // Stable string key for filter items (avoids new-reference re-fetches)
            JSON.stringify(filterModel.items ?? []),
        ],
        queryFn: async () => {
            if (columnFiltersActive) {
                const raw = await searchPatricGenomes({
                    query,
                    limit: PATRIC_LOCAL_FILTER_BATCH,
                    offset: 0,
                    sort: sortToken,
                });
                const filtered = filterDocsByGridModel(
                    raw.rows as unknown as Record<string, unknown>[],
                    filterModel.items ?? [],
                    undefined,
                    String(filterModel.logicOperator ?? '').toLowerCase() === 'or' ? 'or' : 'and',
                ) as unknown as PatricGenome[];
                const sm = sortModel[0];
                const sorted = sm?.field
                    ? sortGridDocsLocally(filtered, { field: sm.field, desc: sm.sort === 'desc' })
                    : filtered;
                const total = sorted.length;
                const start = paginationModel.page * paginationModel.pageSize;
                const rows = sorted.slice(start, start + paginationModel.pageSize) as PatricGenome[];
                return { rows, total };
            }
            return searchPatricGenomes({
                query,
                limit: paginationModel.pageSize,
                offset: paginationModel.page * paginationModel.pageSize,
                sort: sortToken,
            });
        },
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

    const handleToolbarApplyFilterModel = (model: GridFilterModel) => {
        // Store the full multi-filter from the toolbar (bypasses grid truncation)
        committedFilterItemsRef.current = model.items as GridFilterItem[];
        committedLogicOperatorRef.current = model.logicOperator;

        // Also update the local filterModel so the UI stays in sync
        setFilterModel({
            items: model.items,
            logicOperator: model.logicOperator,
            quickFilterValues: model.quickFilterValues ?? [],
            quickFilterLogicOperator: model.quickFilterLogicOperator,
        });
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    };

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
                filterMode="server"
                onFilterModelChange={(next) => {
                    setFilterModel((prev) => {
                        const committed = committedFilterItemsRef.current;
                        const incomingItems = (next.items ?? []) as GridFilterItem[];
                        // Only keep committed filters when:
                        // 1. We have committed items
                        // 2. Incoming count is LESS than committed (truncation)
                        // 3. Incoming count is > 0 (not an intentional clear)
                        const shouldKeepCommitted =
                            committed.length > 0 &&
                            incomingItems.length < committed.length &&
                            incomingItems.length > 0;
                        return {
                            items: shouldKeepCommitted ? committed : incomingItems,
                            logicOperator: shouldKeepCommitted
                                ? committedLogicOperatorRef.current
                                : next.logicOperator,
                            quickFilterValues: next.quickFilterValues ?? prev.quickFilterValues ?? [],
                            quickFilterLogicOperator: next.quickFilterLogicOperator ?? prev.quickFilterLogicOperator,
                        };
                    });
                    const incomingItems = (next.items ?? []) as GridFilterItem[];
                    // Only update committed refs if we're not clearing (incoming has items or was truncation)
                    if (incomingItems.length > 0 || incomingItems.length >= committedFilterItemsRef.current.length) {
                        committedFilterItemsRef.current = incomingItems;
                        committedLogicOperatorRef.current = next.logicOperator;
                    }
                    setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
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
