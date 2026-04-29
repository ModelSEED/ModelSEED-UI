'use client';

import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { exportToCsv } from '@/lib/utils/exportCsv';

export interface ExportColumnConfig {
    field: string;
    headerName: string;
    defaultSelected?: boolean;
}

interface ExportModalProps {
    open: boolean;
    onClose: () => void;
    columns: ExportColumnConfig[];
    currentData: Record<string, unknown>[];
    allDataFetcher?: () => Promise<Record<string, unknown>[]>;
    totalRows: number;
    filename: string;
    columnLabels?: Record<string, string>;
    activeSearch?: string;
    activeFilter?: string;
}

export default function ExportModal({
    open,
    onClose,
    columns,
    currentData,
    allDataFetcher,
    totalRows,
    filename,
    columnLabels,
    activeSearch,
    activeFilter,
}: ExportModalProps) {
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
        () => new Set(columns.filter(c => c.defaultSelected !== false).map(c => c.field))
    );
    const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleToggleColumn = useCallback((field: string) => {
        setSelectedColumns(prev => {
            const next = new Set(prev);
            if (next.has(field)) {
                next.delete(field);
            } else {
                next.add(field);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedColumns(new Set(columns.map(c => c.field)));
    }, [columns]);

    const handleSelectNone = useCallback(() => {
        setSelectedColumns(new Set());
    }, []);

    const handleExport = useCallback(async () => {
        if (selectedColumns.size === 0) {
            setError('Please select at least one column to export.');
            return;
        }

        setIsExporting(true);
        setError(null);

        try {
            let dataToExport = currentData;

            if (exportScope === 'all' && allDataFetcher) {
                dataToExport = await allDataFetcher();
            }

            if (dataToExport.length === 0) {
                setError('No data to export.');
                setIsExporting(false);
                return;
            }

            const selectedFields = Array.from(selectedColumns);
            const exportData = dataToExport.map(row => {
                const filtered: Record<string, unknown> = {};
                selectedFields.forEach(field => {
                    filtered[field] = row[field];
                });
                return filtered;
            });

            const labels = columnLabels ?? {};
            exportToCsv(exportData, {
                filename,
                columns: selectedFields,
                columnLabels: labels,
            });

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed.');
        } finally {
            setIsExporting(false);
        }
    }, [selectedColumns, currentData, exportScope, allDataFetcher, filename, columnLabels, onClose]);

    const handleClose = useCallback(() => {
        if (isExporting) return;
        onClose();
        setError(null);
    }, [isExporting, onClose]);

    const selectedCount = selectedColumns.size;
    const totalColumns = columns.length;

    const hasActiveFilters = Boolean(activeSearch || activeFilter);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Export Data</DialogTitle>
            <DialogContent>
                {hasActiveFilters && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Active Filters</Typography>
                        {activeSearch && (
                            <Typography variant="body2">Search: &quot;{activeSearch}&quot;</Typography>
                        )}
                        {activeFilter && (
                            <Typography variant="body2">Column Filter: {activeFilter}</Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            These filters will be applied to the export.
                        </Typography>
                    </Alert>
                )}

                {!hasActiveFilters && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        No active filters. Exporting all data.
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                    <FormLabel component="legend" sx={{ mb: 1 }}>Export Scope</FormLabel>
                    <RadioGroup
                        value={exportScope}
                        onChange={(_, value) => setExportScope(value as 'current' | 'all')}
                    >
                        <FormControlLabel
                            value="current"
                            control={<Radio size="small" />}
                            label={`Current page (${currentData.length} rows)`}
                        />
                        <FormControlLabel
                            value="all"
                            control={<Radio size="small" />}
                            label={`All matching rows (${totalRows} rows)`}
                            disabled={!allDataFetcher}
                        />
                    </RadioGroup>
                    {!allDataFetcher && totalRows > currentData.length && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            To export all rows, an API fetch function is required.
                        </Typography>
                    )}
                </FormControl>

                <Divider sx={{ my: 2 }} />

                <FormControl component="fieldset" sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <FormLabel component="legend">Columns to Export</FormLabel>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={handleSelectAll} sx={{ fontSize: '0.75rem' }}>
                                All
                            </Button>
                            <Button size="small" onClick={handleSelectNone} sx={{ fontSize: '0.75rem' }}>
                                None
                            </Button>
                        </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {selectedCount} of {totalColumns} columns selected
                    </Typography>
                    <FormGroup>
                        {columns.map(col => (
                            <FormControlLabel
                                key={col.field}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={selectedColumns.has(col.field)}
                                        onChange={() => handleToggleColumn(col.field)}
                                    />
                                }
                                label={col.headerName}
                            />
                        ))}
                    </FormGroup>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isExporting}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleExport}
                    disabled={isExporting || selectedCount === 0}
                >
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
