/**
 * Model TSV Export Utilities
 *
 * Derives tab-separated reaction and compound tables from a ModelSEED
 * `format=json` model export. The ModelSEED backend does not support a
 * `format=tsv` export (see `/api/models/export` OpenAPI spec: only
 * `json | sbml | cobrapy` are supported), so these tables are built
 * client-side from the JSON export instead.
 */

import { objectsToCsv } from '@/lib/utils/exportCsv';

export interface ModelExportCompound {
    id?: string | null;
    name?: string | null;
    formula?: string | null;
    charge?: number | null;
}

export interface ModelExportPathway {
    source?: string | null;
    id?: string | null;
    name?: string | null;
}

export interface ModelExportReaction {
    id?: string | null;
    name?: string | null;
    direction?: string | null;
    equation?: string | null;
    gpr?: string | null;
    genes?: string[] | null;
    pathways?: ModelExportPathway[] | null;
}

export interface ModelExportJson {
    compounds?: ModelExportCompound[] | null;
    reactions?: ModelExportReaction[] | null;
}

/**
 * Derive the compartment suffix from a ModelSEED id, e.g. "cpd00443_c0" -> "c0".
 * Returns '' when the id has no compartment suffix or is missing.
 */
export function compartmentFromId(id: string | null | undefined): string {
    if (!id) return '';
    const match = id.match(/_([a-z]+\d*)$/);
    return match ? match[1] : '';
}

function pathwaysToCell(pathways: ModelExportPathway[] | null | undefined): string {
    if (!pathways || pathways.length === 0) return '';
    const labels = pathways.map((pathway) => pathway.name || pathway.id || '');
    const unique = Array.from(new Set(labels.filter((label) => label !== '')));
    return unique.join('|');
}

/** Throws Error('This model has no compounds to export.') when compounds is missing/empty. */
export function buildCompoundsTsv(model: ModelExportJson): string {
    const compounds = model.compounds;
    if (!compounds || compounds.length === 0) {
        throw new Error('This model has no compounds to export.');
    }

    const rows = compounds.map((compound) => ({
        id: compound.id,
        name: compound.name,
        formula: compound.formula,
        charge: compound.charge,
        compartment: compartmentFromId(compound.id),
    }));

    return objectsToCsv(rows, {
        columns: ['id', 'name', 'formula', 'charge', 'compartment'],
        delimiter: '\t',
    });
}

/** Throws Error('This model has no reactions to export.') when reactions is missing/empty. */
export function buildReactionsTsv(model: ModelExportJson): string {
    const reactions = model.reactions;
    if (!reactions || reactions.length === 0) {
        throw new Error('This model has no reactions to export.');
    }

    const rows = reactions.map((reaction) => ({
        id: reaction.id,
        direction: reaction.direction,
        compartment: compartmentFromId(reaction.id),
        gpr: reaction.gpr,
        name: reaction.name,
        equation: reaction.equation,
        pathways: pathwaysToCell(reaction.pathways),
    }));

    return objectsToCsv(rows, {
        columns: ['id', 'direction', 'compartment', 'gpr', 'name', 'equation', 'pathways'],
        delimiter: '\t',
    });
}
