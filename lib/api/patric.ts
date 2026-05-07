import { withRawTokenAuth } from './requestAuth';

/**
 * BV-BRC / PATRIC genome search API client.
 * 
 * Provides search capabilities for the BV-BRC genome database with built-in
 * error handling and retry logic for backend compatibility issues.
 */

const PATRIC_GENOME_API_URL = 'https://www.patricbrc.org/api/genome/';

export interface PatricGenome {
    genome_id: string;
    genome_name: string;
    scientific_name?: string;
    genome_status?: string;
    taxon_id?: string;
}

export interface SearchPatricGenomesParams {
    query?: string;
    limit?: number;
    offset?: number;
    sort?: string;
}

export interface PatricGenomeSearchResult {
    rows: PatricGenome[];
    total: number;
}

interface RawPatricResponse {
    response?: {
        numFound?: number;
        docs?: Record<string, unknown>[];
    };
    docs?: Record<string, unknown>[];
}

/**
 * Build RQL search clause from user query string.
 * 
 * Converts user search terms into BV-BRC RQL format. Single terms search by
 * genome_name prefix or exact genome_id. Multiple terms use AND logic.
 * 
 * @param query - User search string
 * @returns RQL search clause or null if query is empty
 */
function buildSearchClause(query: string): string | null {
    const terms = query
        .trim()
        .split(/\s+/)
        .map((term) => term.trim().replace(/[^A-Za-z0-9_.-]/g, ''))
        .filter(Boolean);

    if (terms.length === 0) return null;

    if (terms.length === 1) {
        const term = terms[0];
        return `or(eq(genome_name,${term}*),eq(genome_id,${term}))`;
    }

    const allNameMatches = terms.map((term) => `eq(genome_name,${term}*)`).join(',');
    return `and(${allNameMatches})`;
}

/**
 * Map raw BV-BRC API response document to typed PatricGenome.
 * 
 * @param doc - Raw document from BV-BRC API
 * @returns Typed PatricGenome object
 */
function mapPatricGenome(doc: Record<string, unknown>): PatricGenome {
    const genomeId = String(doc.genome_id ?? '');
    const genomeName = String(doc.genome_name ?? '');
    return {
        genome_id: genomeId,
        genome_name: genomeName,
        scientific_name: doc.scientific_name ? String(doc.scientific_name) : undefined,
        genome_status: doc.genome_status ? String(doc.genome_status) : undefined,
        taxon_id: doc.taxon_id ? String(doc.taxon_id) : undefined,
    };
}

/**
 * Search the BV-BRC genome database.
 * 
 * Queries the BV-BRC genome API with pagination and sorting support. Includes
 * automatic retry logic for known backend configuration issues (signingSubjectURL error).
 * 
 * @param params - Search parameters (query, limit, offset, sort)
 * @returns Promise resolving to search results with rows and total count
 * @throws {Error} When search fails after retry attempts
 * 
 * @example
 * ```typescript
 * const results = await searchPatricGenomes({
 *   query: 'Escherichia coli',
 *   limit: 25,
 *   offset: 0,
 *   sort: '+genome_name'
 * });
 * console.log(`Found ${results.total} genomes`);
 * results.rows.forEach(genome => {
 *   console.log(`${genome.genome_name} (${genome.genome_id})`);
 * });
 * ```
 */
export async function searchPatricGenomes(
    params: SearchPatricGenomesParams = {},
): Promise<PatricGenomeSearchResult> {
    const {
        query = '',
        limit = 25,
        offset = 0,
        sort = '+genome_name',
    } = params;

    const rqlParts: string[] = [
        `limit(${Math.max(1, limit)},${Math.max(0, offset)})`,
        `sort(${sort})`,
        'select(genome_id,genome_name,scientific_name,genome_status,taxon_id)',
    ];

    const searchClause = buildSearchClause(query);
    if (searchClause) {
        rqlParts.push(searchClause);
    } else {
        // BV-BRC genome endpoint expects an explicit keyword query when no
        // user-entered search terms are present.
        rqlParts.push('keyword(*)');
    }

    // BV-BRC's RQL parser expects structural characters (commas, parentheses)
    // to be unencoded. RQL parts only contain safe characters (alphanumerics,
    // parens, commas, +, *, _, .) so they can be passed directly.
    const queryString = `http_accept=${encodeURIComponent('application/solr+json')}&${rqlParts.join('&')}`;
    const url = `${PATRIC_GENOME_API_URL}?${queryString}`;

    const doFetch = async (useAuth: boolean): Promise<Response> => {
        const baseHeaders: Record<string, string> = { Accept: 'application/json' };
        const headers = useAuth ? withRawTokenAuth(baseHeaders, true) : baseHeaders;
        return fetch(url, { headers });
    };

    let response = await doFetch(true);
    let body = '';

    if (!response.ok) {
        body = await response.text().catch(() => '');

        // Some BV-BRC deployments are misconfigured and throw a 500 with
        // "signingSubjectURL is not defined" when an Authorization header
        // is present. In that case, retry once without auth so that public
        // genome search still works for the UI instead of hard-failing.
        if (
            response.status === 500
            && body.includes('signingSubjectURL is not defined')
        ) {
            console.warn(
                'PATRIC genome search: backend returned signingSubjectURL error; retrying without Authorization header.',
            );
            response = await doFetch(false);
            body = await response.text().catch(() => '');
        }
    }

    if (!response.ok) {
        throw new Error(
            `PATRIC genome search failed (${response.status}): ${body || response.statusText}`,
        );
    }

    let data: RawPatricResponse;
    try {
        data = (JSON.parse(body || (await response.text())) ?? {}) as RawPatricResponse;
    } catch (error) {
        throw new Error(
            `Failed to parse PATRIC genome response: ${
                error instanceof Error ? error.message : 'unknown error'
            }`,
        );
    }

    const docs = data.response?.docs ?? data.docs ?? [];
    const rows = docs
        .filter((doc): doc is Record<string, unknown> => doc != null && typeof doc === 'object')
        .map(mapPatricGenome)
        .filter((row) => row.genome_id.length > 0);
    const total = typeof data.response?.numFound === 'number' ? data.response.numFound : rows.length;

    return { rows, total };
}
