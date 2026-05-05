'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { GridFilterItem, GridFilterModel } from '@mui/x-data-grid';
import { filterDocsByGridModel } from '@/lib/api/biochem';

interface UseToolbarGridFilteringOptions<T extends object> {
    rows: T[];
    quickSearchFields?: Array<keyof T | string>;
    endpoint?: string;
    onFilterApplied?: () => void;
}

function normalizeFilterLogic(value: GridFilterModel['logicOperator']): 'and' | 'or' {
    return String(value ?? '').toLowerCase() === 'or' ? 'or' : 'and';
}

function normalizeQuickFilterLogic(value: GridFilterModel['quickFilterLogicOperator']): 'and' | 'or' {
    return String(value ?? '').toLowerCase() === 'or' ? 'or' : 'and';
}

function normalizeSearchTerms(values: GridFilterModel['quickFilterValues']): string[] {
    if (!Array.isArray(values)) return [];
    return values
        .flatMap((value) => String(value ?? '').split(/\s+/))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
}

function normalizeQuickFilterValues(values: GridFilterModel['quickFilterValues']): string[] {
    if (!Array.isArray(values)) return [];
    return values
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);
}

function areFilterItemsEqual(a: GridFilterItem[], b: GridFilterItem[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        const left = a[i];
        const right = b[i];
        if (!left || !right) return false;
        if (String(left.field ?? '') !== String(right.field ?? '')) return false;
        if (String(left.operator ?? '') !== String(right.operator ?? '')) return false;
        if (JSON.stringify(left.value ?? null) !== JSON.stringify(right.value ?? null)) return false;
    }
    return true;
}

function areStringArraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
    const left = a ?? [];
    const right = b ?? [];
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
        if (left[i] !== right[i]) return false;
    }
    return true;
}

function areFilterModelsEqual(a: GridFilterModel, b: GridFilterModel): boolean {
    return (
        areFilterItemsEqual((a.items ?? []) as GridFilterItem[], (b.items ?? []) as GridFilterItem[])
        && normalizeFilterLogic(a.logicOperator) === normalizeFilterLogic(b.logicOperator)
        && areStringArraysEqual(a.quickFilterValues as string[] | undefined, b.quickFilterValues as string[] | undefined)
        && normalizeQuickFilterLogic(a.quickFilterLogicOperator) === normalizeQuickFilterLogic(b.quickFilterLogicOperator)
    );
}

function normalizeCellValue(value: unknown): string {
    if (Array.isArray(value)) return value.map((entry) => String(entry ?? '')).join(' ').toLowerCase();
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString().toLowerCase();
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value).toLowerCase();
        } catch {
            return String(value).toLowerCase();
        }
    }
    return String(value).toLowerCase();
}

export function filterRowsWithGridModel<T extends object>(
    rows: T[],
    filterModel: GridFilterModel,
    options: {
        quickSearchFields?: Array<keyof T | string>;
        endpoint?: string;
    } = {},
): T[] {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const items = (filterModel.items ?? []) as GridFilterItem[];
    const filteredByColumns = filterDocsByGridModel(
        rows as unknown as Record<string, unknown>[],
        items,
        options.endpoint,
        normalizeFilterLogic(filterModel.logicOperator),
    ) as unknown as T[];

    const terms = normalizeSearchTerms(filterModel.quickFilterValues);
    if (terms.length === 0) return filteredByColumns;

    const quickLogic = normalizeQuickFilterLogic(filterModel.quickFilterLogicOperator);
    const resolvedFields = (options.quickSearchFields ?? []).map(String).filter(Boolean);

    return filteredByColumns.filter((row) => {
        const record = row as Record<string, unknown>;
        const values = resolvedFields.length > 0
            ? resolvedFields.map((field) => normalizeCellValue(record[field]))
            : Object.values(record).map(normalizeCellValue);

        const matchesTerm = (term: string) => values.some((value) => value.includes(term));
        return quickLogic === 'or' ? terms.some(matchesTerm) : terms.every(matchesTerm);
    });
}

export function useToolbarGridFiltering<T extends object>(
    options: UseToolbarGridFilteringOptions<T>,
) {
    const {
        rows,
        quickSearchFields,
        endpoint,
        onFilterApplied,
    } = options;
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] });
    const committedFilterItemsRef = useRef<GridFilterItem[]>([]);
    const committedQuickFilterValuesRef = useRef<string[]>([]);
    const toolbarSaveRef = useRef(false);

    const handleFilterModelChange = useCallback(
        (next: GridFilterModel) => {
            const incoming = (next.items ?? []) as GridFilterItem[];
            const committed = committedFilterItemsRef.current;
            const fromToolbar = toolbarSaveRef.current;
            toolbarSaveRef.current = false;
            const incomingQuickFilterValues = normalizeQuickFilterValues(next.quickFilterValues);

            // Guard against Community DataGrid truncation events (unless user explicitly saved via toolbar).
            if (!fromToolbar && incoming.length > 0 && incoming.length < committed.length) {
                return;
            }

            const shouldPreserveQuickSearch =
                !fromToolbar
                && incomingQuickFilterValues.length === 0
                && committedQuickFilterValuesRef.current.length > 0;

            const resolvedQuickFilterValues = shouldPreserveQuickSearch
                ? committedQuickFilterValuesRef.current
                : incomingQuickFilterValues;

            const nextModel: GridFilterModel = {
                items: incoming,
                logicOperator: next.logicOperator,
                quickFilterValues: resolvedQuickFilterValues,
                quickFilterLogicOperator: next.quickFilterLogicOperator,
            };

            setFilterModel((prev) => {
                if (areFilterModelsEqual(prev, nextModel)) return prev;
                return nextModel;
            });
            committedFilterItemsRef.current = incoming;
            committedQuickFilterValuesRef.current = resolvedQuickFilterValues;
            onFilterApplied?.();
        },
        [onFilterApplied],
    );

    const handleToolbarApplyFilterModel = useCallback(
        (model: GridFilterModel) => {
            toolbarSaveRef.current = true;
            handleFilterModelChange(model);
        },
        [handleFilterModelChange],
    );

    const filteredRows = useMemo(
        () => filterRowsWithGridModel(rows, filterModel, { quickSearchFields, endpoint }),
        [rows, filterModel, quickSearchFields, endpoint],
    );

    return {
        filterModel,
        filteredRows,
        handleFilterModelChange,
        handleToolbarApplyFilterModel,
    };
}
