/**
 * Humanize Celery/Workspace error messages surfaced by the modelseed_api backend
 * so users see actionable wording instead of raw exception text.
 *
 * Two forms are handled:
 *  - Legacy form (older job records, pre-2026-06): `_ERROR_Object not found!_ERROR_`
 *    — the inscrutable PATRIC workspace internal error.
 *  - New form (after José's backend change): `No model found at '<path>'. Check that
 *    your reconstruct job completed successfully and saved a model to this path,
 *    or pass a different ref.` — already user-readable, passed through unchanged.
 *
 * @param raw - Raw error string from `job.error` / submission rejection
 * @param modelRef - The model workspace path the job was targeting (optional;
 *   used to substitute `<path>` into the legacy-form message).
 * @returns A user-facing error string, or `undefined` when `raw` is falsy.
 */
export function formatJobError(raw: unknown, modelRef?: string): string | undefined {
    if (raw === null || raw === undefined) return undefined;
    const text = String(raw).trim();
    if (!text) return undefined;

    if (/_ERROR_Object not found!_ERROR_/.test(text) || /Object not found/i.test(text)) {
        const pathClause = modelRef ? ` at '${modelRef}'` : '';
        return (
            `No model found${pathClause}. Check that your reconstruct job ` +
            'completed successfully and saved a model to this path, or pass a ' +
            'different ref.'
        );
    }

    return text;
}
