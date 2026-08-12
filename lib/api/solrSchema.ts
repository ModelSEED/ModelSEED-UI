/**
 * Solr-9 nested-schema detection for the biochem reactions/compounds
 * collections.
 *
 * Legacy Solr indexes reactions/compounds as flat documents. The Solr-9
 * index nests child rows (e.g. per-alias, per-structure) under a parent
 * document, so list queries must add a `doc_type:*` filter to avoid
 * returning child rows alongside parents. Detection is a cheap one-time
 * probe per collection, cached for the process lifetime, with a manual
 * override for deployments that already know their schema.
 */

import { getSolrCollection, SOLR_BASE, SOLR_NESTED_SCHEMA_OVERRIDE } from './config';

export type BiochemCollection = 'reactions' | 'compounds';

/**
 * Solr filter query that restricts results to top-level (parent) documents
 * on the Solr-9 nested schema.
 */
export function parentDocTypeFilter(collection: BiochemCollection): string {
    return collection === 'reactions' ? 'doc_type:reaction' : 'doc_type:compound';
}

const schemaCache = new Map<BiochemCollection, Promise<boolean>>();
let hasWarnedOnProbeFailure = false;

async function probeNestedSchema(collection: BiochemCollection): Promise<boolean> {
    try {
        const url = `${SOLR_BASE}${getSolrCollection(collection)}/select?wt=json&rows=0&q=*:*&fq=${encodeURIComponent(parentDocTypeFilter(collection))}`;
        const res = await fetch(url);
        if (!res.ok) return false;
        const json = await res.json();
        const numFound = json?.response?.numFound ?? 0;
        return numFound > 0;
    } catch (err) {
        if (!hasWarnedOnProbeFailure) {
            hasWarnedOnProbeFailure = true;
            console.warn('Solr nested-schema probe failed; assuming legacy schema.', err);
        }
        return false;
    }
}

/**
 * Resolves whether `collection` uses the Solr-9 nested-document schema.
 * Honors `SOLR_NESTED_SCHEMA_OVERRIDE` when set (no network call). Otherwise
 * probes once per collection and caches the result (including concurrent
 * in-flight callers) for the process lifetime. Never rejects.
 */
export async function hasNestedSchema(collection: BiochemCollection): Promise<boolean> {
    if (SOLR_NESTED_SCHEMA_OVERRIDE !== null) {
        return SOLR_NESTED_SCHEMA_OVERRIDE;
    }

    const cached = schemaCache.get(collection);
    if (cached) return cached;

    const probe = probeNestedSchema(collection);
    schemaCache.set(collection, probe);
    return probe;
}

/**
 * Test-only reset of the module-level probe cache.
 */
export function resetSolrSchemaCache(): void {
    schemaCache.clear();
    hasWarnedOnProbeFailure = false;
}
