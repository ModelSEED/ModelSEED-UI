'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DataGrid, GridColDef, GridRowSelectionModel, GridRenderEditCellParams, useGridApiContext } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import AddCompoundsDialog from './AddCompoundsDialog';

/** Compound entry in media */
export interface MediaCompound {
    id: string;
    name: string;
    formula?: string;
    charge?: number;
    concentration: number;
    minFlux: number;
    maxFlux: number;
}

/** Full media object */
export interface MediaData {
    id: string;
    name: string;
    type: 'media';
    compounds: MediaCompound[];
    source?: string;
    source_id?: string;
    isDefined?: boolean;
    isMinimal?: boolean;
    isAerobic?: boolean;
}

interface MediaEditorProps {
    /** Initial media data */
    initialMedia: MediaData;
    /** Called when user saves changes. Returns true if save succeeded. */
    onSave?: (media: MediaData) => Promise<boolean>;
    /** If true, save button is disabled (API unavailable) */
    saveDisabled?: boolean;
    /** Message to show when save is disabled */
    saveDisabledMessage?: string;
    /** Read-only mode */
    readOnly?: boolean;
}

/** Custom editable cell for numeric fields */
function EditNumericCell(props: GridRenderEditCellParams<MediaCompound, number>) {
    const { id, field, value } = props;
    const apiRef = useGridApiContext();

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value === '' ? 0 : parseFloat(event.target.value);
        apiRef.current.setEditCellValue({ id, field, value: newValue });
    };

    return (
        <TextField
            type="number"
            value={value ?? 0}
            onChange={handleChange}
            variant="standard"
            fullWidth
            size="small"
            inputProps={{ step: 0.001 }}
            sx={{ '& input': { textAlign: 'right' } }}
        />
    );
}

export default function MediaEditor({
    initialMedia,
    onSave,
    saveDisabled = false,
    saveDisabledMessage = 'Save is currently unavailable. Backend API requires fixes.',
    readOnly = false,
}: MediaEditorProps) {
    const [media, setMedia] = useState<MediaData>(initialMedia);
    const [originalMedia, setOriginalMedia] = useState<MediaData>(initialMedia);
    const [selectedIds, setSelectedIds] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set<string>() });
    const [addCompoundsOpen, setAddCompoundsOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Track unsaved changes
    useEffect(() => {
        const changed = JSON.stringify(media.compounds) !== JSON.stringify(originalMedia.compounds);
        setHasUnsavedChanges(changed);
    }, [media, originalMedia]);

    const columns: GridColDef<MediaCompound>[] = useMemo(
        () => [
            {
                field: 'id',
                headerName: 'ID',
                flex: 1,
                minWidth: 100,
            },
            {
                field: 'name',
                headerName: 'Name',
                flex: 2,
                minWidth: 150,
            },
            {
                field: 'formula',
                headerName: 'Formula',
                flex: 1.5,
                minWidth: 100,
            },
            {
                field: 'concentration',
                headerName: 'Concentration (mM)',
                type: 'number',
                flex: 1.2,
                minWidth: 130,
                editable: !readOnly,
                renderEditCell: (params) => <EditNumericCell {...params} />,
            },
            {
                field: 'minFlux',
                headerName: 'Min Flux',
                type: 'number',
                flex: 1,
                minWidth: 100,
                editable: !readOnly,
                renderEditCell: (params) => <EditNumericCell {...params} />,
            },
            {
                field: 'maxFlux',
                headerName: 'Max Flux',
                type: 'number',
                flex: 1,
                minWidth: 100,
                editable: !readOnly,
                renderEditCell: (params) => <EditNumericCell {...params} />,
            },
        ],
        [readOnly]
    );

    const handleAddCompounds = useCallback((compounds: { id: string; name: string; formula?: string; charge?: number }[]) => {
        setMedia((prev) => {
            const existingIds = new Set(prev.compounds.map((c) => c.id));
            const newCompounds: MediaCompound[] = compounds
                .filter((c) => !existingIds.has(c.id))
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    formula: c.formula,
                    charge: c.charge,
                    concentration: 0.001,
                    minFlux: -100,
                    maxFlux: 100,
                }));
            return {
                ...prev,
                compounds: [...prev.compounds, ...newCompounds],
            };
        });
        setAddCompoundsOpen(false);
    }, []);

    const handleRemoveSelected = useCallback(() => {
        setMedia((prev) => ({
            ...prev,
            compounds: prev.compounds.filter((c) => selectedIds.type === 'include' ? !selectedIds.ids.has(c.id) : selectedIds.ids.has(c.id)),
        }));
        setSelectedIds({ type: 'include', ids: new Set<string>() });
        setConfirmDeleteOpen(false);
    }, [selectedIds]);

    const handleCellEdit = useCallback((newRow: MediaCompound, oldRow: MediaCompound) => {
        setMedia((prev) => ({
            ...prev,
            compounds: prev.compounds.map((c) => (c.id === newRow.id ? newRow : c)),
        }));
        return newRow;
    }, []);

    const handleSave = useCallback(async () => {
        if (!onSave) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            const success = await onSave(media);
            if (success) {
                setOriginalMedia(media);
                setHasUnsavedChanges(false);
            } else {
                setSaveError('Save failed. Please try again.');
            }
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setIsSaving(false);
        }
    }, [media, onSave]);

    const handleRevert = useCallback(() => {
        setMedia(originalMedia);
        setHasUnsavedChanges(false);
    }, [originalMedia]);

    const existingCompoundIds = useMemo(() => media.compounds.map((c) => c.id), [media.compounds]);

    const selectedCount = selectedIds.type === 'include' ? selectedIds.ids.size : 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                    {media.name || 'Media Editor'}
                    {hasUnsavedChanges && (
                        <Typography component="span" color="warning.main" sx={{ ml: 1 }}>
                            (unsaved changes)
                        </Typography>
                    )}
                </Typography>

                {!readOnly && (
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setAddCompoundsOpen(true)}
                        >
                            Add Compounds
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setConfirmDeleteOpen(true)}
                            disabled={selectedCount === 0}
                        >
                            Remove Selected ({selectedCount})
                        </Button>
                        <Tooltip title={hasUnsavedChanges ? 'Revert to last saved state' : 'No changes to revert'}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={handleRevert}
                                    disabled={!hasUnsavedChanges}
                                >
                                    <UndoIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={saveDisabled ? saveDisabledMessage : 'Save changes'}>
                            <span>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSave}
                                    disabled={saveDisabled || !hasUnsavedChanges || isSaving}
                                    loading={isSaving}
                                >
                                    Save
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                )}
            </Box>

            {/* API unavailable warning */}
            {saveDisabled && !readOnly && (
                <Alert severity="warning">
                    {saveDisabledMessage}
                </Alert>
            )}

            {/* Save error */}
            {saveError && (
                <Alert severity="error" onClose={() => setSaveError(null)}>
                    {saveError}
                </Alert>
            )}

            {/* Compound table */}
            <Box sx={{ flex: 1, minHeight: 400 }}>
                <DataGrid<MediaCompound>
                    rows={media.compounds}
                    columns={columns}
                    getRowId={(row) => row.id}
                    checkboxSelection={!readOnly}
                    disableRowSelectionOnClick
                    rowSelectionModel={selectedIds}
                    onRowSelectionModelChange={setSelectedIds}
                    processRowUpdate={handleCellEdit}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                    }}
                    sx={{
                        '& .MuiDataGrid-cell:focus': {
                            outline: 'none',
                        },
                    }}
                />
            </Box>

            {/* Add Compounds Dialog */}
            <AddCompoundsDialog
                open={addCompoundsOpen}
                onClose={() => setAddCompoundsOpen(false)}
                onAdd={handleAddCompounds}
                excludeIds={existingCompoundIds}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
                <DialogTitle>Remove Compounds</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to remove {selectedCount} compound{selectedCount > 1 ? 's' : ''} from this media?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
                    <Button onClick={handleRemoveSelected} color="error" variant="contained">
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
