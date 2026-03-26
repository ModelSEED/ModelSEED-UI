'use client';

import { useState, useMemo } from 'react';
import NextLink from 'next/link';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { getCompounds, type Compound, type SolrQueryOpts } from '@/lib/api/biochem';
import { formatFormula } from '@/components/utils/formatFormula';

interface AddCompoundsDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (compounds: Compound[]) => void;
    excludeIds?: string[];
}

const columns: GridColDef<Compound>[] = [
    {
        field: 'id',
        headerName: 'ID',
        width: 120,
        renderCell: (params) => (
            <Link
                component={NextLink}
                href={`/biochem/compounds/${params.row.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                sx={{ color: '#00acc1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
                {String(params.value ?? '')}
            </Link>
        ),
    },
    {
        field: 'name',
        headerName: 'Name',
        width: 180,
        flex: 1,
        renderCell: (params) => (
            <Link
                component={NextLink}
                href={`/biochem/compounds/${params.row.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                sx={{ color: '#00acc1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
                {String(params.value ?? params.row.id)}
            </Link>
        ),
    },
    {
        field: 'formula',
        headerName: 'Formula',
        width: 120,
        renderCell: (params) => formatFormula(params.value),
    },
    { field: 'mass', headerName: 'Mass', width: 80, type: 'number' },
    { field: 'charge', headerName: 'Charge', width: 80, type: 'number' },
];

export default function AddCompoundsDialog({ open, onClose, onAdd, excludeIds = [] }: AddCompoundsDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('*');
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set<string>() });

    // Debounce search
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        // Simple debounce using setTimeout
        const timeoutId = setTimeout(() => {
            setDebouncedQuery(value || '*');
        }, 300);
        return () => clearTimeout(timeoutId);
    };

    const queryOpts = useMemo<SolrQueryOpts>(() => ({
        query: debouncedQuery || '*',
        limit: 50,
        offset: 0,
        sort: { field: 'id' },
    }), [debouncedQuery]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['compounds-picker', queryOpts],
        queryFn: () => getCompounds(queryOpts),
        enabled: open,
    });

    // Filter out excluded IDs
    const filteredDocs = useMemo(() => {
        if (!data?.docs) return [];
        const excludeSet = new Set(excludeIds);
        return data.docs.filter((c) => !excludeSet.has(c.id));
    }, [data, excludeIds]);

    const handleAdd = () => {
        const selectedIds = selectionModel.type === 'include' 
            ? Array.from(selectionModel.ids) 
            : [];
        const selectedCompounds = filteredDocs.filter((c) =>
            selectedIds.includes(c.id)
        );
        onAdd(selectedCompounds);
        handleClose();
    };

    const handleClose = () => {
        setSearchQuery('');
        setDebouncedQuery('*');
        setSelectionModel({ type: 'include', ids: new Set<string>() });
        onClose();
    };

    const selectionCount = selectionModel.type === 'include' ? selectionModel.ids.size : 0;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Add Compounds</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2, mt: 1 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Search compounds"
                        placeholder="Enter at least 2 characters to search..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        size="small"
                    />
                </Box>

                {error && (
                    <Box sx={{ color: 'error.main', mb: 2 }}>
                        Failed to search compounds. Please try again.
                    </Box>
                )}

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!isLoading && data && (
                    <DataGrid
                        rows={filteredDocs}
                        columns={columns}
                        getRowId={(row) => row.id}
                        checkboxSelection
                        rowSelectionModel={selectionModel}
                        onRowSelectionModelChange={setSelectionModel}
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10 } },
                        }}
                        autoHeight
                        disableRowSelectionOnClick
                        sx={{ minHeight: 300 }}
                    />
                )}

                {!isLoading && !data && (
                    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                        Enter a search term to find compounds
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleAdd}
                    disabled={selectionCount === 0}
                >
                    Add {selectionCount > 0 ? `(${selectionCount})` : ''} Selected
                </Button>
            </DialogActions>
        </Dialog>
    );
}
