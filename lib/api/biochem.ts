/**
 * Biochemistry Solr API Utility
 *
 * Modern TypeScript port of the legacy AngularJS `Biochem` service
 * (external/ModelSEED-UI/app/services/biochem.js).
 *
 * Queries the ModelSEED Solr staging endpoint directly.
 */

const SOLR_BASE = 'https://modelseed.org/solr/';
const CPD_IMG_BASE = 'https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/';

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
    } = opts;

    // Field list
    if (visible.length > 0) {
        url += `&fl=${visible.join(',')}`;
    }

    // Query construction (ported from legacy)
    if (query || queryColumn) {
        if (queryColumn) {
            const filters: string[] = [];
            for (const field in queryColumn) {
                let val = queryColumn[field];
                val = val.replace(/'/g, "'");
                val = val.replace(/[;,:"'+.\-]/g, '');
                const solrField = field === 'synonyms' ? 'aliases' : field;
                filters.push(`${solrField}:(*${val}*)`);
            }
            url += `&q=${filters.join(' AND ')}`;
        } else if (query && searchFields && searchFields.length > 0) {
            const cleanQuery = sanitizeQuery(query);
            const filters = searchFields.map((f) => {
                const solrField = f === 'synonyms' ? 'aliases' : f;
                return `${solrField}:(*${cleanQuery}*)`;
            });
            url += `&q=${filters.join(' OR ')}`;
        } else if (query) {
            const cleanQuery = sanitizeQuery(query);
            url += `&q=*${cleanQuery}*`;
        }
    } else {
        url += '&q=*';
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

/** Sanitize user input for Solr query (mirrors legacy logic). */
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

/* ─── Public API ─────────────────────────────────────────────── */

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

export async function getReactions(opts: SolrQueryOpts = {}): Promise<SolrResponse<Reaction>> {
    const mergedOpts: SolrQueryOpts = {
        limit: 25,
        offset: 0,
        sort: { field: 'id' },
        searchFields: RXN_SEARCH_FIELDS,
        visible: RXN_VISIBLE,
        ...opts,
    };
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

export async function getCompounds(opts: SolrQueryOpts = {}): Promise<SolrResponse<Compound>> {
    const mergedOpts: SolrQueryOpts = {
        limit: 25,
        offset: 0,
        sort: { field: 'id' },
        searchFields: CPD_SEARCH_FIELDS,
        visible: CPD_VISIBLE,
        ...opts,
    };
    const url = buildSolrUrl('compounds', mergedOpts);
    return fetchSolr<Compound>(url);
}

export async function getReactionById(id: string): Promise<Reaction> {
    const url = `${SOLR_BASE}reactions_staging/select?wt=json&q=id:${id}`;
    const res = await fetchSolr<Reaction>(url);
    return res.docs[0];
}

export async function getCompoundById(id: string): Promise<Compound> {
    const url = `${SOLR_BASE}compounds_staging/select?wt=json&q=id:${id}`;
    const res = await fetchSolr<Compound>(url);
    return res.docs[0];
}

/**
 * Find reactions containing a given compound.
 * Mirrors legacy `findReactions_solr`.
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

/** Get compound image path (mirrors legacy `getImagePath`). */
export function getCompoundImageUrl(id: string): string {
    return `${CPD_IMG_BASE}${id}.png`;
}
