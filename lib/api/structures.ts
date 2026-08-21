import { SOLR_BASE_LEGACY, SOLR_STRUCTURES_COLLECTION } from './config';

export interface CompoundStructure {
    id: string;
    smiles?: string;
    inchi?: string;
    inchikey?: string;
    svg?: string;
}

type SolrStructureResponse = {
    response?: {
        docs?: unknown;
    };
};

const CHUNK_SIZE = 100;

function nonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}

function normalizeStructure(doc: unknown, requestedIds: Set<string>): CompoundStructure | undefined {
    if (!doc || typeof doc !== 'object') return undefined;

    const values = doc as Record<string, unknown>;
    const id = nonEmptyString(values.id);
    if (!id || !requestedIds.has(id)) return undefined;

    const inchi = nonEmptyString(values.inchi);
    const svg = nonEmptyString(values.svg);

    return {
        id,
        ...(nonEmptyString(values.smiles) ? { smiles: nonEmptyString(values.smiles) } : {}),
        ...(inchi?.startsWith('InChI=') ? { inchi } : {}),
        ...(nonEmptyString(values.inchikey) ? { inchikey: nonEmptyString(values.inchikey) } : {}),
        ...(svg?.includes('<svg') ? { svg } : {}),
    };
}

async function fetchStructureChunk(ids: string[]): Promise<unknown> {
    const idQuery = ids.map((id) => `id:${id}`).join(' OR ');
    const url = `${SOLR_BASE_LEGACY}${SOLR_STRUCTURES_COLLECTION}/select?wt=json&q=(${idQuery})&rows=${ids.length}&fl=id,smiles,inchi,inchikey,svg`;
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return response.json();
}

export async function getStructuresByIds(ids: string[]): Promise<Map<string, CompoundStructure>> {
    const uniqueIds = Array.from(new Set(
        (Array.isArray(ids) ? ids : [])
            .filter((id): id is string => typeof id === 'string')
            .map((id) => id.trim())
            .filter(Boolean),
    ));
    const structures = new Map<string, CompoundStructure>();
    if (uniqueIds.length === 0) return structures;

    const requestedIds = new Set(uniqueIds);
    for (let index = 0; index < uniqueIds.length; index += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(index, index + CHUNK_SIZE);
        try {
            const body = await fetchStructureChunk(chunk) as SolrStructureResponse;
            if (!Array.isArray(body?.response?.docs)) continue;
            for (const doc of body.response.docs) {
                const structure = normalizeStructure(doc, requestedIds);
                if (structure && !structures.has(structure.id)) {
                    structures.set(structure.id, structure);
                }
            }
        } catch {
            // Structures are optional; a failed chunk contributes no entries.
        }
    }

    return structures;
}
