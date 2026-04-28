'use client';

import {
    GridToolbarContainer,
    GridToolbarColumnsButton,
    useGridApiContext,
    useGridSelector,
    gridPageSelector,
    gridPageSizeSelector,
    gridRowCountSelector,
    type GridColDef,
    type GridFilterItem,
    type GridFilterModel,
    GridLogicOperator,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

function CustomPagination() {
    const apiRef = useGridApiContext();
    const page = useGridSelector(apiRef, gridPageSelector);
    const pageSize = useGridSelector(apiRef, gridPageSizeSelector);
    const rowCount = useGridSelector(apiRef, gridRowCountSelector);

    if (page === undefined || pageSize === undefined || rowCount === undefined) {
        return null;
    }

    return (
        <TablePagination
            component="div"
            count={rowCount}
            page={page}
            onPageChange={(_event, newPage) =>
                apiRef.current.setPaginationModel({ page: newPage, pageSize })
            }
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) =>
                apiRef.current.setPaginationModel({
                    page: 0,
                    pageSize: parseInt(event.target.value, 10),
                })
            }
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ borderBottom: 'none' }}
        />
    );
}

function ToolbarSearchField() {
    const apiRef = useGridApiContext();
    const pathname = usePathname();
    const [value, setValue] = useState('');

    const placeholder = useMemo(() => {
        if (!pathname) return 'Search...';
        if (pathname.includes('/genomes/Annotations')) return 'Search subsystems...';
        if (pathname.includes('/biochem/reactions')) return 'Search reactions...';
        if (pathname.includes('/biochem/compounds')) return 'Search compounds...';
        if (pathname.includes('/reference-data/genomes')) return 'Search plant models...';
        if (pathname.includes('/reference-data/list-media')) return 'Search media...';
        if (pathname.includes('/user-data/my-models')) return 'Search my models...';
        if (pathname.includes('/user-data/myMedia')) return 'Search my media...';
        if (pathname.includes('/model/')) {
            if (pathname.endsWith('/reactions')) return 'Search reactions...';
            if (pathname.endsWith('/compounds')) return 'Search compounds...';
            if (pathname.endsWith('/genes')) return 'Search genes...';
            if (pathname.endsWith('/compartments')) return 'Search compartments...';
            if (pathname.endsWith('/biomass')) return 'Search biomass...';
            if (pathname.endsWith('/pathways')) return 'Search pathways...';
            return 'Search model...';
        }
        return 'Search...';
    }, [pathname]);

    const handleChange = (next: string) => {
        setValue(next);
        const quickFilterValues = next ? [next] : [];

        if ('setQuickFilterValues' in apiRef.current && typeof apiRef.current.setQuickFilterValues === 'function') {
            apiRef.current.setQuickFilterValues(quickFilterValues);
            return;
        }

        const current = (apiRef.current.state as unknown as { filter?: { filterModel?: GridFilterModel } }).filter?.filterModel;
        apiRef.current.setFilterModel({
            items: current?.items ?? [],
            quickFilterValues,
        });
    };

    return (
        <TextField
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            size="small"
            fullWidth
            placeholder={placeholder}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                ),
            }}
            sx={{ '& .MuiInputBase-input': { cursor: 'text' } }}
        />
    );
}

type ToolbarFilterRow = {
    id: string;
    field: string;
    operator: string;
    value: string;
};

function makeEmptyFilterRow(): ToolbarFilterRow {
    return {
        id: `filter-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        field: '',
        operator: '',
        value: '',
    };
}

function ToolbarFilterEditor() {
    const apiRef = useGridApiContext();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [rows, setRows] = useState<ToolbarFilterRow[]>([makeEmptyFilterRow()]);
    const [allColumns, setAllColumns] = useState<GridColDef[]>([]);

    const open = Boolean(anchorEl);

    const operatorOptionsForField = (field: string): { value: string; label: string }[] => {
        const column = allColumns.find((c) => c.field === field);
        if (!column) return [];
        const colType = column.type ?? 'string';
        if (colType === 'number') {
            return [
                { value: '=', label: '=' },
                { value: '!=', label: '!=' },
                { value: '>', label: '>' },
                { value: '>=', label: '>=' },
                { value: '<', label: '<' },
                { value: '<=', label: '<=' },
            ];
        }
        return [
            { value: 'contains', label: 'contains' },
            { value: 'equals', label: 'equals' },
            { value: 'startsWith', label: 'starts with' },
            { value: 'endsWith', label: 'ends with' },
        ];
    };

    const isFilled = (row: ToolbarFilterRow): boolean =>
        Boolean(row.field && row.operator && row.value.trim().length > 0);

    const applyRowsToGrid = (nextRows: ToolbarFilterRow[]) => {
        const current = (apiRef.current.state as unknown as { filter?: { filterModel?: GridFilterModel } }).filter?.filterModel;
        const filled = nextRows.filter(isFilled);
        const first = filled[0];
        const items: GridFilterItem[] = first
            ? [
                {
                    id: first.id,
                    field: first.field,
                    operator: first.operator,
                    value: first.value,
                },
            ]
            : [];
        apiRef.current.setFilterModel({
            ...(current ?? {}),
            items,
            quickFilterValues: current?.quickFilterValues ?? [],
            logicOperator: GridLogicOperator.And,
        });
    };

    const openEditor = (event: React.MouseEvent<HTMLButtonElement>) => {
        const columns = apiRef.current
            .getAllColumns()
            .filter((col) => col.filterable !== false && !col.field.startsWith('__'));
        setAllColumns(columns);
        const currentItems = ((apiRef.current.state as unknown as { filter?: { filterModel?: GridFilterModel } }).filter?.filterModel?.items ??
            []) as GridFilterItem[];
        if (currentItems.length > 0) {
            const mapped = currentItems.map((item) => ({
                id: String(item.id ?? `filter-${Math.random().toString(16).slice(2)}`),
                field: String(item.field ?? ''),
                operator: String(item.operator ?? ''),
                value: String(item.value ?? ''),
            }));
            setRows([...mapped, makeEmptyFilterRow()]);
        } else {
            setRows([makeEmptyFilterRow()]);
        }
        setAnchorEl(event.currentTarget);
    };

    const closeEditor = () => setAnchorEl(null);

    const updateRow = (idx: number, patch: Partial<ToolbarFilterRow>) => {
        const next = rows.map((row, i) => (i === idx ? { ...row, ...patch } : row));
        setRows(next);
        applyRowsToGrid(next);
    };

    const addRow = () => {
        const last = rows[rows.length - 1];
        if (!last || !isFilled(last)) return;
        setRows((prev) => [...prev, makeEmptyFilterRow()]);
    };

    const removeRow = (idx: number) => {
        // If there is only one row, clicking "x" should reset it to blank
        // (clear the filter) instead of doing nothing.
        if (rows.length === 1) {
            const reset = [makeEmptyFilterRow()];
            setRows(reset);
            applyRowsToGrid(reset);
            return;
        }
        const next = rows.filter((_, i) => i !== idx);
        const normalized = next.length > 0 ? next : [makeEmptyFilterRow()];
        setRows(normalized);
        applyRowsToGrid(normalized);
    };

    return (
        <>
            <Button variant="text" size="small" onClick={openEditor}>
                Filters
            </Button>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={closeEditor}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <Box sx={{ p: 2, width: 560, maxWidth: '95vw' }}>
                    <Stack spacing={1.5}>
                        {rows.map((row, idx) => {
                            const operatorOptions = operatorOptionsForField(row.field);
                            return (
                                <Box
                                    key={row.id}
                                    sx={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr auto auto', gap: 1, alignItems: 'center' }}
                                >
                                    <TextField
                                        select
                                        size="small"
                                        label="Column"
                                        value={row.field}
                                        onChange={(e) => updateRow(idx, { field: e.target.value, operator: '' })}
                                    >
                                        <MenuItem value="">Select column</MenuItem>
                                        {allColumns.map((col: GridColDef) => (
                                            <MenuItem key={col.field} value={col.field}>
                                                {col.headerName ?? col.field}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select
                                        size="small"
                                        label="Operator"
                                        value={row.operator}
                                        onChange={(e) => updateRow(idx, { operator: e.target.value })}
                                        disabled={!row.field}
                                    >
                                        <MenuItem value="">Select</MenuItem>
                                        {operatorOptions.map((opt) => (
                                            <MenuItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        size="small"
                                        label="Value"
                                        value={row.value}
                                        onChange={(e) => updateRow(idx, { value: e.target.value })}
                                        disabled={!row.field || !row.operator}
                                    />
                                    <IconButton
                                        size="small"
                                        aria-label="Add filter row"
                                        onClick={addRow}
                                        disabled={idx !== rows.length - 1}
                                    >
                                        <AddIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        aria-label="Remove filter row"
                                        onClick={() => removeRow(idx)}
                                        disabled={rows.length <= 1}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>
            </Popover>
        </>
    );
}

/**
 * Single data control bar for tables: white search box (with icon), Filters, Columns, and pagination.
 * Use as the DataGrid toolbar slot so there is only one bar above the table.
 */
export default function DataControlHeader() {
    return (
        <GridToolbarContainer
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#f9f9f9',
                flexWrap: 'wrap',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    mb: { xs: 1, md: 0 },
                }}
            >
                <Box
                    sx={{
                        backgroundColor: '#fff',
                        p: 0.5,
                        px: 1,
                        borderRadius: 1,
                        border: '1px solid #ccc',
                        width: { xs: '100%', sm: 300 },
                        '& .MuiFormControl-root': { width: '100%' },
                        '& .MuiInputBase-root': { width: '100%' },
                        '& .MuiInputBase-input': { width: '100%', minWidth: 0 },
                    }}
                >
                    <ToolbarSearchField />
                </Box>
                <ToolbarFilterEditor />
                <GridToolbarColumnsButton aria-label="Manage Columns" />
            </Box>
            <CustomPagination />
        </GridToolbarContainer>
    );
}
