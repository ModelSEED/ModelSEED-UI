/**
 * Biochemistry Solr API Utility
 *
 * Modern TypeScript port of the legacy AngularJS `Biochem` service
 * (external/ModelSEED-UI/app/services/biochem.js).
 *
 * Queries the ModelSEED Solr endpoint. The base URL is driven by
 * `lib/api/config.ts` — toggle `USE_NEW_PROXY` to route through
 * the unified proxy when available.
 */

import {
    CPD_IMG_BASE,
    MODELSEED_API_URL,
    SOLR_BASE,
    SOLR_BASE_LEGACY,
    SOLR_COMPOUNDS_COLLECTION,
    SOLR_REACTIONS_COLLECTION,
} from './config';

/* ─── Types ──────────────────────────────────────────────────── */

export interface Reaction {
    id: string;
    name: string;
    definition: string;
    deltag: number;
    deltagerr: number;
    reversibility: string;
    stoichiometry: string;
    status: string;
    aliases: string[];
    ec_numbers: string[];
    is_obsolete: string;
    is_transport: boolean;
    ontology: string;
    pathways: string[];
    notes: string[];
    abbreviation?: string;
    equation?: string;
    compound_ids?: string[];
    linked_reaction?: string;
    source?: string;
}

export interface Compound {
    id: string;
    name: string;
    formula: string;
    mass: number;
    charge: number;
    deltag: number;
    deltagerr: number;
    abbreviation: string;
    aliases: string[];
    ontology: string;
    inchikey?: string;
    smiles?: string;
    is_cofactor?: boolean;
    is_core?: boolean;
    is_obsolete?: string;
    pka?: string[];
    pkb?: string[];
    source?: string;
    structure?: string;
}

export interface GridFilterItem {
    id?: number | string;
    field: string;
    value?: string | number | boolean | string[];
    operator: string;
}

export interface GridFilterModel {
    items: GridFilterItem[];
    logicOperator?: 'and' | 'or';
    quickFilterValues?: string[];
    quickFilterLogicOperator?: 'and' | 'or';
}

export interface SolrResponse<T> {
    numFound: number;
    start: number;
    docs: T[];
}

export interface SolrQueryOpts {
    query?: string;
    limit?: number;
    offset?: number;
    sort?: { field: string; desc?: boolean };
    /** Solr field list for quick search OR for modelseed-api local quick-refine (see get*FromModelseedApi). */
    searchFields?: string[];
    queryColumn?: Record<string, string>;
    visible?: string[];
    filterModel?: GridFilterModel;
}

/* ─── External DB Links ──────────────────────────────────────── */

export const EXTERNAL_DBS = {
    BiGG_r: 'http://bigg.ucsd.edu/universal/reactions/',
    BiGG_c: 'http://bigg.ucsd.edu/universal/metabolites/',
    KEGG: 'https://www.kegg.jp/entry/',
    MetaCyc_c: 'https://biocyc.org/META/NEW-IMAGE?type=COMPOUND&object=',
    MetaCyc_r: 'https://biocyc.org/META/NEW-IMAGE?type=REACTION&object=',
} as const;

/* ─── Query Builder ──────────────────────────────────────────── */

/** Operators that do not require a filter value payload. */
const NO_VALUE_OPERATORS = new Set(['isEmpty', 'isNotEmpty']);

/** Numeric literal matcher used to keep number filters/ranges unquoted. */
const NUMERIC_LITERAL_RE = /^-?\d+(\.\d+)?$/;

/**
 * Escape user terms for Solr/Lucene query syntax while preserving text,
 * punctuation, and biochemical identifiers.
 */
function escapeSolrTerm(value: string): string {
    let escaped = value.trim().replace(/\\/g, '\\\\');
    escaped = escaped.replace(/&&/g, '\\&&');
    escaped = escaped.replace(/([+\-!(){}\[\]^"~*?:/|])/g, '\\$1');
    return escaped;
}

/** Escape string values for quoted Solr phrases. */
function escapeSolrPhrase(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Maps UI field aliases to Solr field names. */
function toSolrField(field: string): string {
    return field === 'synonyms' ? SYNONYM_FIELD_ALIAS : field;
}

/** Convert any scalar filter value to string safely. */
function normalizeFilterValue(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value ?? '').trim();
}

/** Build a wildcard-safe search token for legacy Solr. */
function toSolrWildcardToken(value: string): string {
    return escapeSolrTerm(value.replace(/%20/g, ' ').trim()).replace(/\s+/g, '*');
}

/** Build a Solr exact literal (quoted or native for booleans/numbers). */
function toSolrLiteral(value: string): string {
    if (NUMERIC_LITERAL_RE.test(value)) return value;
    if (/^(true|false)$/i.test(value)) return value.toLowerCase();
    return `"${escapeSolrPhrase(value)}"`;
}

/** Build a Solr range boundary for numeric/date/text comparisons. */
function toRangeBoundary(value: string): string {
    if (NUMERIC_LITERAL_RE.test(value)) return value;

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
        return `"${date.toISOString()}"`;
    }

    return `"${escapeSolrPhrase(value)}"`;
}

/** True when the value has ASCII letters and may need case-variant matching. */
function hasAsciiLetters(value: string): boolean {
    return /[A-Za-z]/.test(value);
}

/** Title-case words for mixed-case fallback variants. */
function toTitleCaseWords(value: string): string {
    return value.replace(/[A-Za-z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/** Build case variants for legacy Solr fields that are case-sensitive. */
function buildCaseVariants(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (!hasAsciiLetters(trimmed)) return [trimmed];

    return Array.from(
        new Set([
            trimmed,
            trimmed.toLowerCase(),
            trimmed.toUpperCase(),
            toTitleCaseWords(trimmed),
        ]),
    );
}

function joinOrClauses(clauses: string[]): string | null {
    if (clauses.length === 0) return null;
    if (clauses.length === 1) return clauses[0];
    return `(${clauses.join(' OR ')})`;
}

function buildEqualsVariantClause(field: string, value: string): string | null {
    const clauses = Array.from(
        new Set(buildCaseVariants(value).map((entry) => `${field}:${toSolrLiteral(entry)}`)),
    );
    return joinOrClauses(clauses);
}

function buildWildcardVariantClause(
    field: string,
    value: string,
    mode: 'contains' | 'startsWith' | 'endsWith',
): string | null {
    const clauses = buildCaseVariants(value)
        .map((entry) => {
            const token = toSolrWildcardToken(entry);
            if (!token) return '';
            switch (mode) {
                case 'startsWith':
                    return `${field}:${token}*`;
                case 'endsWith':
                    return `${field}:*${token}`;
                case 'contains':
                default:
                    return `${field}:*${token}*`;
            }
        })
        .filter((clause): clause is string => Boolean(clause));

    return joinOrClauses(Array.from(new Set(clauses)));
}

/** Build a single Solr clause from one DataGrid filter item. */
function buildFilterClause(item: GridFilterItem): string | null {
    const field = toSolrField(item.field);
    const operator = String(item.operator ?? '').trim();
    const rawValue = item.value;
    const needsValue = !NO_VALUE_OPERATORS.has(operator);

    if (!field || !operator) return null;
    if (needsValue) {
        if (rawValue == null) return null;
        if (Array.isArray(rawValue) && rawValue.length === 0) return null;
        if (!Array.isArray(rawValue) && normalizeFilterValue(rawValue).length === 0) return null;
    }

    const value = normalizeFilterValue(rawValue);
    const rangeBoundary = toRangeBoundary(value);

    switch (operator) {
        case '>':
        case 'after':
            return `${field}:{${rangeBoundary} TO *]`;
        case '>=':
        case 'onOrAfter':
            return `${field}:[${rangeBoundary} TO *]`;
        case '<':
        case 'before':
            return `${field}:[* TO ${rangeBoundary}}`;
        case '<=':
        case 'onOrBefore':
            return `${field}:[* TO ${rangeBoundary}]`;
        case 'isEmpty':
            return `-${field}:[* TO *]`;
        case 'isNotEmpty':
            return `${field}:[* TO *]`;
        case '=':
        case 'equals':
        case 'is':
            return buildEqualsVariantClause(field, value);
        case '!=':
        case 'not':
        case 'doesNotEqual':
            return (() => {
                const equalsClause = buildEqualsVariantClause(field, value);
                return equalsClause ? `-${equalsClause}` : null;
            })();
        case 'startsWith':
            return buildWildcardVariantClause(field, value, 'startsWith');
        case 'endsWith':
            return buildWildcardVariantClause(field, value, 'endsWith');
        case 'doesNotContain':
            return (() => {
                const containsClause = buildWildcardVariantClause(field, value, 'contains');
                return containsClause ? `-${containsClause}` : null;
            })();
        case 'isAnyOf': {
            const values = Array.isArray(rawValue)
                ? rawValue.map((entry) => normalizeFilterValue(entry)).filter(Boolean)
                : value
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean);
            if (values.length === 0) return null;
            const valueClauses = values
                .map((entry) => buildEqualsVariantClause(field, entry))
                .filter((clause): clause is string => Boolean(clause));
            return joinOrClauses(valueClauses);
        }
        case 'between': {
            // Two-position range. Either side may be empty for an open-ended
            // bound; Solr accepts `*` as the unbounded sentinel.  We preserve
            // empty positions (do NOT filterBoolean) so `[*, 100]` produces
            // `field:[* TO 100]`.
            const parts = Array.isArray(rawValue)
                ? rawValue.map((entry) => normalizeFilterValue(entry))
                : value.split(',').slice(0, 2).map((entry) => entry.trim());
            const from = (parts[0] ?? '').trim();
            const to = (parts[1] ?? '').trim();
            if (!from && !to) return null;
            const fromBound = from ? toRangeBoundary(from) : '*';
            const toBound = to ? toRangeBoundary(to) : '*';
            return `${field}:[${fromBound} TO ${toBound}]`;
        }
        case 'contains':
        default:
            return buildWildcardVariantClause(field, value, 'contains');
    }
}

/** Build the Solr clause for quick/global search terms. */
function buildQuickSearchClause(
    query: string | undefined,
    searchFields: string[] | undefined,
    quickFilterValues: string[],
    quickFilterLogicOperator: 'and' | 'or',
): string {
    if (query === '*' || query === '*:*') return '*';

    const candidateTerms = query ? [query] : quickFilterValues;
    const terms = candidateTerms
        .map((value) => normalizeFilterValue(value))
        .filter(Boolean);
    if (terms.length === 0) return '';

    const termClauses = terms
        .map((term) => {
            const token = toSolrWildcardToken(term);
            if (!token) return '';
            const usePrefixOnly = token.length < MIN_WILDCARD_QUERY_LENGTH;

            if (searchFields && searchFields.length > 0) {
                const fieldClauses = searchFields.map((field) => {
                    const solrField = toSolrField(field);
                    return usePrefixOnly
                        ? `${solrField}:${token}*`
                        : `${solrField}:*${token}*`;
                });
                return `(${fieldClauses.join(' OR ')})`;
            }

            return usePrefixOnly ? `${token}*` : `*${token}*`;
        })
        .filter(Boolean);

    if (termClauses.length === 0) return '';
    if (termClauses.length === 1) return termClauses[0];

    const logic = quickFilterLogicOperator === 'or' ? 'OR' : 'AND';
    return `(${termClauses.join(` ${logic} `)})`;
}

/**
 * Builds a Solr query URL from options, mirroring legacy `get_solr`.
 */
function buildSolrUrl(collection: string, opts: SolrQueryOpts = {}): string {
    const collectionName =
        collection === 'reactions'
            ? SOLR_REACTIONS_COLLECTION
            : collection === 'compounds'
                ? SOLR_COMPOUNDS_COLLECTION
                : collection;
    let url = `${SOLR_BASE}${collectionName}/select?wt=json`;

    const {
        query,
        limit,
        offset = 0,
        sort,
        searchFields,
        queryColumn,
        visible = [],
        filterModel,
    } = opts;

    // Field list
    if (visible.length > 0) {
        url += `&fl=${visible.join(',')}`;
    }

    // Filter out ontology field for compounds (Solr compounds_staging has no ontology field)
    const filterItems = (filterModel?.items ?? []).filter(item => {
        const field = toSolrField(String(item.field ?? ''));
        return !(collection === 'compounds' && field === 'ontology');
    });

    const filterClauses = filterItems
        .map((item) => buildFilterClause(item))
        .filter((clause): clause is string => Boolean(clause));
    const filterLogic = filterModel?.logicOperator === 'or' ? ' OR ' : ' AND ';
    const combinedFilterClause =
        filterClauses.length > 1
            ? `(${filterClauses.join(filterLogic)})`
            : (filterClauses[0] ?? '');

    const queryColumnClauses = queryColumn
        ? Object.entries(queryColumn)
            .map(([field, rawValue]) => {
                const value = normalizeFilterValue(rawValue);
                const token = toSolrWildcardToken(value);
                if (!token) return '';
                return `${toSolrField(field)}:*${token}*`;
            })
            .filter(Boolean)
        : [];
    const combinedQueryColumnClause =
        queryColumnClauses.length > 1
            ? `(${queryColumnClauses.join(' AND ')})`
            : (queryColumnClauses[0] ?? '');

    const mainQueryStr = buildQuickSearchClause(
        query,
        searchFields,
        filterModel?.quickFilterValues ?? [],
        filterModel?.quickFilterLogicOperator ?? 'and',
    );

    const finalClauses: string[] = [];
    if (mainQueryStr && mainQueryStr !== '*') finalClauses.push(mainQueryStr);
    if (combinedFilterClause) finalClauses.push(combinedFilterClause);
    if (combinedQueryColumnClause) finalClauses.push(combinedQueryColumnClause);
    if (mainQueryStr === '*' && finalClauses.length === 0) {
        finalClauses.push('*');
    }

    const qValue = finalClauses.length > 0 ? finalClauses.join(' AND ') : '*';
    url += `&q=${encodeURIComponent(qValue)}`;

    // Pagination
    if (limit) url += `&rows=${limit}`;
    if (offset) url += `&start=${offset}`;

    // Sort
    if (sort) {
        const dir = sort.desc ? 'desc' : 'asc';
        url += `&sort=${sort.field} ${dir}`;
    }

    return url;
}

/* ─── Fetcher ────────────────────────────────────────────────── */

async function fetchSolr<T>(url: string): Promise<SolrResponse<T>> {
    const res = await fetch(url);
    if (!res.ok) {
        let detail = '';
        try {
            const text = await res.text();
            const parsed = JSON.parse(text) as { error?: { msg?: string } };
            detail = parsed?.error?.msg ? `: ${parsed.error.msg}` : (text?.slice(0, 240) ?? '');
        } catch {
            // ignore JSON parse failures
        }
        throw new Error(`Solr request failed: ${res.status}${detail}`);
    }
    const json = await res.json();
    return json.response as SolrResponse<T>;
}

/**
 * Explicit REST fetcher for modelseed-api biochemistry endpoints.
 * Note: reaction/compound pages are pinned to legacy Solr; this is for
 * other consumers that intentionally target modelseed-api.
 */
/**
 * Resolved JSON field used for sorting (UI column `synonyms` → Solr/REST `aliases`).
 */
function resolveDocFieldKey(field: string): string {
    return toSolrField(field);
}

/** Terms taken from toolbar quick search when no explicit Solr `query` is set. */
function quickTermsFromOpts(
    explicitQuery: string | undefined,
    filterModel?: GridFilterModel,
): string[] {
    if (explicitQuery != null && String(explicitQuery).trim().length > 0) {
        return [normalizeFilterValue(explicitQuery)];
    }
    return (filterModel?.quickFilterValues ?? [])
        .map((v) => normalizeFilterValue(v))
        .filter(Boolean);
}

/**
 * Approximate Solr quick-search behavior on the REST payload: AND/OR of terms where
 * each term matches if ANY search field matches (substring, case-insensitive).
 * Short tokens mirror Solr prefix behavior (MIN_WILDCARD_QUERY_LENGTH).
 */
function docsPassRestQuickSearch(
    docs: Record<string, unknown>[],
    terms: string[],
    searchFields: string[],
    logicOperator: 'and' | 'or',
): Record<string, unknown>[] {
    if (terms.length === 0 || searchFields.length === 0) return docs;

    return docs.filter((doc) =>
        docsPassRestQuickSearchRow(doc, terms, searchFields, logicOperator));
}

function docsPassRestQuickSearchRow(
    doc: Record<string, unknown>,
    terms: string[],
    searchFields: string[],
    logicOperator: 'and' | 'or',
): boolean {
    const joiner = logicOperator === 'or' ? 'some' : 'every';
    return terms[joiner]((rawTerm) => {
        const term = normalizeFilterValue(rawTerm);
        const tnorm = term.toLowerCase();
        const usePrefixOnly = toSolrWildcardToken(term).length < MIN_WILDCARD_QUERY_LENGTH;
        return searchFields.some((sf) => {
            const fv = normalizeFieldValue(doc[resolveDocFieldKey(sf)]).toLowerCase();
            return usePrefixOnly ? fv.startsWith(tnorm) : fv.includes(tnorm);
        });
    });
}

async function fetchModelseedApiBiochem<T>(
    endpoint: string,
    opts: SolrQueryOpts = {}
): Promise<SolrResponse<T>> {
    const {
        query,
        limit = 25,
        offset = 0,
        filterModel,
        sort,
        searchFields:
            incomingSearchFields,
    } = opts;

    const searchFields = (incomingSearchFields && incomingSearchFields.length > 0)
        ? incomingSearchFields
        : (endpoint === 'compounds' ? CPD_SEARCH_FIELDS : RXN_SEARCH_FIELDS);

    let activeSearch = query;
    if (!activeSearch && filterModel?.quickFilterValues && filterModel.quickFilterValues.length > 0) {
        activeSearch = filterModel.quickFilterValues
            .map((v) => String(v).trim())
            .filter(Boolean)
            .join(' ');
    }

    const hasColumnFilters = (filterModel?.items?.length ?? 0) > 0;
    const quickTerms = quickTermsFromOpts(query, filterModel);
    /** REST endpoints do not pass Solr `start`/`offset`; we must fetch enough rows to slice. */
    const minRowsForPaging = Math.max(limit + offset, 1);

    /*
     * modelseed-api list/search does not pass Solr offsets: we slice client-side after fetch.
     * When quick search narrows logically across multiple columns (Solr-style OR), widen the REST
     * pull then refine locally. Column filters/sort also operate on client batches.
     */
    const MAX_CAP = 5000;
    const quickRefine = quickTerms.length > 0;
    const wantsWideHeap = Boolean(sort) || hasColumnFilters || quickRefine;

    let fetchLimit: number;
    if (!wantsWideHeap) {
        fetchLimit = Math.min(MAX_CAP, minRowsForPaging);
    } else if (quickRefine) {
        fetchLimit = MAX_CAP;
    } else {
        fetchLimit = Math.min(MAX_CAP, Math.max(minRowsForPaging, 1000));
    }

    const primaryUrl = activeSearch
        ? `${MODELSEED_API_URL}/api/biochem/search?query=${encodeURIComponent(activeSearch)}&limit=${fetchLimit}&type=${endpoint}`
        : `${MODELSEED_API_URL}/api/biochem/${endpoint}?limit=${fetchLimit}`;

    let res = await fetch(primaryUrl);
    if (!res.ok && !activeSearch) {
        const fallbackUrl = `${MODELSEED_API_URL}/api/biochem/search?query=*&limit=${fetchLimit}&type=${endpoint}`;
        res = await fetch(fallbackUrl);
    }
    if (!res.ok) throw new Error(`modelseed-api request failed: ${res.status}`);
    const data = await res.json();

    const rawDocs: T[] = Array.isArray(data)
        ? (data as T[])
        : ((data.docs || []) as T[]);

    let working = rawDocs as unknown as Record<string, unknown>[];
    working = docsPassRestQuickSearch(
        working,
        quickTerms,
        searchFields,
        filterModel?.quickFilterLogicOperator === 'or' ? 'or' : 'and',
    );

    const filteredDocs = hasColumnFilters
        ? working.filter((doc) =>
            matchesFilterModel(
                doc as Record<string, unknown>,
                filterModel?.items ?? [],
                filterModel?.logicOperator === 'or' ? 'or' : 'and',
                endpoint,
            ))
        : working;
    const sortedDocs = sort ? sortDocs(filteredDocs, sort, resolveDocFieldKey) : filteredDocs;
    const pagedDocs = sortedDocs.slice(offset, offset + limit);

    return {
        numFound: sortedDocs.length,
        start: offset,
        docs: pagedDocs as unknown as T[],
    };
}

function normalizeFieldValue(value: unknown): string {
    if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join(' ');
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

function compareStringByOperator(fieldValue: string, operator: string, filterValue: string): boolean {
    const fieldNorm = fieldValue.toLowerCase();
    const valueNorm = filterValue.toLowerCase();
    switch (operator) {
        case 'contains':
            return fieldNorm.includes(valueNorm);
        case 'doesNotContain':
            return !fieldNorm.includes(valueNorm);
        case 'equals':
        case 'is':
            return fieldNorm === valueNorm;
        case 'doesNotEqual':
        case 'not':
            return fieldNorm !== valueNorm;
        case 'startsWith':
            return fieldNorm.startsWith(valueNorm);
        case 'endsWith':
            return fieldNorm.endsWith(valueNorm);
        default:
            return fieldNorm.includes(valueNorm);
    }
}

function matchesFilterItem(
    doc: Record<string, unknown>,
    item: GridFilterItem,
    endpoint?: string,
): boolean {
    const operator = String(item.operator ?? '');
    const field = toSolrField(String(item.field ?? ''));
    if (!field || !operator) return true;

    /* Solr compounds_staging has no ontology query field — REST payloads typically omit it too. */
    if (endpoint === 'compounds' && field === 'ontology') return true;

    const rawField = doc[field];
    const fieldValue = normalizeFieldValue(rawField);
    const value = normalizeFilterValue(item.value);

    if (operator === 'isEmpty') return fieldValue.trim().length === 0;
    if (operator === 'isNotEmpty') return fieldValue.trim().length > 0;
    if (operator === 'between') {
        // Two-position range; either side may be empty for an open bound.
        // Prefers numeric comparison when both the field and the bounds parse
        // as numbers; falls back to date comparison; otherwise lexical.
        const parts = Array.isArray(item.value)
            ? (item.value as unknown[]).map((entry) => normalizeFilterValue(entry))
            : value.split(',').slice(0, 2).map((entry) => entry.trim());
        const fromStr = (parts[0] ?? '').trim();
        const toStr = (parts[1] ?? '').trim();
        if (!fromStr && !toStr) return true;

        const fieldNum = Number(fieldValue);
        const fromNum = fromStr ? Number(fromStr) : null;
        const toNum = toStr ? Number(toStr) : null;
        const allNumeric =
            Number.isFinite(fieldNum) &&
            (fromNum === null || Number.isFinite(fromNum)) &&
            (toNum === null || Number.isFinite(toNum));
        if (allNumeric) {
            if (fromNum !== null && fieldNum < fromNum) return false;
            if (toNum !== null && fieldNum > toNum) return false;
            return true;
        }

        const fieldDate = new Date(fieldValue);
        const fromDate = fromStr ? new Date(fromStr) : null;
        const toDate = toStr ? new Date(toStr) : null;
        const allDates =
            !Number.isNaN(fieldDate.getTime()) &&
            (fromDate === null || !Number.isNaN(fromDate.getTime())) &&
            (toDate === null || !Number.isNaN(toDate.getTime()));
        if (allDates) {
            if (fromDate !== null && fieldDate < fromDate) return false;
            if (toDate !== null && fieldDate > toDate) return false;
            return true;
        }

        // Lexical fallback (rare — strings used as a range).
        if (fromStr && fieldValue < fromStr) return false;
        if (toStr && fieldValue > toStr) return false;
        return true;
    }
    if (operator === 'isAnyOf') {
        const values = Array.isArray(item.value)
            ? item.value.map((v) => normalizeFilterValue(v)).filter(Boolean)
            : value.split(',').map((v) => v.trim()).filter(Boolean);
        if (values.length === 0) return true;
        return values.some((v) => compareStringByOperator(fieldValue, 'equals', v));
    }

    const fieldNum = Number(fieldValue);
    const valueNum = Number(value);
    const bothNumeric = Number.isFinite(fieldNum) && Number.isFinite(valueNum);
    if (bothNumeric) {
        switch (operator) {
            case '>':
            case 'after':
                return fieldNum > valueNum;
            case '>=':
            case 'onOrAfter':
                return fieldNum >= valueNum;
            case '<':
            case 'before':
                return fieldNum < valueNum;
            case '<=':
            case 'onOrBefore':
                return fieldNum <= valueNum;
            case '=':
                return fieldNum === valueNum;
            case '!=':
                return fieldNum !== valueNum;
        }
    }

    // Handle date operators for non-numeric fields (e.g., date strings)
    const dateOperators = ['after', 'before', 'onOrAfter', 'onOrBefore'];
    if (dateOperators.includes(operator)) {
        const fieldDate = new Date(fieldValue);
        const valueDate = new Date(value);
        if (!Number.isNaN(fieldDate.getTime()) && !Number.isNaN(valueDate.getTime())) {
            switch (operator) {
                case 'after':
                    return fieldDate > valueDate;
                case 'before':
                    return fieldDate < valueDate;
                case 'onOrAfter':
                    return fieldDate >= valueDate;
                case 'onOrBefore':
                    return fieldDate <= valueDate;
            }
        }
    }

    return compareStringByOperator(fieldValue, operator, value);
}

function matchesFilterModel(
    doc: Record<string, unknown>,
    items: GridFilterItem[],
    logicOperator: 'and' | 'or' = 'and',
    endpoint?: string,
): boolean {
    const activeItems = items.filter((item) => item.field && item.operator);
    if (activeItems.length === 0) return true;
    if (logicOperator === 'or') {
        return activeItems.some((item) => matchesFilterItem(doc, item, endpoint));
    }
    return activeItems.every((item) => matchesFilterItem(doc, item, endpoint));
}

function sortDocs<T>(
    docs: T[],
    sort: { field: string; desc?: boolean },
    resolveSortKey?: (field: string) => string,
): T[] {
    const { field, desc } = sort;
    const direction = desc ? -1 : 1;
    const key = resolveSortKey ? resolveSortKey(field) : field;
    return [...docs].sort((a, b) => {
        const av = (a as Record<string, unknown>)[key];
        const bv = (b as Record<string, unknown>)[key];
        const aNum = Number(av);
        const bNum = Number(bv);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
            return direction * (aNum - bNum);
        }
        return direction * normalizeFieldValue(av).localeCompare(normalizeFieldValue(bv));
    });
}

/**
 * Apply MUI column filter items to row objects locally (for APIs that cannot express filters server-side).
 * Uses the same operator semantics as Solr-backed biochem when used with `get*FromModelseedApi`.
 */
export function filterDocsByGridModel<T extends Record<string, unknown>>(
    docs: T[],
    items: GridFilterItem[],
    endpoint?: string,
    logicOperator: 'and' | 'or' = 'and',
): T[] {
    if (!items.length) return docs;
    return docs.filter((doc) => matchesFilterModel(doc, items, logicOperator, endpoint));
}

/** Client-side sort helper for grids that batch-fetch then paginate (e.g. PATRIC with column filters). */
export function sortGridDocsLocally<T>(
    docs: T[],
    sort: { field: string; desc?: boolean },
    resolveField?: (field: string) => string,
): T[] {
    return sortDocs(docs, sort, resolveField);
}

/* ─── Constants ──────────────────────────────────────────────── */

/** Field name mapping: UI uses 'synonyms' but Solr uses 'aliases'. */
const SYNONYM_FIELD_ALIAS = 'aliases';

/** Minimum query length for wildcard search (shorter queries use prefix match). */
const MIN_WILDCARD_QUERY_LENGTH = 3;

/** Reaction search fields matching legacy `rxn_sFields`. */
const RXN_SEARCH_FIELDS = ['id', 'name', 'status', 'ec_numbers', 'aliases', 'pathways', 'stoichiometry', 'notes'];

/** Reaction visible fields matching legacy `rxnOpts.visible`. */
const RXN_VISIBLE = [
    'name', 'id', 'definition', 'deltag', 'deltagerr', 'reversibility',
    'stoichiometry', 'status', 'aliases', 'ec_numbers', 'is_obsolete',
    'is_transport', 'ontology', 'pathways', 'notes',
];

/**
 * Compound quick-search fields — must exist on Solr `compounds_staging`.
 * Note: Solr does not expose an `ontology` field on compounds; querying it yields 400
 * ("undefined field ontology") and breaks the whole quick-search clause.
 */
const CPD_SEARCH_FIELDS = ['id', 'name', 'formula', 'synonyms', 'aliases'];

/** Compound visible fields matching Solr `compounds_staging` stored fields (see fl=). */
const CPD_VISIBLE = [
    'name', 'id', 'formula', 'mass', 'abbreviation', 'deltag', 'deltagerr',
    'charge', 'aliases',
];

/* ─── Public API ─────────────────────────────────────────────── */

/**
 * Search and retrieve biochemical reactions.
 * 
 * Queries the ModelSEED biochemistry database for reactions with support for
 * advanced filtering, pagination, and sorting. Main UI queries are Solr-backed.
 * 
 * @param opts - Query options (query, limit, offset, sort, filterModel)
 * @returns Promise resolving to paginated reaction results
 * 
 * @example
 * ```typescript
 * // Simple search
 * const results = await getReactions({ query: 'ATP', limit: 25 });
 * 
 * // Advanced filtering
 * const filtered = await getReactions({
 *   filterModel: {
 *     items: [{ field: 'status', operator: 'equals', value: 'OK' }],
 *     logicOperator: 'and'
 *   },
 *   sort: { field: 'name' }
 * });
 * ```
 */
export async function getReactions(opts: SolrQueryOpts = {}): Promise<SolrResponse<Reaction>> {
    const mergedOpts: SolrQueryOpts = {
        limit: 25,
        offset: 0,
        sort: { field: 'id' },
        searchFields: RXN_SEARCH_FIELDS,
        visible: RXN_VISIBLE,
        ...opts,
    };

    // Reactions page is intentionally pinned to legacy Solr.
    const url = buildSolrUrl('reactions', mergedOpts);
    const res = await fetchSolr<Reaction>(url);

    // Mark obsolete reactions (matching legacy logic)
    res.docs.forEach((doc) => {
        if (doc.is_obsolete === '1') {
            doc.status += ' (and is obsolete)';
        }
    });

    return res;
}

/**
 * Search and retrieve biochemical compounds.
 * 
 * Queries the ModelSEED biochemistry database for compounds (metabolites)
 * with pagination, filtering, and sorting support. Main UI queries are Solr-backed.
 * 
 * @param opts - Query options (query, limit, offset, sort, filterModel)
 * @returns Promise resolving to paginated compound results
 * 
 * @example
 * ```typescript
 * const results = await getCompounds({ query: 'glucose', limit: 10 });
 * results.docs.forEach(cpd => {
 *   console.log(`${cpd.id}: ${cpd.name} - ${cpd.formula}`);
 * });
 * ```
 */
export async function getCompounds(opts: SolrQueryOpts = {}): Promise<SolrResponse<Compound>> {
    const mergedOpts: SolrQueryOpts = {
        limit: 25,
        offset: 0,
        sort: { field: 'id' },
        searchFields: CPD_SEARCH_FIELDS,
        visible: CPD_VISIBLE,
        ...opts,
    };

    // Compounds page is intentionally pinned to legacy Solr.
    const url = buildSolrUrl('compounds', mergedOpts);
    return fetchSolr<Compound>(url);
}

/**
 * Explicit modelseed-api reactions query path.
 * Use this only when intentionally targeting the REST backend.
 */
export async function getReactionsFromModelseedApi(
    opts: SolrQueryOpts = {}
): Promise<SolrResponse<Reaction>> {
    const res = await fetchModelseedApiBiochem<Reaction>('reactions', {
        limit: 25,
        offset: 0,
        sort: { field: 'id' },
        searchFields: RXN_SEARCH_FIELDS,
        ...opts,
    });
    res.docs.forEach((doc) => {
        if (doc.is_obsolete === '1') {
            doc.status += ' (and is obsolete)';
        }
    });
    return res;
}

/**
 * Explicit modelseed-api compounds query path.
 * Use this only when intentionally targeting the REST backend.
 */
export async function getCompoundsFromModelseedApi(
    opts: SolrQueryOpts = {}
): Promise<SolrResponse<Compound>> {
    return fetchModelseedApiBiochem<Compound>('compounds', {
        limit: 25,
        offset: 0,
        sort: { field: 'id' },
        searchFields: CPD_SEARCH_FIELDS,
        ...opts,
    });
}

/**
 * Fetch a specific reaction by its ModelSEED ID.
 * 
 * @param id - Reaction ID (e.g., 'rxn00001')
 * @returns Promise resolving to Reaction object
 * @throws {Error} When reaction is not found or request fails
 * 
 * @example
 * ```typescript
 * const reaction = await getReactionById('rxn00001');
 * console.log(reaction.name, reaction.definition);
 * ```
 */
export async function getReactionById(id: string): Promise<Reaction> {
    // Keep detail lookups on legacy Solr until modelseed-api exposes an ID endpoint.
    const url = `${SOLR_BASE_LEGACY}${SOLR_REACTIONS_COLLECTION}/select?wt=json&q=id:${id}`;
    const res = await fetchSolr<Reaction>(url);
    return res.docs[0];
}

/**
 * Fetch a specific compound by its ModelSEED ID.
 * 
 * @param id - Compound ID (e.g., 'cpd00001')
 * @returns Promise resolving to Compound object
 * @throws {Error} When compound is not found or request fails
 * 
 * @example
 * ```typescript
 * const compound = await getCompoundById('cpd00001');
 * console.log(compound.name, compound.formula, compound.charge);
 * ```
 */
export async function getCompoundById(id: string): Promise<Compound> {
    // Keep detail lookups on legacy Solr until modelseed-api exposes an ID endpoint.
    const url = `${SOLR_BASE_LEGACY}${SOLR_COMPOUNDS_COLLECTION}/select?wt=json&q=id:${id}`;
    const res = await fetchSolr<Compound>(url);
    return res.docs[0];
}

/**
 * Fetch multiple compounds by their IDs in a single query.
 * 
 * Optimized batch fetch that retrieves multiple compounds at once.
 * Returns a map for easy lookup by compound ID.
 * 
 * @param ids - Array of compound IDs
 * @returns Promise resolving to Map of compound ID to Compound object
 * 
 * @example
 * ```typescript
 * const compounds = await getCompoundsByIds(['cpd00001', 'cpd00002', 'cpd00003']);
 * const atp = compounds.get('cpd00002');
 * if (atp) console.log(atp.name); // 'ATP'
 * ```
 */
export async function getCompoundsByIds(ids: string[]): Promise<Map<string, Compound>> {
    return getCompoundsByIdsWithFields(ids, ['id', 'name', 'formula', 'charge', 'mass']);
}

/**
 * Fetch compound data for reaction structure display.
 *
 * Retrieves the full set of fields needed to render compound structures
 * and tooltips in the ReactionStructureEquation component, including
 * smiles (for RDKit.js rendering), aliases (for tooltip synonyms), and
 * inchikey.
 */
export async function getCompoundsForReaction(ids: string[]): Promise<Map<string, Compound>> {
    return getCompoundsByIdsWithFields(ids, ['id', 'name', 'formula', 'charge', 'smiles', 'inchikey', 'aliases']);
}

function getCompoundsByIdsWithFields(ids: string[], fields: string[]): Promise<Map<string, Compound>> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return Promise.resolve(new Map());

    const idQuery = uniqueIds.map((id) => `id:${id}`).join(' OR ');
    const fl = fields.join(',');
    // Batch ID fetch is currently Solr-backed for both modes.
    const url = `${SOLR_BASE_LEGACY}${SOLR_COMPOUNDS_COLLECTION}/select?wt=json&q=(${idQuery})&rows=${uniqueIds.length}&fl=${fl}`;

    return fetchSolr<Compound>(url).then((res) => {
        const map = new Map<string, Compound>();
        for (const doc of res.docs) {
            map.set(doc.id, doc);
        }
        return map;
    });
}

/**
 * Find reactions containing a given compound.
 * 
 * Searches for reactions where the specified compound appears as a reactant
 * or product. Useful for exploring compound participation in metabolism.
 * 
 * @param cpdId - Compound ID to search for
 * @param opts - Query options (limit, offset, sort)
 * @returns Promise resolving to paginated reaction results
 * 
 * @example
 * ```typescript
 * const reactions = await findReactionsForCompound('cpd00002'); // Find reactions using ATP
 * console.log(`ATP participates in ${reactions.numFound} reactions`);
 * ```
 */
export async function findReactionsForCompound(
    cpdId: string,
    opts: SolrQueryOpts = {},
): Promise<SolrResponse<Reaction>> {
    const limit = opts.limit ?? 25;
    const offset = opts.offset ?? 0;
    const sort = opts.sort;

    // Reverse compound lookup remains Solr-backed for now.
    let url = `${SOLR_BASE_LEGACY}${SOLR_REACTIONS_COLLECTION}/select?wt=json&q=equation:*${cpdId}*&fl=*`;
    if (limit) url += `&rows=${limit}`;
    if (offset) url += `&start=${offset}`;
    if (sort) {
        const dir = sort.desc ? 'desc' : 'asc';
        url += `&sort=${sort.field} ${dir}`;
    }

    return fetchSolr<Reaction>(url);
}

/**
 * Get compound structure image URL.
 * 
 * Returns the URL for a pre-rendered PNG image of the compound structure.
 * Note: Not all compounds have images (will return 404 if missing).
 * 
 * @param id - Compound ID
 * @returns URL string for compound image
 * 
 * @example
 * ```typescript
 * const imageUrl = getCompoundImageUrl('cpd00001');
 * // Use with error handling: <img src={imageUrl} onError={handleMissingImage} />
 * ```
 */
export function getCompoundImageUrl(id: string): string {
    return `${CPD_IMG_BASE}${id}.png`;
}
