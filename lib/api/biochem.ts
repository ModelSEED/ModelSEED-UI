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

import { SOLR_BASE, CPD_IMG_BASE, MODELSEED_API_URL } from './config';

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

    // Query construction (ported from legacy + updated for DataGrid FilterModel)
    const filters: string[] = [];

    // Parse DataGrid advanced filter model
    if (filterModel && filterModel.items.length > 0) {
        for (const item of filterModel.items) {
            if ((item.value == null || item.value === '') && item.operator !== 'isEmpty' && item.operator !== 'isNotEmpty') {
                continue;
            }

            const field = item.field === 'synonyms' ? 'aliases' : item.field;
            let val = '';
            if (item.value != null) {
                val = String(item.value).replace(/'/g, "'").replace(/[;,:"'+.\-]/g, '');
            }

            switch (item.operator) {
                case '>':
                    filters.push(`${field}:{${val} TO *]`);
                    break;
                case '>=':
                    filters.push(`${field}:[${val} TO *]`);
                    break;
                case '<':
                    filters.push(`${field}:[* TO ${val}}`);
                    break;
                case '<=':
                    filters.push(`${field}:[* TO ${val}]`);
                    break;
                case 'isEmpty':
                    filters.push(`-${field}:[* TO *]`);
                    break;
                case 'isNotEmpty':
                    filters.push(`${field}:[* TO *]`);
                    break;
                case '=':
                case 'equals':
                case 'is':
                    filters.push(`${field}:"${val}"`);
                    break;
                case '!=':
                case 'not':
                    filters.push(`-${field}:"${val}"`);
                    break;
                case 'startsWith':
                    filters.push(`${field}:(${val}*)`);
                    break;
                case 'endsWith':
                    filters.push(`${field}:(*${val})`);
                    break;
                case 'isAnyOf':
                    if (Array.isArray(item.value)) {
                        const anyOf = item.value.map(v => `${field}:"${String(v).replace(/"/g, '')}"`);
                        if (anyOf.length > 0) {
                            filters.push(`(${anyOf.join(' OR ')})`);
                        }
                    }
                    break;
                default:
                    // default contains
                    filters.push(`${field}:(*${val}*)`);
            }
        }
    }

    if (queryColumn) {
        for (const field in queryColumn) {
            let val = queryColumn[field];
            val = val.replace(/'/g, "'");
            val = val.replace(/[;,:"'+.\-]/g, '');
            const solrField = field === 'synonyms' ? 'aliases' : field;
            filters.push(`${solrField}:(*${val}*)`);
        }
    }

    let mainQueryStr = '';
    const activeQuery = query || (filterModel && filterModel.quickFilterValues && filterModel.quickFilterValues.length > 0 ? filterModel.quickFilterValues.join(' ') : null);

    // Handle special "match all" case - don't wrap with wildcards
    if (activeQuery === '*' || activeQuery === '*:*') {
        mainQueryStr = '*';
    } else if (activeQuery && searchFields && searchFields.length > 0) {
        const cleanQuery = sanitizeQuery(activeQuery);
        // Skip if query is empty after sanitization
        if (cleanQuery.length === 0) {
            mainQueryStr = '*';
        } else if (cleanQuery.length < 3) {
            // For short queries, do exact prefix match without wildcards
            const searchFilters = searchFields.map((f) => {
                const solrField = f === 'synonyms' ? 'aliases' : f;
                return `${solrField}:${cleanQuery}*`;
            });
            mainQueryStr = `(${searchFilters.join(' OR ')})`;
        } else {
            const searchFilters = searchFields.map((f) => {
                const solrField = f === 'synonyms' ? 'aliases' : f;
                return `${solrField}:*${cleanQuery}*`;
            });
            mainQueryStr = `(${searchFilters.join(' OR ')})`;
        }
    } else if (activeQuery) {
        const cleanQuery = sanitizeQuery(activeQuery);
        // Skip if query is empty after sanitization
        if (cleanQuery.length === 0) {
            mainQueryStr = '*';
        } else if (cleanQuery.length < 3) {
            mainQueryStr = `${cleanQuery}*`;
        } else {
            mainQueryStr = `*${cleanQuery}*`;
        }
    }

    if (filters.length > 0 && mainQueryStr) {
        url += `&q=(${mainQueryStr}) AND ${filters.join(' AND ')}`;
    } else if (filters.length > 0) {
        url += `&q=${filters.join(' AND ')}`;
    } else if (mainQueryStr !== '') {
        url += `&q=${mainQueryStr}`;
    } else {
        url += `&q=*`;
    }

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

/**
 * Sanitize user input for Solr query syntax.
 * 
 * Removes special characters and handles whitespace for safe Solr queries.
 * Mirrors legacy sanitization logic for backward compatibility.
 * 
 * @param query - Raw user input string
 * @returns Sanitized query string safe for Solr
 */
function sanitizeQuery(query: string): string {
    let q = query.trim();
    q = q.replace(/'/g, "'");
    q = q.replace(/[;,:"'+.\-]/g, '');
    if (q.includes(' ') || q.includes('%20')) {
        q = q.replace(/%20/g, '*').replace(/\s/g, '*');
    }
    return q;
}

/* ─── Fetcher ────────────────────────────────────────────────── */

async function fetchSolr<T>(url: string): Promise<SolrResponse<T>> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Solr request failed: ${res.status}`);
    const json = await res.json();
    return json.response as SolrResponse<T>;
}

/**
 * Fetcher for the new modelseed-api (Poplar) REST biochemistry endpoints.
 * Currently limited to simple query-based search.
 */
async function fetchModelseedApiBiochem<T>(
    endpoint: string,
    opts: SolrQueryOpts = {}
): Promise<SolrResponse<T>> {
    const { query, limit = 25, offset = 0, filterModel } = opts;
    const baseUrl = `${MODELSEED_API_URL}/api/biochem/${endpoint}`;

    // Map SolrQueryOpts to REST params
    // Note: Poplar currently only supports simple 'query' and 'limit'
    let activeQuery = query;
    if (!activeQuery && filterModel?.quickFilterValues?.[0]) {
        activeQuery = String(filterModel.quickFilterValues[0]);
    }

    let url = `${baseUrl}?limit=${limit}`;
    if (activeQuery) {
        url = `${MODELSEED_API_URL}/api/biochem/search?query=${encodeURIComponent(activeQuery)}&limit=${limit}&type=${endpoint}`;
    } else {
        // Poplar doesn't have a broad "list all" without IDs yet, 
        // fallback to search with empty or universal query if possible, or just return empty
        url = `${baseUrl}?limit=${limit}`; 
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`modelseed-api request failed: ${res.status}`);
    const data = await res.json();

    // Map REST array response to SolrResponse format for compatibility
    return {
        numFound: data.length, // REST API doesn't return total count yet
        start: offset,
        docs: data as T[],
    };
}

/* ─── Constants ──────────────────────────────────────────────── */

/** Field name mapping: UI uses 'synonyms' but Solr uses 'aliases'. */
const SYNONYM_FIELD_ALIAS = 'aliases';

/** Minimum query length for wildcard search (shorter queries use prefix match). */
const MIN_WILDCARD_QUERY_LENGTH = 3;

/** Reaction search fields matching legacy `rxn_sFields`. */
const RXN_SEARCH_FIELDS = ['id', 'name', 'status', 'ecs', 'synonyms', 'aliases', 'pathways', 'stoichiometry', 'notes'];

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

    if (SOLR_BASE.includes('/api/')) {
        const res = await fetchModelseedApiBiochem<Reaction>('reactions', mergedOpts);
        res.docs.forEach((doc) => {
            if (doc.is_obsolete === '1') {
                doc.status += ' (and is obsolete)';
            }
        });
        return res;
    }

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

    if (SOLR_BASE.includes('/api/')) {
        return fetchModelseedApiBiochem<Compound>('compounds', mergedOpts);
    }

    const url = buildSolrUrl('compounds', mergedOpts);
    return fetchSolr<Compound>(url);
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
    const url = `${SOLR_BASE}reactions_staging/select?wt=json&q=id:${id}`;
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
    const url = `${SOLR_BASE}compounds_staging/select?wt=json&q=id:${id}`;
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
    const url = `${SOLR_BASE}compounds_staging/select?wt=json&q=(${idQuery})&rows=${uniqueIds.length}&fl=${fl}`;

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

    let url = `${SOLR_BASE}reactions_staging/select?wt=json&q=equation:*${cpdId}*&fl=*`;
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
