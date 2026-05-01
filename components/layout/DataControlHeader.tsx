'use client';

import {
    GridToolbarContainer,
    useGridApiContext,
    useGridSelector,
    gridPageSelector,
    gridPageSizeSelector,
    gridRowCountSelector,
    gridFilterModelSelector,
    type GridColDef,
    type GridFilterItem,
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
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useRef, useCallback, type MouseEvent } from 'react';

const NO_VALUE_OPERATORS = new Set(['isEmpty', 'isNotEmpty']);

const STRING_OPERATORS = [
    { value: 'contains', label: 'contains' },
    { value: 'doesNotContain', label: 'does not contain' },
    { value: 'equals', label: 'equals' },
    { value: 'doesNotEqual', label: 'does not equal' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' },
];

const NUMBER_OPERATORS = [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: '>', label: '>' },
    { value: '>=', label: '>=' },
    { value: '<', label: '<' },
    { value: '<=', label: '<=' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' },
];

const DATE_OPERATORS = [
    { value: 'is', label: 'is' },
    { value: 'after', label: 'after' },
    { value: 'onOrAfter', label: 'on or after' },
    { value: 'before', label: 'before' },
    { value: 'onOrBefore', label: 'on or before' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' },
];

const BOOLEAN_OPERATORS = [
    { value: 'is', label: 'is' },
    { value: 'not', label: 'is not' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' },
];

function CustomPagination() {
    const apiRef = useGridApiContext();
    const page = useGridSelector(apiRef, gridPageSelector);
    const pageSize = useGridSelector(apiRef, gridPageSizeSelector);
    const rowCount = useGridSelector(apiRef, gridRowCountSelector);
    const ready = page !== undefined && pageSize !== undefined && rowCount !== undefined;
    const pageValue = page ?? 0;
    const pageSizeValue = pageSize ?? 25;
    const rowCountValue = rowCount ?? 0;
    const lastPage = Math.max(0, Math.ceil(rowCountValue / pageSizeValue) - 1);
    const safePage = Math.min(pageValue, lastPage);

    useEffect(() => {
        if (!ready) return;
        if (pageValue > lastPage) {
            apiRef.current.setPaginationModel({ page: lastPage, pageSize: pageSizeValue });
        }
    }, [apiRef, ready, pageValue, pageSizeValue, lastPage]);

    if (!ready) {
        return null;
    }

    return (
        <TablePagination
            component="div"
            count={rowCountValue}
            page={safePage}
            onPageChange={(_event, newPage) =>
                apiRef.current.setPaginationModel({ page: newPage, pageSize: pageSizeValue })
            }
            rowsPerPage={pageSizeValue}
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
    const [searchTerm, setSearchTerm] = useState('');
    const [matchIndex, setMatchIndex] = useState(0);
    const [totalMatches, setTotalMatches] = useState(0);
    const allMatchesRef = useRef<HTMLElement[]>([]);
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const placeholder = useMemo(() => {
        if (!pathname) return 'Find in page...';
        if (pathname.includes('/biochem/reactions')) return 'Find in reactions...';
        if (pathname.includes('/biochem/compounds')) return 'Find in compounds...';
        if (pathname.includes('/genomes/Annotations')) return 'Find in subsystems...';
        if (pathname.includes('/reference-data/genomes')) return 'Find in plant models...';
        if (pathname.includes('/reference-data/list-media')) return 'Find in media...';
        if (pathname.includes('/my-models')) return 'Find in my models...';
        if (pathname.includes('/myMedia')) return 'Find in my media...';
        if (pathname.includes('/model/')) {
            if (pathname.endsWith('/reactions')) return 'Find in reactions...';
            if (pathname.endsWith('/compounds')) return 'Find in compounds...';
            if (pathname.endsWith('/genes')) return 'Find in genes...';
            if (pathname.endsWith('/compartments')) return 'Find in compartments...';
            if (pathname.endsWith('/biomass')) return 'Find in biomass...';
            if (pathname.endsWith('/pathways')) return 'Find in pathways...';
            return 'Find in model...';
        }
        return 'Find in page...';
    }, [pathname]);

    const clearHighlights = useCallback(() => {
        document.querySelectorAll('.search-highlight').forEach((el) => {
            const parent = el.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(el.textContent ?? ''), el);
                parent.normalize();
            }
        });
        allMatchesRef.current = [];
    }, []);

    const highlightText = useCallback((term: string) => {
        clearHighlights();
        if (!term || term.trim().length === 0) {
            setTotalMatches(0);
            setMatchIndex(0);
            return;
        }

        const grid = document.querySelector('[role="grid"]');
        if (!grid) {
            setTotalMatches(0);
            setMatchIndex(0);
            return;
        }

        const matches: HTMLElement[] = [];
        const caseSensitive = term === term.toLowerCase() ? false : term !== term.toLowerCase();
        const searchLower = caseSensitive ? term : term.toLowerCase();

        // Get all text nodes in grid cells
        const walker = document.createTreeWalker(grid, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            const parent = node.parentElement;
            if (parent && parent.closest('[role="gridcell"]')) {
                textNodes.push(node);
            }
        }

        textNodes.forEach((textNode) => {
            const text = textNode.textContent ?? '';
            const textCompare = caseSensitive ? text : text.toLowerCase();
            let idx = 0;

            while ((idx = textCompare.indexOf(searchLower, idx)) !== -1) {
                const range = document.createRange();
                range.setStart(textNode, idx);
                range.setEnd(textNode, idx + term.length);

                const mark = document.createElement('mark');
                mark.className = 'search-highlight';
                mark.style.backgroundColor = '#ffeb3b';
                mark.style.color = '#000';
                mark.style.padding = '0 2px';
                mark.style.borderRadius = '2px';
                range.surroundContents(mark);
                matches.push(mark);

                idx += term.length;
            }
        });

        allMatchesRef.current = matches;
        setTotalMatches(matches.length);
        setMatchIndex(matches.length > 0 ? 0 : 0);

        if (matches.length > 0) {
            matches[0].style.backgroundColor = '#ff9800';
            matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [clearHighlights]);

    const navigateToMatch = useCallback((index: number) => {
        if (totalMatches === 0) return;
        const clampedIndex = ((index % totalMatches) + totalMatches) % totalMatches;
        setMatchIndex(clampedIndex);

        // Reset all highlights to default color
        allMatchesRef.current.forEach((el, i) => {
            el.style.backgroundColor = i === clampedIndex ? '#ff9800' : '#ffeb3b';
        });

        const target = allMatchesRef.current[clampedIndex];
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [totalMatches]);

    useEffect(() => {
        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = setTimeout(() => {
            highlightText(searchTerm);
        }, 300);

        return () => {
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, [searchTerm, highlightText]);

    useEffect(() => {
        return () => {
            clearHighlights();
        };
    }, [clearHighlights]);

    const handleClear = () => {
        setSearchTerm('');
        clearHighlights();
        setTotalMatches(0);
        setMatchIndex(0);
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
            <TextField
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        if (e.shiftKey) navigateToMatch(matchIndex - 1);
                        else navigateToMatch(matchIndex + 1);
                    }
                }}
                size="small"
                fullWidth
                placeholder={placeholder}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                    ),
                    endAdornment: searchTerm ? (
                        <InputAdornment position="end">
                            <IconButton
                                size="small"
                                aria-label="Clear search"
                                onClick={handleClear}
                                edge="end"
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ) : undefined,
                }}
                sx={{ '& .MuiInputBase-input': { cursor: 'text' } }}
            />
            {searchTerm && totalMatches > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap', ml: 0.5 }}>
                    <IconButton
                        size="small"
                        aria-label="Previous match"
                        onClick={() => navigateToMatch(matchIndex - 1)}
                    >
                        <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" sx={{ minWidth: '60px', textAlign: 'center' }}>
                        {matchIndex + 1} of {totalMatches}
                    </Typography>
                    <IconButton
                        size="small"
                        aria-label="Next match"
                        onClick={() => navigateToMatch(matchIndex + 1)}
                    >
                        <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}
        </Box>
    );
}

type ToolbarFilterRow = {
    id: string;
    field: string;
    operator: string;
    value: string;
};

type ToolbarLogicOperator = GridLogicOperator.And | GridLogicOperator.Or;

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
    const filterModel = useGridSelector(apiRef, gridFilterModelSelector);

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [allColumns, setAllColumns] = useState<GridColDef[]>([]);
    const [draftRows, setDraftRows] = useState<ToolbarFilterRow[]>([makeEmptyFilterRow()]);
    const [draftLogicOperator, setDraftLogicOperator] = useState<ToolbarLogicOperator>(GridLogicOperator.And);
    const [draftColumnVisibilityModel, setDraftColumnVisibilityModel] = useState<Record<string, boolean>>({});
    const [appliedHiddenColumnCount, setAppliedHiddenColumnCount] = useState(0);

    const open = Boolean(anchorEl);
    const filterableColumns = allColumns.filter((column) => column.filterable !== false);
    const activeAppliedFilterCount = (filterModel?.items ?? []).filter((item) => {
        if (!item.field || !item.operator) return false;
        if (NO_VALUE_OPERATORS.has(String(item.operator))) return true;
        if (Array.isArray(item.value)) return item.value.length > 0;
        return String(item.value ?? '').trim().length > 0;
    }).length;
    const controlCount = activeAppliedFilterCount + appliedHiddenColumnCount;
    const filterButtonLabel = controlCount > 0 ? `Filter & Columns (${controlCount})` : 'Filter & Columns';

    const getColumnType = (field: string): string =>
        String(allColumns.find((column) => column.field === field)?.type ?? 'string');

    const operatorOptionsForField = (field: string): { value: string; label: string }[] => {
        const type = getColumnType(field);
        if (type === 'number') return NUMBER_OPERATORS;
        if (type === 'boolean') return BOOLEAN_OPERATORS;
        if (type === 'date' || type === 'dateTime') return DATE_OPERATORS;
        return STRING_OPERATORS;
    };

    const isNoValueOperator = (operator: string): boolean => NO_VALUE_OPERATORS.has(operator);

    const isFilled = (row: ToolbarFilterRow): boolean =>
        Boolean(
            row.field &&
            row.operator &&
            (isNoValueOperator(row.operator) || row.value.trim().length > 0),
        );

    const toFilterValue = (row: ToolbarFilterRow): GridFilterItem['value'] => {
        if (isNoValueOperator(row.operator)) return undefined;

        const raw = row.value.trim();
        const type = getColumnType(row.field);
        if (type === 'number') {
            const parsed = Number(raw);
            return Number.isFinite(parsed) ? parsed : raw;
        }
        if (type === 'boolean') {
            if (raw === 'true') return true;
            if (raw === 'false') return false;
        }
        return raw;
    };

    const openEditor = (event: MouseEvent<HTMLButtonElement>) => {
        const columns = apiRef.current
            .getAllColumns()
            .filter((column) => !column.field.startsWith('__'));
        setAllColumns(columns);

        const visibilityState =
            (apiRef.current.state as unknown as { columns?: { columnVisibilityModel?: Record<string, boolean> } })
                .columns?.columnVisibilityModel ?? {};
        const visibilityModel: Record<string, boolean> = {};
        columns.forEach((column) => {
            visibilityModel[column.field] = visibilityState[column.field] !== false;
        });
        setDraftColumnVisibilityModel(visibilityModel);
        setAppliedHiddenColumnCount(
            Object.values(visibilityModel).filter((visible) => visible === false).length,
        );

        const existingItems = (filterModel?.items ?? []) as GridFilterItem[];
        if (existingItems.length > 0) {
            const mapped = existingItems.map((item) => ({
                id: String(item.id ?? `filter-${Math.random().toString(16).slice(2)}`),
                field: String(item.field ?? ''),
                operator: String(item.operator ?? ''),
                value: Array.isArray(item.value) ? item.value.map(String).join(', ') : String(item.value ?? ''),
            }));
            setDraftRows([...mapped, makeEmptyFilterRow()]);
        } else {
            setDraftRows([makeEmptyFilterRow()]);
        }

        setDraftLogicOperator((filterModel?.logicOperator as ToolbarLogicOperator | undefined) ?? GridLogicOperator.And);
        setAnchorEl(event.currentTarget);
    };

    const closeEditor = () => setAnchorEl(null);

    const updateRow = (idx: number, patch: Partial<ToolbarFilterRow>) => {
        setDraftRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    };

    const addRow = () => {
        const last = draftRows[draftRows.length - 1];
        if (!last || !isFilled(last)) return;
        setDraftRows((prev) => [...prev, makeEmptyFilterRow()]);
    };

    const removeRow = (idx: number) => {
        if (draftRows.length === 1) {
            setDraftRows([makeEmptyFilterRow()]);
            return;
        }
        const remaining = draftRows.filter((_, i) => i !== idx);
        setDraftRows(remaining.length > 0 ? remaining : [makeEmptyFilterRow()]);
    };

    const clearFiltersDraft = () => {
        setDraftRows([makeEmptyFilterRow()]);
        setDraftLogicOperator(GridLogicOperator.And);
    };

    const setAllColumnsVisibleDraft = (visible: boolean) => {
        setDraftColumnVisibilityModel((prev) => {
            const next = { ...prev };
            allColumns.forEach((column) => {
                next[column.field] = column.hideable === false ? true : visible;
            });
            return next;
        });
    };

    const resetAllDraft = () => {
        const visible: Record<string, boolean> = {};
        allColumns.forEach((column) => {
            visible[column.field] = true;
        });
        setDraftColumnVisibilityModel(visible);
        setDraftRows([makeEmptyFilterRow()]);
        setDraftLogicOperator(GridLogicOperator.And);
    };

    const saveChanges = () => {
        const items: GridFilterItem[] = draftRows
            .filter(isFilled)
            .map((row) => ({
                id: row.id,
                field: row.field,
                operator: row.operator,
                value: toFilterValue(row),
            }));

        apiRef.current.setFilterModel({
            items,
            logicOperator: draftLogicOperator,
            quickFilterValues: filterModel?.quickFilterValues ?? [],
            quickFilterLogicOperator: filterModel?.quickFilterLogicOperator ?? GridLogicOperator.And,
        });

        allColumns.forEach((column) => {
            const visible = draftColumnVisibilityModel[column.field] !== false;
            apiRef.current.setColumnVisibility(column.field, visible);
        });
        setAppliedHiddenColumnCount(
            Object.values(draftColumnVisibilityModel).filter((visible) => visible === false).length,
        );

        closeEditor();
    };

    return (
        <>
            <Button variant="text" size="small" onClick={openEditor}>
                {filterButtonLabel}
            </Button>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={closeEditor}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <Box sx={{ p: 2, width: 920, maxWidth: '96vw' }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '1.35fr 1fr' },
                            gap: 2,
                            alignItems: 'start',
                        }}
                    >
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Column Filters
                                </Typography>
                                <Button variant="text" size="small" onClick={clearFiltersDraft}>
                                    Clear filters
                                </Button>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Match rows:
                                </Typography>
                                <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    value={draftLogicOperator}
                                    onChange={(_event, value: ToolbarLogicOperator | null) => {
                                        if (value) setDraftLogicOperator(value);
                                    }}
                                >
                                    <ToggleButton value={GridLogicOperator.And}>All filters (AND)</ToggleButton>
                                    <ToggleButton value={GridLogicOperator.Or}>Any filter (OR)</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                            <Stack spacing={1.5}>
                                {draftRows.map((row, idx) => {
                                    const operators = operatorOptionsForField(row.field);
                                    const type = getColumnType(row.field);
                                    const noValueOperator = isNoValueOperator(row.operator);
                                    const isBoolean = type === 'boolean';
                                    const inputType =
                                        type === 'number'
                                            ? 'number'
                                            : type === 'dateTime'
                                                ? 'datetime-local'
                                                : type === 'date'
                                                    ? 'date'
                                                    : 'text';
                                    const isDateInput = inputType === 'date' || inputType === 'datetime-local';

                                    return (
                                        <Box
                                            key={row.id}
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '2fr 1.55fr 2fr auto auto',
                                                gap: 1,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <TextField
                                                select
                                                size="small"
                                                label="Column"
                                                value={row.field}
                                                onChange={(e) =>
                                                    updateRow(idx, {
                                                        field: e.target.value,
                                                        operator: '',
                                                        value: '',
                                                    })
                                                }
                                            >
                                                <MenuItem value="">Select column</MenuItem>
                                                {filterableColumns.map((column) => (
                                                    <MenuItem key={column.field} value={column.field}>
                                                        {column.headerName ?? column.field}
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            <TextField
                                                select
                                                size="small"
                                                label="Operator"
                                                value={row.operator}
                                                onChange={(e) => {
                                                    const nextOperator = e.target.value;
                                                    updateRow(idx, {
                                                        operator: nextOperator,
                                                        value: isNoValueOperator(nextOperator) ? '' : row.value,
                                                    });
                                                }}
                                                disabled={!row.field}
                                            >
                                                <MenuItem value="">Select</MenuItem>
                                                {operators.map((operator) => (
                                                    <MenuItem key={operator.value} value={operator.value}>
                                                        {operator.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            {isBoolean ? (
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Value"
                                                    value={row.value}
                                                    onChange={(e) => updateRow(idx, { value: e.target.value })}
                                                    disabled={!row.field || !row.operator || noValueOperator}
                                                >
                                                    <MenuItem value="">Select</MenuItem>
                                                    <MenuItem value="true">true</MenuItem>
                                                    <MenuItem value="false">false</MenuItem>
                                                </TextField>
                                            ) : (
                                                <TextField
                                                    size="small"
                                                    label="Value"
                                                    value={row.value}
                                                    onChange={(e) => updateRow(idx, { value: e.target.value })}
                                                    disabled={!row.field || !row.operator || noValueOperator}
                                                    type={inputType}
                                                    InputLabelProps={isDateInput ? { shrink: true } : undefined}
                                                />
                                            )}

                                            <IconButton
                                                size="small"
                                                aria-label="Add filter row"
                                                onClick={addRow}
                                                disabled={idx !== draftRows.length - 1}
                                            >
                                                <AddIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                aria-label="Remove filter row"
                                                onClick={() => removeRow(idx)}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Visible Columns
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="text" size="small" onClick={() => setAllColumnsVisibleDraft(true)}>
                                        Show all
                                    </Button>
                                    <Button variant="text" size="small" onClick={() => setAllColumnsVisibleDraft(false)}>
                                        Hide all
                                    </Button>
                                </Box>
                            </Box>
                            <Box
                                sx={{
                                    maxHeight: 320,
                                    overflowY: 'auto',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    px: 1,
                                }}
                            >
                                {allColumns.map((column) => (
                                    <FormControlLabel
                                        key={column.field}
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={draftColumnVisibilityModel[column.field] !== false}
                                                onChange={(e) =>
                                                    setDraftColumnVisibilityModel((prev) => ({
                                                        ...prev,
                                                        [column.field]: column.hideable === false ? true : e.target.checked,
                                                    }))
                                                }
                                                disabled={column.hideable === false}
                                            />
                                        }
                                        label={column.headerName ?? column.field}
                                        sx={{ width: '100%', mr: 0 }}
                                    />
                                ))}
                            </Box>
                            <Divider sx={{ my: 1.5 }} />
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button variant="outlined" size="small" onClick={resetAllDraft}>
                                    Reset all
                                </Button>
                                <Button variant="outlined" size="small" onClick={closeEditor}>
                                    Cancel
                                </Button>
                                <Button variant="contained" size="small" onClick={saveChanges}>
                                    Save
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Popover>
        </>
    );
}

/**
 * Single data control bar for tables: white search box (with icon),
 * merged Filters + Columns panel, and pagination.
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
                    flexWrap: 'wrap',
                }}
            >
                <Box
                    sx={{
                        backgroundColor: '#fff',
                        p: 0.5,
                        px: 1,
                        borderRadius: 1,
                        border: '1px solid #ccc',
                        width: { xs: '100%', sm: 320 },
                        '& .MuiFormControl-root': { width: '100%' },
                        '& .MuiInputBase-root': { width: '100%' },
                        '& .MuiInputBase-input': { width: '100%', minWidth: 0 },
                    }}
                >
                    <ToolbarSearchField />
                </Box>
                <ToolbarFilterEditor />
            </Box>
            <CustomPagination />
        </GridToolbarContainer>
    );
}
