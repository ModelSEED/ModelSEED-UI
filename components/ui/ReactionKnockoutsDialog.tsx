'use client';

import { useState, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import DataControlHeader, { withQuickSearchHeaders } from '@/components/layout/DataControlHeader';
import Link from 'next/link';

interface ModelReaction {
    id: string;
    name: string;
    direction?: string;
    equation?: string;
}

interface ReactionKnockoutsDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (selectedIds: string[]) => void;
    reactions: ModelReaction[];
    initialSelectedIds?: string[];
}

export default function ReactionKnockoutsDialog({
    open,
    onClose,
    onSave,
    reactions,
    initialSelectedIds = [],
}: ReactionKnockoutsDialogProps) {
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({
        type: 'include',
        ids: new Set<string>(initialSelectedIds),
    });

    const columns = useMemo<GridColDef<ModelReaction>[]>(
        () => [
            {
                field: 'id',
                headerName: 'Reaction ID',
                width: 130,
                renderCell: (params) => (
                    <Link
                        href={`/biochem/reactions/${params.value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#00acc1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        {params.value}
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                    </Link>
                ),
            },
            { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
            { field: 'direction', headerName: 'Direction', width: 100 },
            { field: 'equation', headerName: 'Equation', flex: 1.5, minWidth: 300 },
        ],
        [],
    );

    const handleSave = () => {
        const selectedIds =
            selectionModel.type === 'include' ? Array.from(selectionModel.ids).map(String) : [];
        onSave(selectedIds);
        onClose();
    };

    const handleClose = () => {
        // Reset to initial selection on cancel
        setSelectionModel({ type: 'include', ids: new Set<string>(initialSelectedIds) });
        onClose();
    };

    const handleRemoveChip = (id: string) => {
        if (selectionModel.type === 'include') {
            const newIds = new Set(selectionModel.ids);
            newIds.delete(id);
            setSelectionModel({ type: 'include', ids: newIds });
        }
    };

    const selectionCount = selectionModel.type === 'include' ? selectionModel.ids.size : 0;
    const selectedReactions = useMemo(() => {
        if (selectionModel.type !== 'include') return [];
        const selectedIds = Array.from(selectionModel.ids);
        return reactions.filter((r) => selectedIds.includes(r.id));
    }, [reactions, selectionModel]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Select Reactions to Knock Out
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {selectedReactions.length > 0 && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box sx={{ mb: 1, fontWeight: 600, fontSize: '0.875rem' }}>
                            Selected Reactions ({selectedReactions.length}):
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {selectedReactions.map((reaction) => (
                                <Chip
                                    key={reaction.id}
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Link
                                                href={`/biochem/reactions/${reaction.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    color: 'inherit',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {reaction.id}
                                                <OpenInNewIcon sx={{ fontSize: 12 }} />
                                            </Link>
                                            <span style={{ opacity: 0.7, fontSize: '0.875em' }}>
                                                {reaction.name && ` - ${reaction.name.substring(0, 30)}${reaction.name.length > 30 ? '...' : ''}`}
                                            </span>
                                        </Box>
                                    }
                                    onDelete={() => handleRemoveChip(reaction.id)}
                                    size="small"
                                    sx={{ maxWidth: 500 }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                <DataGrid
                    rows={reactions}
                    columns={withQuickSearchHeaders(columns)}
                    getRowId={(row) => row.id}
                    checkboxSelection
                    rowSelectionModel={selectionModel}
                    onRowSelectionModelChange={setSelectionModel}
                    pageSizeOptions={[10, 25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                    }}
                    showToolbar
                    slots={{ toolbar: DataControlHeader }}
                    slotProps={{ toolbar: { showQuickFilter: true } }}
                    hideFooter
                    autoHeight
                    disableRowSelectionOnClick={false}
                    sx={{
                        minHeight: 400,
                        '& .MuiDataGrid-cell': {
                            py: 1,
                        },
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>
                    Save {selectionCount > 0 ? `(${selectionCount} selected)` : ''}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
