import { ModelseedApiError, type ModelseedApiErrorDetail } from '@/lib/api/modelseed';

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

/**
 * Decision summary returned by `presentJobSubmitError`. Lets call sites
 * decide what to render and whether to side-effect (logout/redirect)
 * without re-implementing detail parsing each time.
 */
export interface PresentedJobSubmitError {
    /** Stable backend code (e.g. `GENOME_NOT_FOUND`), or undefined for unstructured errors. */
    code?: string;
    /** Headline one-liner. Always populated. */
    message: string;
    /** "What to do next" guidance. Render lighter, under the message. */
    hint?: string;
    /** Request-body field name (e.g. `genome`) to highlight in the form. */
    field?: string;
    /** True for transient upstream failures; false when the user must change input. */
    retryable?: boolean;
    /** HTTP status, when available (sync 4xx path). */
    status?: number;
    /** Convenience flag for the auth-expired redirect path. */
    isTokenExpired: boolean;
    /**
     * Single human-readable string suitable for legacy `<Alert>{message}</Alert>`
     * call sites that haven't been refactored to render hint/field separately.
     */
    display: string;
}

const TOKEN_EXPIRED_CODE = 'TOKEN_EXPIRED';

function getApiErrorDetail(err: unknown): ModelseedApiErrorDetail | undefined {
    if (err instanceof ModelseedApiError) {
        return err.detail;
    }
    return undefined;
}

/**
 * Translate a job-submit exception into a render decision.
 *
 * Handles three cases:
 *  - `ModelseedApiError` with a structured `detail` body → uses backend fields.
 *  - `ModelseedApiError` without a structured body (5xx, plain-text 4xx) →
 *    falls back on the message + status.
 *  - Plain `Error` (network failure, validation thrown before submit) →
 *    falls back on `.message` (run through `formatJobError` for the
 *    legacy `_ERROR_Object not found!_ERROR_` substitution).
 *
 * @param err - Whatever was caught at the call site
 * @param opts.modelRef - Workspace ref of the targeted model, used to
 *   humanize legacy "Object not found" strings.
 */
export function presentJobSubmitError(
    err: unknown,
    opts: { modelRef?: string } = {},
): PresentedJobSubmitError {
    const detail = getApiErrorDetail(err);
    const status = err instanceof ModelseedApiError ? err.status : undefined;

    if (detail) {
        const isTokenExpired = detail.code === TOKEN_EXPIRED_CODE;
        const display = detail.hint ? `${detail.message}\n${detail.hint}` : detail.message;
        return {
            code: detail.code,
            message: detail.message,
            hint: detail.hint ?? undefined,
            field: detail.field ?? undefined,
            retryable: detail.retryable,
            status,
            isTokenExpired,
            display,
        };
    }

    const rawMessage = err instanceof Error
        ? err.message
        : (typeof err === 'string' ? err : 'Job submission failed.');
    const humanized = formatJobError(rawMessage, opts.modelRef) ?? rawMessage;
    return {
        message: humanized,
        status,
        isTokenExpired: status === 401,
        display: humanized,
    };
}
