/**
 * Normalize workspace date strings like "2026-04-14-17:46:54" to ISO format.
 * Workspace API returns dates with dash between date and time instead of "T".
 */
export function parseWorkspaceDate(value: unknown): Date | null {
    if (typeof value !== 'string' || !value) return null;
    const normalized = value.replace(
        /^(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2}:\d{2})$/,
        '$1T$2',
    );
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}
