'use client';

import {
    GridToolbarContainer,
    useGridApiContext,
    useGridSelector,
    gridPageSelector,
    gridPageSizeSelector,
    gridRowCountSelector,
    gridFilterModelSelector,
    gridRowsLoadingSelector,
    type GridColDef,
    type GridFilterItem,
    type GridFilterModel,
    type GridValidRowModel,
    GridLogicOperator,
} from '@mui/x-data-grid';

// Extend MUI's toolbar props so our custom callback is recognized by TypeScript
// when passed via slotProps.toolbar.
declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        onApplyFilterModel?: (model: GridFilterModel, details: { source?: 'toolbar' }) => void;
    }
}
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
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';

import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

import CloseIcon from '@mui/icons-material/Close';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, type MouseEvent } from 'react';

/**
 * Module-level registry that maps DataGrid apiRef instances to the toolbar's
 * committed filter items + logic operator.  This lets sibling components with
 * no shared prop tree (ToolbarSearchField, ToolbarFilterEditor, and the per-
 * column QuickSearchHeader rendered inside renderHeader) read/update the same
 * committed multi-filter state, so a search/quick-column filter never
 * accidentally wipes other committed column filters.
 *
 * The registry has a tiny pub/sub so QuickSearchHeader can notify the toolbar
 * editor when an external write happens (badge count + reopen state stay in sync).
 */
const committedFilterRegistry = new WeakMap<
    object,
    { items: GridFilterItem[]; logicOperator: GridLogicOperator }
>();
const committedFilterListeners = new WeakMap<object, Set<() => void>>();

function setCommittedFilter(
    apiRef: object,
    state: { items: GridFilterItem[]; logicOperator: GridLogicOperator },
) {
    committedFilterRegistry.set(apiRef, state);
    const subs = committedFilterListeners.get(apiRef);
    if (subs) subs.forEach((fn) => fn());
}

function subscribeCommittedFilter(apiRef: object, fn: () => void): () => void {
    let subs = committedFilterListeners.get(apiRef);
    if (!subs) {
        subs = new Set();
        committedFilterListeners.set(apiRef, subs);
    }
    subs.add(fn);
    return () => {
        subs?.delete(fn);
    };
}

/**
 * Maps DataGrid apiRef → the page's onApplyFilterModel callback.  Lets the
 * per-column QuickSearchHeader push filter updates through the same path as
 * the toolbar (so server-side pages re-fetch correctly) without prop-drilling
 * the callback through every column's renderHeader.
 */
const onApplyFilterModelRegistry = new WeakMap<
    object,
    (model: GridFilterModel, details: { source?: 'toolbar' }) => void
>();

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

/** Operator list for a given column type. Shared by the toolbar editor and the per-column popover. */
function operatorOptionsForType(type?: string): { value: string; label: string }[] {
    if (type === 'number') return NUMBER_OPERATORS;
    if (type === 'boolean') return BOOLEAN_OPERATORS;
    if (type === 'date' || type === 'dateTime') return DATE_OPERATORS;
    return STRING_OPERATORS;
}

/** Coerce a raw text input to the GridFilterItem.value shape expected for this operator + column type. */
function coerceFilterValue(
    operator: string,
    type: string | undefined,
    raw: string,
): GridFilterItem['value'] {
    if (NO_VALUE_OPERATORS.has(operator)) return undefined;
    if (ARRAY_VALUE_OPERATORS.has(operator)) {
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
}

function CustomPagination() {
    const apiRef = useGridApiContext();
    const page = useGridSelector(apiRef, gridPageSelector);
    const pageSize = useGridSelector(apiRef, gridPageSizeSelector);
    // In server-mode rowCount = the value from the rowCount prop (e.g. numFound from Solr).
    // gridFilteredRowCountSelector only counts rows in the current page — wrong for server-mode.
    const rowCount = useGridSelector(apiRef, gridRowCountSelector);
    // Hide pagination while data is loading to prevent "0-0 of 0" flash
    const isLoading = useGridSelector(apiRef, gridRowsLoadingSelector);
    const rowCountValue = rowCount ?? 0;
    const ready = page !== undefined && pageSize !== undefined && rowCount !== undefined;
    const pageValue = page ?? 0;
    const pageSizeValue = pageSize ?? 25;
    const lastPage = Math.max(0, Math.ceil(rowCountValue / pageSizeValue) - 1);
    const safePage = Math.min(pageValue, lastPage);

    useEffect(() => {
        if (!ready) return;
        if (pageValue > lastPage) {
            apiRef.current.setPaginationModel({ page: lastPage, pageSize: pageSizeValue });
        }
    }, [apiRef, ready, pageValue, pageSizeValue, lastPage]);

    if (!ready || isLoading) {
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

function ToolbarSearchField({ onApplyFilterModel }: { onApplyFilterModel?: (model: GridFilterModel, details: object) => void }) {
    const apiRef = useGridApiContext();
    const pathname = usePathname();
    const gridFilterModel = useGridSelector(apiRef, gridFilterModelSelector);
    const committedQuick = (gridFilterModel?.quickFilterValues ?? []).join(' ').trim();
    /**
     * Draft text the user has typed but NOT yet committed.  We deliberately do
     * NOT auto-apply on every keystroke — debounced auto-apply races with the
     * multi-column-filter state machine on pages that re-render frequently
     * (e.g. my-models polls tracked-job status every 15s), and the resulting
     * chain of state updates can drop subsequent keystrokes when multiple
     * per-column quick filters are already committed.  Mirror the per-column
     * QuickSearchHeader contract: type freely in local state, Enter commits.
     */
    const [draft, setDraft] = useState<string>(committedQuick);
    /**
     * Tracks the last committed value we observed so we can detect EXTERNAL
     * changes (e.g. Reset All in the Filter & Columns popover) and re-sync
     * the draft without clobbering an in-flight edit.  Stored as state (not
     * a ref) so the sync below can run during render — the React-recommended
     * pattern for "adjust state when a prop changes" that avoids the lint
     * rule against setState-in-effect.
     * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
     */
    const [prevCommitted, setPrevCommitted] = useState<string>(committedQuick);
    if (committedQuick !== prevCommitted) {
        // Only overwrite the draft when the user hasn't diverged from the
        // previously committed value, otherwise we'd silently discard their
        // in-progress typing.
        if (draft === prevCommitted) {
            setDraft(committedQuick);
        }
        setPrevCommitted(committedQuick);
    }

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
     *  Reads committed column filters from the registry (set by ToolbarFilterEditor.saveChanges)
     *  so a search never accidentally wipes multi-column filters.  Calls the page's
     *  onFilterModelChange directly (via the same rootProps path used by saveChanges) when
     *  available, so server-side pages re-fetch with both the column filters AND the new search. */
    const applySearch = useCallback(
        (term: string) => {
            // Prefer registry items (the toolbar's committed multi-filter) over the grid's
            // internal state which is truncated to 1 item in community edition.
            const registry = committedFilterRegistry.get(apiRef.current);
            const items: GridFilterItem[] = registry?.items ?? [];
            const logicOperator = registry?.logicOperator ?? GridLogicOperator.And;

            const newModel: GridFilterModel = {
                items,
                logicOperator,
                quickFilterValues: term.trim() ? [term.trim()] : [],
                quickFilterLogicOperator: GridLogicOperator.And,
            };

            // For server-side pages: call the page's handler directly so the server
            // re-fetches with both column filters and the new quick search.
            if (typeof onApplyFilterModel === 'function') {
                onApplyFilterModel(newModel, { source: 'toolbar' });
                // Update the grid's internal model so the input retains the committed value.
                apiRef.current.setFilterModel({
                    items: items.slice(0, 1),
                    logicOperator,
                    quickFilterValues: newModel.quickFilterValues,
                    quickFilterLogicOperator: newModel.quickFilterLogicOperator,
                });
            } else {
                // Client-side: use setFilterModel normally, but truncate to 1 item to avoid CE limits.
                apiRef.current.setFilterModel({
                    items: items.slice(0, 1),
                    logicOperator,
                    quickFilterValues: newModel.quickFilterValues,
                    quickFilterLogicOperator: newModel.quickFilterLogicOperator,
                });
            }
        },
        [apiRef, onApplyFilterModel],
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setDraft(e.target.value);
        },
        [],
    );

    const handleCommit = useCallback(() => {
        applySearch(draft);
    }, [applySearch, draft]);

    const handleClear = useCallback(() => {
        setDraft('');
        applySearch('');
    }, [applySearch]);

    // Apply CSS Custom Highlight API to highlight matches in the grid.  Driven
    // by the COMMITTED term (not the draft) so highlights appear only after the
    // user presses Enter — matching the "apply on Enter" contract.
    useEffect(() => {
        const term = committedQuick.trim();
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
    }, [committedQuick, apiRef]);

    const hasUncommittedChange = draft.trim() !== committedQuick;

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
                value={draft}
                onChange={handleChange}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommit();
                    } else if (e.key === 'Escape') {
                        // Escape: if there's an uncommitted edit, revert to
                        // the committed value; if the input already matches
                        // the committed value, clear the search entirely.
                        if (hasUncommittedChange) {
                            setDraft(committedQuick);
                        } else {
                            handleClear();
                        }
                    }
                }}
                size="small"
                fullWidth
                placeholder={placeholder}
                inputProps={{
                    title: hasUncommittedChange ? 'Press Enter to apply' : undefined,
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                    ),
                    endAdornment: draft || committedQuick ? (
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

function ToolbarFilterEditor({ onApplyFilterModel }: { onApplyFilterModel?: (model: GridFilterModel, details: object) => void }) {
    const apiRef = useGridApiContext();
    const filterModel = useGridSelector(apiRef, gridFilterModelSelector);

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [allColumns, setAllColumns] = useState<GridColDef[]>([]);
    const [draftRows, setDraftRows] = useState<ToolbarFilterRow[]>([]);
    const [draftLogicOperator, setDraftLogicOperator] = useState<GridLogicOperator>(GridLogicOperator.And);
    const [draftColumnVisibilityModel, setDraftColumnVisibilityModel] = useState<Record<string, boolean>>({});
    const [appliedHiddenColumnCount, setAppliedHiddenColumnCount] = useState(0);

    /**
     * The committed multi-filter state is held in React state (not a ref) so
     * any registry change — whether from the toolbar editor itself, a per-
     * column QuickSearchHeader, or the grid's column-menu Filter option —
     * automatically re-renders the badge label and is visible to openEditor
     * when the user opens the Filter & Columns popover.
     *
     * The committed state lives in committedFilterRegistry (a WeakMap keyed
     * by apiRef.current) as the single shared source of truth.  Our local
     * state is just a mirror that triggers re-renders.
     */
    const [committedState, setCommittedState] = useState<{
        items: GridFilterItem[];
        logicOperator: GridLogicOperator;
    }>(() => committedFilterRegistry.get(apiRef.current) ?? { items: [], logicOperator: GridLogicOperator.And });

    // Bootstrap the registry from a controlled filterModel on the first
    // render (e.g. URL params or page state seeded into the grid before any
    // toolbar interaction).  Only seed when the registry is still empty so
    // we don't clobber per-column work already in flight.
    useEffect(() => {
        const existing = committedFilterRegistry.get(apiRef.current);
        if ((existing?.items.length ?? 0) > 0) return;
        const seed = ((filterModel?.items ?? []) as GridFilterItem[]).filter(
            (item) => item.field && item.operator,
        );
        if (seed.length === 0) return;
        setCommittedFilter(apiRef.current, {
            items: seed,
            logicOperator: filterModel?.logicOperator ?? GridLogicOperator.And,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally runs once on mount only

    /**
     * Sync grid-filter-model changes that originate OUTSIDE the toolbar
     * editor (e.g. user clicked the column header kebab menu's "Filter").
     * The grid only ever reports up to one item (Community Edition), so we
     * skip the sync when our registry has more items than the grid claims —
     * that's the CE truncation firing right after a multi-save.
     */
    useEffect(() => {
        const incoming = ((filterModel?.items ?? []) as GridFilterItem[]).filter(
            (item) => item.field && item.operator,
        );
        const existing = committedFilterRegistry.get(apiRef.current);
        const committed = existing?.items ?? [];
        if (incoming.length < committed.length && committed.length > 1) return;
        const incomingLogic = filterModel?.logicOperator ?? GridLogicOperator.And;
        const same =
            incoming.length === committed.length &&
            incoming.every((it, i) =>
                it.field === committed[i].field &&
                it.operator === committed[i].operator &&
                JSON.stringify(it.value ?? null) === JSON.stringify(committed[i].value ?? null),
            ) &&
            incomingLogic === (existing?.logicOperator ?? GridLogicOperator.And);
        if (same) return;
        setCommittedFilter(apiRef.current, { items: incoming, logicOperator: incomingLogic });
    }, [filterModel, apiRef]);

    /**
     * Subscribe to committed-filter changes from any source (the per-column
     * QuickSearchHeader, the editor itself, the grid-menu sync above, etc.).
     * Each change drives a setState, which re-renders the badge label and
     * makes openEditor see the latest snapshot.
     */
    useEffect(() => {
        // Pick up whatever the registry had at mount, since the snapshot we
        // computed via useState's initializer was taken before subscribe.
        const initial = committedFilterRegistry.get(apiRef.current);
        if (initial) setCommittedState(initial);
        return subscribeCommittedFilter(apiRef.current, () => {
            const state = committedFilterRegistry.get(apiRef.current);
            if (state) setCommittedState(state);
        });
    }, [apiRef]);

    // Local aliases — these always reflect the latest committed registry
    // (state-backed, so re-renders automatically when the registry changes).
    const committedItems = committedState.items;
    const committedLogicOperator = committedState.logicOperator;

    const open = Boolean(anchorEl);
    const filterableColumns = allColumns.filter((column) => column.filterable !== false);

    // Count from our state mirror of the registry (not gridFilterModelSelector
    // which only ever has ≤1 item).  State updates whenever any component
    // calls setCommittedFilter — including the per-column QuickSearchHeader —
    // so the badge label is always in sync.
    const activeAppliedFilterCount = committedItems.filter((item) => {
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

    const addFilterRow = () => {
        setDraftRows((prev) => [...prev, makeEmptyFilterRow()]);
    };


    /**
     * X button handler for a filter row.
     * Always only mutates draft state — effects are applied when Save is clicked.
     * - Multiple rows: removes the row from the draft.
     * - Last row: resets that row's values to empty (UI always keeps ≥1 row),
     *   so the user sees a blank row and Save will apply zero active filters.
     */
    const removeOrClearFilterRow = (id: string) => {
        setDraftRows((prev) => {
            if (prev.length <= 1) {
                // Keep one empty row so the UI never collapses entirely.
                return [makeEmptyFilterRow()];
            }
            return prev.filter((row) => row.id !== id);
        });
    };

    const updateFilterRow = (id: string, updates: Partial<ToolbarFilterRow>) => {
        setDraftRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, ...updates } : row)),
        );
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

        // Read the latest committed state directly from the registry — this
        // is the single source of truth and is updated synchronously by both
        // the editor (saveChanges) and per-column QuickSearchHeader (Enter
        // commits).  Falling back to the state mirror handles the brief case
        // where the registry was just cleared.
        const registryState = committedFilterRegistry.get(apiRef.current);
        const committed = registryState?.items ?? committedItems;
        const committedLogic = registryState?.logicOperator ?? committedLogicOperator;
        if (committed.length > 0 && committed[0]?.field) {
            setDraftRows(
                committed.map((item) => ({
                    id: String(item.id ?? `filter-${Math.random().toString(16).slice(2)}`),
                    field: String(item.field ?? ''),
                    operator: String(item.operator ?? ''),
                    value: Array.isArray(item.value)
                        ? item.value.map(String).join(', ')
                        : String(item.value ?? ''),
                })),
            );
        } else {
            setDraftRows([makeEmptyFilterRow()]);
        }
        setDraftLogicOperator(committedLogic);

        setAnchorEl(event.currentTarget);
    };

    const closeEditor = () => setAnchorEl(null);

    const clearFiltersDraft = () => setDraftRows([makeEmptyFilterRow()]);

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
        // Clear the committed state so searches don't carry stale filters
        // after a Reset All.  setCommittedFilter pub/sub notifies the badge
        // (state mirror auto-updates) and every QuickSearchHeader icon.
        setCommittedFilter(apiRef.current, { items: [], logicOperator: GridLogicOperator.And });
        // Notify the page of the cleared state.
        const quickFilterValues = filterModel?.quickFilterValues ?? [];
        if (typeof onApplyFilterModel === 'function') {
            onApplyFilterModel({ items: [], logicOperator: GridLogicOperator.And, quickFilterValues }, { source: 'toolbar' });
        } else {
            apiRef.current.setFilterModel({ items: [], logicOperator: GridLogicOperator.And, quickFilterValues });
        }
        allColumns.forEach((column) => {
            apiRef.current.setColumnVisibility(column.field, true);
        });
        setAppliedHiddenColumnCount(0);
        closeEditor();
    };

    const saveChanges = () => {
        const filledItems: GridFilterItem[] = draftRows
            .filter(isFilled)
            .map((row) => ({
                id: row.id,
                field: row.field,
                operator: row.operator,
                value: toFilterValue(row),
            }));

        // Persist all filled items in the shared registry.  setCommittedFilter
        // notifies every subscriber (the state mirror here, every per-column
        // QuickSearchHeader's `committed` state) so badges and icon highlights
        // update automatically.
        setCommittedFilter(apiRef.current, { items: filledItems, logicOperator: draftLogicOperator });

        // Preserve the current quick-filter search term from the grid's internal model.
        const quickFilterValues = filterModel?.quickFilterValues ?? [];
        const quickFilterLogicOperator = filterModel?.quickFilterLogicOperator ?? GridLogicOperator.And;

        // Build the full model we want the application to see (all items + logic + quick search).
        const fullModel: GridFilterModel = {
            items: filledItems,
            logicOperator: draftLogicOperator,
            quickFilterValues,
            quickFilterLogicOperator,
        };

        // For server-side pages: call the page's handler directly with all items so the
        // server query receives the complete multi-filter.  The grid's setFilterModel
        // silently truncates to 1 item (Community Edition), so we bypass it entirely.
        if (typeof onApplyFilterModel === 'function') {
            // Pass source:'toolbar' so handlers know this is an explicit user action,
            // not a Community Edition truncation event from the grid itself.
            onApplyFilterModel(fullModel, { source: 'toolbar' });

            // Also update the grid's internal model so features like GridHighlightText
            // and the filter button badge reflect the current search state.
            // We pass a truncated model to avoid Community Edition limits.
            apiRef.current.setFilterModel({
                items: filledItems.slice(0, 1),
                logicOperator: draftLogicOperator,
                quickFilterValues,
                quickFilterLogicOperator,
            });
        } else {
            // Client-side page: let the grid apply item[0] for native row filtering.
            // Rows 2+ won't be applied by the grid, but they live in the registry.
            const gridModel: GridFilterModel = {
                items: filledItems.slice(0, 1),
                logicOperator: draftLogicOperator,
                quickFilterValues,
                quickFilterLogicOperator,
            };
            apiRef.current.setFilterModel(gridModel);
        }

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
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <TextField
                                        select
                                        size="small"
                                        label="Logic"
                                        value={draftLogicOperator}
                                        onChange={(e) =>
                                            setDraftLogicOperator(e.target.value as GridLogicOperator)
                                        }
                                        sx={{ minWidth: 110 }}
                                        SelectProps={{ MenuProps: { disablePortal: true } }}
                                    >
                                        <MenuItem value={GridLogicOperator.And}>AND</MenuItem>
                                        <MenuItem value={GridLogicOperator.Or}>OR</MenuItem>
                                    </TextField>
                                    <Button variant="text" size="small" onClick={clearFiltersDraft}>
                                        Clear All
                                    </Button>
                                </Box>
                            </Box>
                            <Stack spacing={1.5}>
                                {draftRows.map((row) => {
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
                                        <Box
                                            key={row.id}
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr 1fr auto',
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
                                                    updateFilterRow(row.id, {
                                                        field: e.target.value,
                                                        operator: '',
                                                        value: '',
                                                    })
                                                }
                                                SelectProps={{ MenuProps: { disablePortal: true } }}
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
                                                    updateFilterRow(row.id, {
                                                        operator: next,
                                                        value: isNoValueOperator(next) ? '' : row.value,
                                                    });
                                                }}
                                                disabled={!row.field}
                                                SelectProps={{ MenuProps: { disablePortal: true } }}
                                            >
                                                <MenuItem value="">Select</MenuItem>
                                                {operators.map((op) => (
                                                    <MenuItem key={op.value} value={op.value}>
                                                        {op.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            {isBoolean ? (
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Value"
                                                    value={row.value}
                                                    onChange={(e) => updateFilterRow(row.id, { value: e.target.value })}
                                                    disabled={!row.field || !row.operator || noValueOp}
                                                    SelectProps={{ MenuProps: { disablePortal: true } }}
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
                                                    onChange={(e) => updateFilterRow(row.id, { value: e.target.value })}
                                                    disabled={!row.field || !row.operator || noValueOp}
                                                    type={inputType}
                                                    InputLabelProps={isDateInput ? { shrink: true } : undefined}
                                                    helperText={hint}
                                                    placeholder={isArrayOp ? 'value1, value2, ...' : undefined}
                                                />
                                            )}

                                            <IconButton
                                                size="small"
                                                onClick={() => removeOrClearFilterRow(row.id)}
                                                aria-label="Remove filter"
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    );
                                })}
                            </Stack>
                            <Button
                                size="small"
                                onClick={addFilterRow}
                                sx={{ mt: 1 }}
                                startIcon={<span style={{ fontSize: '1.2em', lineHeight: 1 }}>+</span>}
                            >
                                Add Filter
                            </Button>
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

/* ────────────────────────────────────────────────────────────────
 * Per-column quick search (magnifying-glass icon in each header)
 * ──────────────────────────────────────────────────────────────── */

/** Pick a sensible default operator for the column's type. */
function quickSearchOperatorFor(type?: string): string {
    if (type === 'number') return '=';
    if (type === 'boolean') return 'is';
    if (type === 'date' || type === 'dateTime') return 'is';
    return 'contains';
}

/** Item id used to identify per-column quick-search items in the registry. */
const quickColumnItemId = (field: string) => `quick-col-${field}`;

function QuickSearchHeader({
    field,
    headerName,
    columnType,
}: {
    field: string;
    headerName: string;
    columnType?: string;
}) {
    const apiRef = useGridApiContext();
    const gridFilterModel = useGridSelector(apiRef, gridFilterModelSelector);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    /**
     * Draft operator + value the user is editing inside the popover.  Not
     * committed until Apply (button or Enter).  Pre-seeded from the existing
     * quick-col item when the popover opens, so re-opening shows what was
     * already applied.
     */
    const defaultOperator = quickSearchOperatorFor(columnType);
    const [draftOperator, setDraftOperator] = useState<string>(defaultOperator);
    const [draftValue, setDraftValue] = useState<string>('');

    // Subscribe to committed-filter updates so the active-state highlight refreshes
    // when other components (toolbar editor, etc.) change the registry.
    const [committed, setCommitted] = useState<{ items: GridFilterItem[]; logicOperator: GridLogicOperator } | undefined>();
    useEffect(() => {
        setCommitted(committedFilterRegistry.get(apiRef.current));
        return subscribeCommittedFilter(apiRef.current, () => {
            setCommitted(committedFilterRegistry.get(apiRef.current));
        });
    }, [apiRef]);

    // ANY filter on this column (field-based) — used for the active-state
    // visual indicator.  Covers both quick-search filters AND filters added
    // via the toolbar's Filter & Columns editor.
    const fieldFilterItems = (committed?.items ?? []).filter((it) => {
        if (it.field !== field) return false;
        if (!it.operator) return false;
        if (NO_VALUE_OPERATORS.has(String(it.operator))) return true;
        if (Array.isArray(it.value)) return it.value.length > 0;
        return String(it.value ?? '').trim().length > 0;
    });
    const isActive = fieldFilterItems.length > 0;
    /** Summary string shown in the tooltip when the column is filtered. */
    const activeSummary = fieldFilterItems
        .map((it) => {
            const op = String(it.operator ?? '');
            const valStr = Array.isArray(it.value)
                ? it.value.map(String).join(', ')
                : it.value == null
                    ? ''
                    : String(it.value);
            return valStr ? `${op} "${valStr}"` : op;
        })
        .join(' AND ');

    /**
     * Write (or remove) this column's quick-search item in the shared
     * committed-filter registry, then route the new model through the page's
     * onApplyFilterModel handler — the same path ToolbarFilterEditor uses, so
     * the data control header remains the single owner of filter state.
     */
    const applyQuickColumn = useCallback(
        (operator: string, rawValue: string) => {
            const existing = committedFilterRegistry.get(apiRef.current);
            const otherItems = (existing?.items ?? []).filter(
                (it) => it.id !== quickColumnItemId(field),
            );
            const trimmed = rawValue.trim();
            const noValueOp = NO_VALUE_OPERATORS.has(operator);
            const hasValue =
                noValueOp ||
                (ARRAY_VALUE_OPERATORS.has(operator)
                    ? trimmed.split(',').some((v) => v.trim().length > 0)
                    : trimmed.length > 0);
            const newItem: GridFilterItem | null =
                operator && hasValue
                    ? {
                          id: quickColumnItemId(field),
                          field,
                          operator,
                          value: coerceFilterValue(operator, columnType, trimmed),
                      }
                    : null;
            // Put the quick-column item FIRST so on Community Edition (which
            // truncates filterModel.items to one entry) the per-column search
            // is the active filter.
            const items: GridFilterItem[] = newItem ? [newItem, ...otherItems] : otherItems;
            const logicOperator = existing?.logicOperator ?? GridLogicOperator.And;

            setCommittedFilter(apiRef.current, { items, logicOperator });

            const quickFilterValues = gridFilterModel?.quickFilterValues ?? [];
            const quickFilterLogicOperator =
                gridFilterModel?.quickFilterLogicOperator ?? GridLogicOperator.And;
            const fullModel: GridFilterModel = {
                items,
                logicOperator,
                quickFilterValues,
                quickFilterLogicOperator,
            };

            const onApply = onApplyFilterModelRegistry.get(apiRef.current);
            if (typeof onApply === 'function') {
                // Page (server-side or useToolbarGridFiltering) owns the multi-item AND.
                // Do NOT call apiRef.current.setFilterModel — the Community grid would
                // truncate items to length 1 and fire onFilterModelChange with the
                // truncated list, racing the page state we just set.
                onApply(fullModel, { source: 'toolbar' });
                return;
            }
            // Bare client-side grid: Community Edition can only honor one item;
            // we apply the quick-column filter first so it wins.
            apiRef.current.setFilterModel({
                items: items.slice(0, 1),
                logicOperator,
                quickFilterValues,
                quickFilterLogicOperator,
            });
        },
        [apiRef, field, columnType, gridFilterModel],
    );

    const openPopover = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            // Stop propagation so the click doesn't trigger column sort/drag.
            e.stopPropagation();
            e.preventDefault();
            // Seed operator + value from the existing quick-col item if one
            // already applies; otherwise start at the type's default operator
            // ("contains" for strings) with an empty value.
            const existing = committedFilterRegistry.get(apiRef.current);
            const existingQuickItem = existing?.items.find(
                (it) => it.id === quickColumnItemId(field),
            );
            if (existingQuickItem) {
                setDraftOperator(String(existingQuickItem.operator ?? defaultOperator));
                const v = existingQuickItem.value;
                setDraftValue(
                    Array.isArray(v) ? v.map(String).join(', ') : v == null ? '' : String(v),
                );
            } else {
                setDraftOperator(defaultOperator);
                setDraftValue('');
            }
            setAnchorEl(e.currentTarget);
        },
        [apiRef, field, defaultOperator],
    );

    const closePopover = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const handleApply = useCallback(() => {
        applyQuickColumn(draftOperator, draftValue);
        setAnchorEl(null);
    }, [applyQuickColumn, draftOperator, draftValue]);

    const handleClear = useCallback(() => {
        applyQuickColumn(draftOperator, '');
        setDraftValue('');
        setAnchorEl(null);
    }, [applyQuickColumn, draftOperator]);

    const operators = operatorOptionsForType(columnType);
    const noValueOp = NO_VALUE_OPERATORS.has(draftOperator);
    const isArrayOp = ARRAY_VALUE_OPERATORS.has(draftOperator);
    const isBoolean = columnType === 'boolean';
    const inputType =
        columnType === 'number'
            ? 'number'
            : columnType === 'dateTime'
                ? 'datetime-local'
                : columnType === 'date'
                    ? 'date'
                    : 'text';
    const isDateInput = inputType === 'date' || inputType === 'datetime-local';
    const hint = isArrayOp ? ARRAY_OPERATOR_HINT[draftOperator] : undefined;
    const canClear = isActive || draftValue.trim().length > 0;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
                width: '100%',
            }}
        >
            <Box
                component="span"
                sx={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                }}
            >
                {headerName}
            </Box>
            <Tooltip
                arrow
                title={
                    isActive
                        ? `Filtered: ${activeSummary} (click to edit)`
                        : `Quick filter ${headerName}`
                }
            >
                <Badge
                    variant="dot"
                    color="primary"
                    overlap="circular"
                    invisible={!isActive}
                    sx={{
                        flex: '0 0 auto',
                        '& .MuiBadge-badge': {
                            minWidth: 8,
                            height: 8,
                            borderRadius: '50%',
                            border: '1px solid #fff',
                        },
                    }}
                >
                    <IconButton
                        size="small"
                        onClick={openPopover}
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-label={
                            isActive
                                ? `Edit filter for ${headerName} (currently: ${activeSummary})`
                                : `Quick filter for ${headerName}`
                        }
                        sx={{
                            p: 0.25,
                            color: isActive ? 'common.white' : 'text.secondary',
                            bgcolor: isActive ? 'primary.main' : 'transparent',
                            borderRadius: '50%',
                            transition: 'background-color 120ms, color 120ms',
                            '&:hover': {
                                color: isActive ? 'common.white' : 'primary.main',
                                bgcolor: isActive ? 'primary.dark' : 'action.hover',
                            },
                        }}
                    >
                        {isActive
                            ? <FilterAltIcon sx={{ fontSize: 16 }} />
                            : <SearchIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                </Badge>
            </Tooltip>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={closePopover}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { onClick: (e) => e.stopPropagation() } }}
            >
                <Box
                    sx={{ p: 1.5, width: 320 }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleApply();
                        } else if (e.key === 'Escape') {
                            e.stopPropagation();
                            closePopover();
                        }
                    }}
                >
                    <Stack spacing={1.25}>
                        {/* Column is locked to whichever header was clicked.
                            Disabled select renders the same shape as the toolbar
                            editor's column field but is not interactive. */}
                        <TextField
                            select
                            size="small"
                            label="Column"
                            value={field}
                            disabled
                            SelectProps={{ MenuProps: { disablePortal: true } }}
                        >
                            <MenuItem value={field}>{headerName}</MenuItem>
                        </TextField>

                        <TextField
                            select
                            size="small"
                            label="Operator"
                            value={draftOperator}
                            onChange={(e) => {
                                const next = e.target.value;
                                setDraftOperator(next);
                                if (NO_VALUE_OPERATORS.has(next)) setDraftValue('');
                            }}
                            SelectProps={{ MenuProps: { disablePortal: true } }}
                        >
                            {operators.map((op) => (
                                <MenuItem key={op.value} value={op.value}>
                                    {op.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        {!noValueOp && (
                            isBoolean ? (
                                <TextField
                                    select
                                    autoFocus
                                    size="small"
                                    label="Value"
                                    value={draftValue}
                                    onChange={(e) => setDraftValue(e.target.value)}
                                    SelectProps={{ MenuProps: { disablePortal: true } }}
                                >
                                    <MenuItem value="">Select</MenuItem>
                                    <MenuItem value="true">true</MenuItem>
                                    <MenuItem value="false">false</MenuItem>
                                </TextField>
                            ) : (
                                <TextField
                                    autoFocus
                                    size="small"
                                    label="Value"
                                    value={draftValue}
                                    onChange={(e) => setDraftValue(e.target.value)}
                                    type={inputType}
                                    InputLabelProps={isDateInput ? { shrink: true } : undefined}
                                    helperText={hint ?? 'Press Enter to apply'}
                                    placeholder={isArrayOp ? 'value1, value2, ...' : undefined}
                                />
                            )
                        )}

                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button size="small" onClick={handleClear} disabled={!canClear}>
                                Clear
                            </Button>
                            <Button size="small" onClick={closePopover}>
                                Cancel
                            </Button>
                            <Button size="small" variant="contained" onClick={handleApply}>
                                Apply
                            </Button>
                        </Box>
                    </Stack>
                </Box>
            </Popover>
        </Box>
    );
}

/**
 * Cache wrapped column arrays by their input identity.  Keeping the output
 * stable for the same input means MUI does not see a new `columns` prop on
 * every parent re-render — and therefore does not remount the column header
 * (and the open QuickSearchHeader Popover with it).  Without this cache,
 * any parent re-render while the user is typing into the per-column search
 * popover would tear down the input and reset the draft text.
 *
 * Consumers should keep their `columns` array stable themselves (module-
 * level const, or useMemo with stable deps) — which they already do.
 */
const wrappedColumnsCache = new WeakMap<object, unknown>();

/**
 * Wrap a column array so each filterable column gets an always-visible
 * magnifying-glass icon in its header that opens a per-column quick filter.
 *
 * - Skips columns where `filterable === false`, internal `__`-prefixed columns,
 *   and columns that already define a custom `renderHeader` (caller wins).
 * - The wrapped columns work with both client-side and server-side pages
 *   because filter changes flow through the same committed-filter registry
 *   the toolbar uses, and call the page's `onApplyFilterModel` (registered
 *   by DataControlHeader) when present.
 */
export function withQuickSearchHeaders<R extends GridValidRowModel = GridValidRowModel>(
    columns: GridColDef<R>[],
): GridColDef<R>[] {
    const cached = wrappedColumnsCache.get(columns as unknown as object);
    if (cached) return cached as GridColDef<R>[];
    const wrapped = columns.map((col) => {
        // Hide MUI's 3-dot column menu on every column the helper sees — the
        // magnifying-glass popover is now the sole per-column filter entry
        // point, and the kebab menu would duplicate (and bypass) it.
        const base = { ...col, disableColumnMenu: true };
        if (col.filterable === false) return base;
        if (col.field.startsWith('__')) return base;
        if (col.renderHeader) return base;
        const headerName = String(col.headerName ?? col.field);
        const columnType = col.type;
        return {
            ...base,
            renderHeader: () => (
                <QuickSearchHeader
                    field={col.field}
                    headerName={headerName}
                    columnType={columnType}
                />
            ),
        };
    });
    wrappedColumnsCache.set(columns as unknown as object, wrapped);
    return wrapped;
}

/* ────────────────────────────────────────────────────────────────
 * DataControlHeader (toolbar)
 * ──────────────────────────────────────────────────────────────── */

/** Stash the page's onApplyFilterModel in the apiRef-keyed registry so
 *  QuickSearchHeader can call it without prop-drilling. */
function ApplyFilterRegistration({
    onApplyFilterModel,
}: {
    onApplyFilterModel?: (model: GridFilterModel, details: object) => void;
}) {
    const apiRef = useGridApiContext();
    useEffect(() => {
        const api = apiRef.current;
        if (onApplyFilterModel) {
            onApplyFilterModelRegistry.set(api, onApplyFilterModel as never);
        } else {
            onApplyFilterModelRegistry.delete(api);
        }
        return () => {
            onApplyFilterModelRegistry.delete(api);
        };
    }, [apiRef, onApplyFilterModel]);
    return null;
}

/**
 * Single data control bar for tables: white search box (with icon),
 * merged Filters + Columns panel, and pagination.
 */
export default function DataControlHeader(props: {
    /** Direct callback for server-side pages. Passed via slotProps.toolbar. */
    onApplyFilterModel?: (model: GridFilterModel, details: object) => void;
}) {
    const { onApplyFilterModel } = props;
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
            <ApplyFilterRegistration onApplyFilterModel={onApplyFilterModel} />
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
                    <ToolbarSearchField onApplyFilterModel={onApplyFilterModel} />
                </Box>
                <ToolbarFilterEditor onApplyFilterModel={onApplyFilterModel} />
            </Box>
            <CustomPagination />
        </GridToolbarContainer>
    );
}
