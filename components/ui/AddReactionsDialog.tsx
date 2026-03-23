'use client';

import { useState, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { getReactions, type Reaction, type SolrQueryOpts } from '@/lib/api/biochem';
import { formatEquation } from '@/components/utils/formatEquation';

interface AddReactionsDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (reactions: Reaction[]) => void;
    excludeIds?: string[];
}

const columns: GridColDef<Reaction>[] = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'name', headerName: 'Name', width: 160 },
    {
        field: 'definition',
        headerName: 'Equation',
        width: 300,
        flex: 1,
        renderCell: (params) => formatEquation(params.value),
    },
    { field: 'reversibility', headerName: 'Rev.', width: 60 },
    { field: 'deltag', headerName: 'ΔG', width: 70, type: 'number' },
];

export default function AddReactionsDialog({ open, onClose, onAdd, excludeIds = [] }: AddReactionsDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set<string>() });

    // Debounce search
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        const timeoutId = setTimeout(() => {
            setDebouncedQuery(value);
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
        queryKey: ['reactions-picker', queryOpts],
        queryFn: () => getReactions(queryOpts),
        enabled: open && debouncedQuery.length >= 2,
    });

    // Filter out excluded IDs
    const filteredDocs = useMemo(() => {
        if (!data?.docs) return [];
        const excludeSet = new Set(excludeIds);
        return data.docs.filter((r) => !excludeSet.has(r.id));
    }, [data?.docs, excludeIds]);

    const handleAdd = () => {
        const selectedIds = selectionModel.type === 'include' 
            ? Array.from(selectionModel.ids) 
            : [];
        const selectedReactions = filteredDocs.filter((r) =>
            selectedIds.includes(r.id)
        );
        onAdd(selectedReactions);
        handleClose();
    };

    const handleClose = () => {
        setSearchQuery('');
        setDebouncedQuery('');
        setSelectionModel({ type: 'include', ids: new Set<string>() });
        onClose();
    };

    const selectionCount = selectionModel.type === 'include' ? selectionModel.ids.size : 0;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Add Reactions</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2, mt: 1 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Search reactions"
                        placeholder="Enter at least 2 characters to search..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        size="small"
                    />
                </Box>

                {error && (
                    <Box sx={{ color: 'error.main', mb: 2 }}>
                        Failed to search reactions. Please try again.
                    </Box>
                )}

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!isLoading && debouncedQuery.length >= 2 && (
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

                {!isLoading && debouncedQuery.length < 2 && (
                    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                        Enter at least 2 characters to search reactions
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
