/**
 * Classifies direction agreement using these rules:
 * RULE 1: if distinct.size === 1 return 'agree'.
 * RULE 3: else if some distinct value includes '>' AND some distinct value includes '<', return 'disagree'.
 * RULE 2: otherwise return 'could-agree'.
 *
 * The `operator` values observed in the live Solr index are the single
 * characters '=', '>', '<'.
 */

export type DirectionAgreement = 'agree' | 'could-agree' | 'disagree';

export function classifyDirectionAgreement(
    directions: readonly (string | undefined | null)[],
): DirectionAgreement | null {
    const values = directions
        .filter((direction): direction is string => typeof direction === 'string')
        .map((direction) => direction.trim())
        .filter(Boolean);

    if (values.length === 0) return null;

    const distinct = new Set(values);
    if (distinct.size === 1) return 'agree';

    if (
        values.some((v) => v.includes('>')) &&
        values.some((v) => v.includes('<'))
    ) {
        return 'disagree';
    }

    return 'could-agree';
}

export function directionAgreementFromRecords(
    records: readonly { operator?: string }[] | undefined | null,
): DirectionAgreement | null {
    return classifyDirectionAgreement((records ?? []).map((r) => r.operator));
}

export const DIRECTION_AGREEMENT_LABEL: Record<DirectionAgreement, string> = {
    agree: 'Sources agree on direction',
    'could-agree': 'Sources could agree on direction',
    disagree: 'Sources disagree on direction',
};

export const DIRECTION_AGREEMENT_COLOR: Record<
    DirectionAgreement,
    'success' | 'info' | 'warning'
> = {
    agree: 'success',
    'could-agree': 'info',
    disagree: 'warning',
};
