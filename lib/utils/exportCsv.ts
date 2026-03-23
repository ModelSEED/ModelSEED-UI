/**
 * CSV Export Utility
 *
 * Exports array of objects to CSV format and triggers browser download.
 */

export interface ExportCsvOptions {
    filename?: string;
    columns?: string[];
    columnLabels?: Record<string, string>;
    delimiter?: string;
}

/**
 * Escape a CSV field value
 */
function escapeField(value: unknown, delimiter: string): string {
    if (value === null || value === undefined) return '';

    let str = String(value);

    // If contains delimiter, newline, or quote, wrap in quotes and escape quotes
    if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
        str = '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
}

/**
 * Convert array of objects to CSV string
 */
export function objectsToCsv<T extends Record<string, unknown>>(
    data: T[],
    options: ExportCsvOptions = {}
): string {
    if (data.length === 0) return '';

    const { columns, columnLabels = {}, delimiter = ',' } = options;

    // Determine columns from first object if not specified
    const cols = columns || Object.keys(data[0]);

    // Build header row
    const headerRow = cols
        .map((col) => escapeField(columnLabels[col] || col, delimiter))
        .join(delimiter);

    // Build data rows
    const dataRows = data.map((row) =>
        cols.map((col) => escapeField(row[col], delimiter)).join(delimiter)
    );

    return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger browser download of CSV content
 */
export function downloadCsv(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Export array of objects to CSV file (combines conversion and download)
 */
export function exportToCsv<T extends Record<string, unknown>>(
    data: T[],
    options: ExportCsvOptions = {}
): void {
    const { filename = 'export.csv', ...csvOptions } = options;

    if (data.length === 0) {
        console.warn('No data to export');
        return;
    }

    const csvContent = objectsToCsv(data, csvOptions);
    downloadCsv(csvContent, filename);
}

/**
 * Export to TSV (Tab-Separated Values)
 */
export function exportToTsv<T extends Record<string, unknown>>(
    data: T[],
    options: Omit<ExportCsvOptions, 'delimiter'> = {}
): void {
    const filename = options.filename || 'export.tsv';
    const csvContent = objectsToCsv(data, { ...options, delimiter: '\t' });

    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.tsv') ? filename : `${filename}.tsv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
