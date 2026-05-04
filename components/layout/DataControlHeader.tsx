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

import SearchIcon from '@mui/icons-material/Search';

import CloseIcon from '@mui/icons-material/Close';
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
    { value: 'isAnyOf', label: 'is any of' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' },
];

/** Operators whose value field should be treated as a comma-separated list. */
const ARRAY_VALUE_OPERATORS = new Set(['isAnyOf']);

/** Hint shown below the value input when an array operator is selected. */
const ARRAY_OPERATOR_HINT: Record<string, string> = {
    isAnyOf: 'Comma-separated values, e.g. cpd00001, cpd00002',
};

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
    const gridFilterModel = useGridSelector(apiRef, gridFilterModelSelector);
    const committedQuick = (gridFilterModel?.quickFilterValues ?? []).join(' ').trim();
    /** When non-null, the user is editing; otherwise show the grid's committed quick filter. */
    const [draftQuick, setDraftQuick] = useState<string | null>(null);
    const displayValue = draftQuick ?? committedQuick;
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const placeholder = useMemo(() => {
        if (!pathname) return 'Find in page...';
        if (pathname.includes('/biochem/reactions')) return 'Find in reactions...';
        if (pathname.includes('/biochem/compounds')) return 'Find in compounds...';
        if (pathname.includes('/genomes/Annotations')) return 'Find in subsystems...';
        if (pathname === '/genomes') return 'Find in plant models...';
        if (pathname === '/list-media') return 'Find in media...';
        if (pathname.includes('/my-models')) return 'Find in my models...';
        if (pathname.includes('/my-jobs')) return 'Find in my jobs...';
        if (pathname.includes('/myMedia')) return 'Find in my media...';
        if (pathname.includes('/my-media')) return 'Find in my media...';
        if (pathname.startsWith('/genome/')) return 'Find in genome...';
        if (pathname.includes('/gapfill/')) return 'Find in gapfill reactions...';
        if (pathname.includes('/fba/')) return 'Find in FBA results...';
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

    /** Push search term into the DataGrid filter model as a quickFilter.
     *  This triggers onFilterModelChange on the page → server re-fetch → only
     *  matching rows are returned.  GridHighlightText reads quickFilterValues
     *  and highlights the matched text in each cell automatically. */
    const applySearch = useCallback(
        (term: string) => {
            const current = apiRef.current.state.filter?.filterModel ?? { items: [] };
            apiRef.current.setFilterModel({
                items: (current.items ?? []) as import('@mui/x-data-grid').GridFilterItem[],
                logicOperator:
                    (current.logicOperator as GridLogicOperator | undefined) ??
                    GridLogicOperator.And,
                quickFilterValues: term.trim() ? [term.trim()] : [],
                quickFilterLogicOperator:
                    (current.quickFilterLogicOperator as GridLogicOperator | undefined) ??
                    GridLogicOperator.And,
            });
        },
        [apiRef],
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const term = e.target.value;
            setDraftQuick(term);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                applySearch(term);
                debounceRef.current = null;
                setDraftQuick(null);
            }, 300);
        },
        [applySearch],
    );

    const handleClear = useCallback(() => {
        setDraftQuick(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = null;
        applySearch('');
    }, [applySearch]);

    // Clear quickFilter on unmount so navigating away doesn't leave a stale filter
    useEffect(() => {
        const api = apiRef.current;
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = null;
            try {
                const current = api.state.filter?.filterModel ?? { items: [] };
                api.setFilterModel({
                    items: (current.items ?? []) as import('@mui/x-data-grid').GridFilterItem[],
                    logicOperator:
                        (current.logicOperator as GridLogicOperator | undefined) ??
                        GridLogicOperator.And,
                    quickFilterValues: [],
                    quickFilterLogicOperator:
                        (current.quickFilterLogicOperator as GridLogicOperator | undefined) ??
                        GridLogicOperator.And,
                });
            } catch {
                // api may be stale on unmount — safe to ignore
            }
        };
    }, [apiRef]);

    // Apply CSS Custom Highlight API to highlight matches in the grid
    useEffect(() => {
        const term = displayValue.trim();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!term || typeof CSS === 'undefined' || !('highlights' in (CSS as any))) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof CSS !== 'undefined' && 'highlights' in (CSS as any)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((CSS as any).highlights as any).delete('search-results');
            }
            return;
        }

        const root = apiRef.current.rootElementRef?.current;
        if (!root) return;

        const updateHighlights = () => {
            if (!('Highlight' in window)) return;
            const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            const ranges: Range[] = [];
            const lowerTerm = term.toLowerCase();

            let node = treeWalker.nextNode();
            while (node) {
                const text = node.textContent?.toLowerCase() || '';
                let startIndex = 0;
                let index;
                while ((index = text.indexOf(lowerTerm, startIndex)) !== -1) {
                    const range = new Range();
                    range.setStart(node, index);
                    range.setEnd(node, index + lowerTerm.length);
                    ranges.push(range);
                    startIndex = index + lowerTerm.length;
                }
                node = treeWalker.nextNode();
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const HighlightClass = (window as any).Highlight;
            const highlight = new HighlightClass(...ranges);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((CSS as any).highlights as any).set('search-results', highlight);
        };

        // Delay slightly to allow DataGrid to render the new filtered rows
        const timeout = setTimeout(() => {
            updateHighlights();
        }, 100);

        const observer = new MutationObserver(() => {
            updateHighlights();
        });

        observer.observe(root, { childList: true, subtree: true, characterData: true });

        return () => {
            clearTimeout(timeout);
            observer.disconnect();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof CSS !== 'undefined' && 'highlights' in (CSS as any)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((CSS as any).highlights as any).delete('search-results');
            }
        };
    }, [displayValue, apiRef]);

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                ::highlight(search-results) {
                    background-color: #fff3cd;
                    color: #856404;
                }
            `}} />
            <TextField
                value={displayValue}
                onChange={handleChange}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') handleClear();
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
                    endAdornment: displayValue ? (
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
        </>
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
    const filterModel = useGridSelector(apiRef, gridFilterModelSelector);

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [allColumns, setAllColumns] = useState<GridColDef[]>([]);
    // Community DataGrid supports only 1 filter item; we store exactly one draft row.
    const [draftRow, setDraftRow] = useState<ToolbarFilterRow>(makeEmptyFilterRow());
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
            (
                isNoValueOperator(row.operator) ||
                (ARRAY_VALUE_OPERATORS.has(row.operator)
                    ? row.value.trim().split(',').some((v) => v.trim().length > 0)
                    : row.value.trim().length > 0)
            ),
        );

    const toFilterValue = (row: ToolbarFilterRow): GridFilterItem['value'] => {
        if (isNoValueOperator(row.operator)) return undefined;

        const raw = row.value.trim();
        const type = getColumnType(row.field);

        // isAnyOf needs an array
        if (ARRAY_VALUE_OPERATORS.has(row.operator)) {
            return raw
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
        }

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

        // Load existing filter item (first only — Community DataGrid allows 1)
        const existingItem = ((filterModel?.items ?? []) as GridFilterItem[])[0];
        if (existingItem?.field) {
            setDraftRow({
                id: String(existingItem.id ?? `filter-${Math.random().toString(16).slice(2)}`),
                field: String(existingItem.field ?? ''),
                operator: String(existingItem.operator ?? ''),
                value: Array.isArray(existingItem.value)
                    ? existingItem.value.map(String).join(', ')
                    : String(existingItem.value ?? ''),
            });
        } else {
            setDraftRow(makeEmptyFilterRow());
        }

        setAnchorEl(event.currentTarget);
    };

    const closeEditor = () => setAnchorEl(null);

    const clearFiltersDraft = () => setDraftRow(makeEmptyFilterRow());

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
        setDraftRow(makeEmptyFilterRow());
    };

    const saveChanges = () => {
        const items: GridFilterItem[] = isFilled(draftRow)
            ? [{ id: draftRow.id, field: draftRow.field, operator: draftRow.operator, value: toFilterValue(draftRow) }]
            : [];

        apiRef.current.setFilterModel({
            items,
            logicOperator: GridLogicOperator.And,
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
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Column Filter
                                </Typography>
                                <Button variant="text" size="small" onClick={clearFiltersDraft}>
                                    Clear
                                </Button>
                            </Box>
                            {(() => {
                                const row = draftRow;
                                const operators = operatorOptionsForField(row.field);
                                const type = getColumnType(row.field);
                                const noValueOp = isNoValueOperator(row.operator);
                                const isArrayOp = ARRAY_VALUE_OPERATORS.has(row.operator);
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
                                const hint = isArrayOp ? ARRAY_OPERATOR_HINT[row.operator] : undefined;

                                return (
                                    <Stack spacing={1.5}>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 1,
                                            }}
                                        >
                                            <TextField
                                                select
                                                size="small"
                                                label="Column"
                                                value={row.field}
                                                onChange={(e) =>
                                                    setDraftRow((prev) => ({
                                                        ...prev,
                                                        field: e.target.value,
                                                        operator: '',
                                                        value: '',
                                                    }))
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
                                                    const next = e.target.value;
                                                    setDraftRow((prev) => ({
                                                        ...prev,
                                                        operator: next,
                                                        value: isNoValueOperator(next) ? '' : prev.value,
                                                    }));
                                                }}
                                                disabled={!row.field}
                                            >
                                                <MenuItem value="">Select</MenuItem>
                                                {operators.map((op) => (
                                                    <MenuItem key={op.value} value={op.value}>
                                                        {op.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Box>

                                        {isBoolean ? (
                                            <TextField
                                                select
                                                size="small"
                                                label="Value"
                                                value={row.value}
                                                onChange={(e) => setDraftRow((prev) => ({ ...prev, value: e.target.value }))}
                                                disabled={!row.field || !row.operator || noValueOp}
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
                                                onChange={(e) => setDraftRow((prev) => ({ ...prev, value: e.target.value }))}
                                                disabled={!row.field || !row.operator || noValueOp}
                                                type={inputType}
                                                InputLabelProps={isDateInput ? { shrink: true } : undefined}
                                                helperText={hint}
                                                placeholder={isArrayOp ? 'value1, value2, ...' : undefined}
                                            />
                                        )}
                                    </Stack>
                                );
                            })()}
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
