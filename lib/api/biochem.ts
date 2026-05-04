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

import { SOLR_BASE, SOLR_BASE_LEGACY, CPD_IMG_BASE, MODELSEED_API_URL } from './config';

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
    const wildcardValue = toSolrWildcardToken(value);
    const literalValue = toSolrLiteral(value);
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
            return `${field}:${literalValue}`;
        case '!=':
        case 'not':
        case 'doesNotEqual':
            return `-${field}:${literalValue}`;
        case 'startsWith':
            return wildcardValue ? `${field}:${wildcardValue}*` : null;
        case 'endsWith':
            return wildcardValue ? `${field}:*${wildcardValue}` : null;
        case 'doesNotContain':
            return wildcardValue ? `-${field}:*${wildcardValue}*` : null;
        case 'isAnyOf': {
            const values = Array.isArray(rawValue)
                ? rawValue.map((entry) => normalizeFilterValue(entry)).filter(Boolean)
                : value
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean);
            if (values.length === 0) return null;
            return `(${values.map((entry) => `${field}:${toSolrLiteral(entry)}`).join(' OR ')})`;
        }
        case 'contains':
        default:
            return wildcardValue ? `${field}:*${wildcardValue}*` : null;
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
    let url = `${SOLR_BASE}${collection}_staging/select?wt=json`;

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

    const filterClauses = (filterModel?.items ?? [])
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
    if (!res.ok) throw new Error(`Solr request failed: ${res.status}`);
    const json = await res.json();
    return json.response as SolrResponse<T>;
}

/**
 * Explicit REST fetcher for modelseed-api biochemistry endpoints.
 * Note: reaction/compound pages are pinned to legacy Solr; this is for
 * other consumers that intentionally target modelseed-api.
 */
async function fetchModelseedApiBiochem<T>(
    endpoint: string,
    opts: SolrQueryOpts = {}
): Promise<SolrResponse<T>> {
    const { query, limit = 25, offset = 0, filterModel, sort } = opts;

    let activeSearch = query;
    if (!activeSearch && filterModel?.quickFilterValues && filterModel.quickFilterValues.length > 0) {
        activeSearch = filterModel.quickFilterValues
            .map((v) => String(v).trim())
            .filter(Boolean)
            .join(' ');
    }

    const hasColumnFilters = (filterModel?.items?.length ?? 0) > 0;
    const needsLocalTransforms = hasColumnFilters || Boolean(sort);
    const fetchLimit = needsLocalTransforms ? Math.max(limit + offset, 1000) : limit;

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

    const filteredDocs = hasColumnFilters
        ? rawDocs.filter((doc) => matchesFilterModel(doc as Record<string, unknown>, filterModel?.items ?? []))
        : rawDocs;
    const sortedDocs = sort ? sortDocs(filteredDocs, sort) : filteredDocs;
    const pagedDocs = sortedDocs.slice(offset, offset + limit);

    return {
        numFound: sortedDocs.length,
        start: offset,
        docs: pagedDocs,
    };
}

function normalizeFieldValue(value: unknown): string {
    if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join(' ');
    if (value == null) return '';
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

function matchesFilterItem(doc: Record<string, unknown>, item: GridFilterItem): boolean {
    const operator = String(item.operator ?? '');
    const field = toSolrField(String(item.field ?? ''));
    if (!field || !operator) return true;

    const rawField = doc[field];
    const fieldValue = normalizeFieldValue(rawField);
    const value = normalizeFilterValue(item.value);

    if (operator === 'isEmpty') return fieldValue.trim().length === 0;
    if (operator === 'isNotEmpty') return fieldValue.trim().length > 0;
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

    return compareStringByOperator(fieldValue, operator, value);
}

function matchesFilterModel(doc: Record<string, unknown>, items: GridFilterItem[]): boolean {
    const activeItems = items.filter((item) => item.field && item.operator);
    if (activeItems.length === 0) return true;
    return activeItems.every((item) => matchesFilterItem(doc, item));
}

function sortDocs<T>(docs: T[], sort: { field: string; desc?: boolean }): T[] {
    const { field, desc } = sort;
    const direction = desc ? -1 : 1;
    return [...docs].sort((a, b) => {
        const av = (a as Record<string, unknown>)[field];
        const bv = (b as Record<string, unknown>)[field];
        const aNum = Number(av);
        const bNum = Number(bv);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
            return direction * (aNum - bNum);
        }
        return direction * normalizeFieldValue(av).localeCompare(normalizeFieldValue(bv));
    });
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

/** Compound search fields matching legacy `cpd_sFields`. */
const CPD_SEARCH_FIELDS = ['id', 'name', 'formula', 'synonyms', 'aliases', 'ontology'];

/** Compound visible fields matching legacy `cpdOpts.visible`. */
const CPD_VISIBLE = [
    'name', 'id', 'formula', 'mass', 'abbreviation', 'deltag', 'deltagerr',
    'charge', 'aliases', 'ontology',
];

/* ─── Public API ─────────────────────────────────────────────── */

/**
 * Search and retrieve biochemical reactions.
 * 
 * Queries the ModelSEED biochemistry database for reactions with support for
 * advanced filtering, pagination, and sorting. Routes to either legacy Solr
 * or new REST API based on configuration.
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
 * with pagination, filtering, and sorting support.
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
    const res = await fetchModelseedApiBiochem<Reaction>('reactions', opts);
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
    return fetchModelseedApiBiochem<Compound>('compounds', opts);
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
    const url = `${SOLR_BASE_LEGACY}reactions_staging/select?wt=json&q=id:${id}`;
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
    const url = `${SOLR_BASE_LEGACY}compounds_staging/select?wt=json&q=id:${id}`;
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
    const url = `${SOLR_BASE_LEGACY}compounds_staging/select?wt=json&q=(${idQuery})&rows=${uniqueIds.length}&fl=${fl}`;

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
    let url = `${SOLR_BASE_LEGACY}reactions_staging/select?wt=json&q=equation:*${cpdId}*&fl=*`;
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
