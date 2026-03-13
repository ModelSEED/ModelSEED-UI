'use client';

import {
    GridToolbarContainer,
    GridToolbarFilterButton,
    GridToolbarColumnsButton,
    useGridApiContext,
    useGridSelector,
    gridPageSelector,
    gridPageSizeSelector,
    gridRowCountSelector,
    type GridFilterModel,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
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
                <GridToolbarFilterButton aria-label="Filters" />
                <GridToolbarColumnsButton aria-label="Manage Columns" />
            </Box>
            <CustomPagination />
        </GridToolbarContainer>
    );
}
