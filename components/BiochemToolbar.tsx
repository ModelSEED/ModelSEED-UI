import React, { useEffect, useState } from 'react';
import {
    GridToolbarContainer,
    GridToolbarFilterButton,
    GridToolbarQuickFilter,
    GridToolbarColumnsButton,
    useGridApiContext,
    useGridSelector,
    gridPageSelector,
    gridPageSizeSelector,
    gridRowCountSelector
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';

function CustomPagination() {
    const apiRef = useGridApiContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    const page = useGridSelector(apiRef, gridPageSelector);
    const pageSize = useGridSelector(apiRef, gridPageSizeSelector);
    const rowCount = useGridSelector(apiRef, gridRowCountSelector);

    return (
        <TablePagination
            component="div"
            count={rowCount}
            page={page}
            onPageChange={(event, newPage) => apiRef.current.setPaginationModel({ page: newPage, pageSize })}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => apiRef.current.setPaginationModel({ page: 0, pageSize: parseInt(event.target.value, 10) })}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
                borderBottom: 'none',
            }}
        />
    );
}

export default function BiochemToolbar() {
    return (
        <GridToolbarContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f9f9f9', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: { xs: 1, md: 0 } }}>
                <Box sx={{
                    backgroundColor: '#fff',
                    p: 0.5,
                    px: 1,
                    borderRadius: 1,
                    border: '1px solid #ccc',
                    width: { xs: '100%', sm: 300 },
                    display: 'flex',
                    alignItems: 'center',
                    '& .MuiFormControl-root': { width: '100%' }
                }}>
                    <GridToolbarQuickFilter debounceMs={500} />
                </Box>
                <GridToolbarFilterButton
                    aria-label="Filters"
                />
                <GridToolbarColumnsButton
                    aria-label="Manage Columns"
                />
            </Box>
            <CustomPagination />
        </GridToolbarContainer>
    );
}
