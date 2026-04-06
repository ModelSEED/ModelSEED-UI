/**
 * CSV/TSV Export Utilities
 *
 * Provides functions to export JavaScript arrays of objects to CSV or TSV format
 * and trigger browser downloads. Handles proper escaping of special characters
 * (quotes, delimiters, newlines) per RFC 4180.
 * 
 * @see https://datatracker.ietf.org/doc/html/rfc4180 - CSV format specification
 */

/**
 * Options for customizing CSV/TSV export.
 */
export interface ExportCsvOptions {
    /** Output filename (default: 'export.csv'). Extension added if missing. */
    filename?: string;
    /** Specific columns to export (default: all columns from first object). */
    columns?: string[];
    /** Custom column headers (default: use property names). */
    columnLabels?: Record<string, string>;
    /** Field delimiter (default: ',' for CSV, '\t' for TSV). */
    delimiter?: string;
}

/**
 * Escape a CSV field value according to RFC 4180.
 * 
 * Wraps the field in double quotes if it contains the delimiter, newlines,
 * or double quotes. Escapes internal double quotes by doubling them.
 * 
 * @param value - Value to escape (coerced to string)
 * @param delimiter - Field delimiter character
 * @returns Escaped field value, safe for CSV output
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
 * Convert array of objects to CSV/TSV string.
 * 
 * Transforms a JavaScript array of objects into delimited text format with headers.
 * Columns are determined from the first object's keys unless explicitly specified.
 * 
 * @param data - Array of objects to convert
 * @param options - Export options (columns, labels, delimiter)
 * @returns CSV/TSV formatted string with header row
 * 
 * @example
 * ```typescript
 * const data = [
 *   { id: 'rxn001', name: 'ATP synthase', reversibility: '>' },
 *   { id: 'rxn002', name: 'Hexokinase', reversibility: '=' }
 * ];
 * 
 * const csv = objectsToCsv(data, {
 *   columns: ['id', 'name', 'reversibility'],
 *   columnLabels: { id: 'Reaction ID', name: 'Reaction Name' }
 * });
 * // Output:
 * // "Reaction ID","Reaction Name",reversibility
 * // rxn001,"ATP synthase",>
 * // rxn002,Hexokinase,=
 * ```
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
 * Trigger browser download of CSV content.
 * 
 * Creates a Blob and temporary download link to initiate a file download in the browser.
 * Automatically appends '.csv' extension if not present. Cleans up resources after download.
 * 
 * @param csvContent - CSV string content to download
 * @param filename - Desired filename (will add .csv extension if missing)
 * 
 * @example
 * ```typescript
 * const csv = objectsToCsv(data);
 * downloadCsv(csv, 'model-reactions');
 * // Downloads file named "model-reactions.csv"
 * ```
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
 * Export array of objects to CSV file (combines conversion and download).
 * 
 * Convenience function that converts data to CSV format and triggers browser download
 * in a single call. This is the most commonly used export function.
 * 
 * @param data - Array of objects to export
 * @param options - Export options (filename, columns, columnLabels, delimiter)
 * 
 * @example
 * ```typescript
 * // Export model reactions to CSV
 * exportToCsv(reactions, {
 *   filename: 'model-reactions',
 *   columns: ['id', 'name', 'equation', 'gpr'],
 *   columnLabels: {
 *     id: 'Reaction ID',
 *     gpr: 'Gene-Protein-Reaction'
 *   }
 * });
 * ```
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
 * Export array of objects to TSV file (Tab-Separated Values).
 * 
 * Similar to exportToCsv but uses tab character as delimiter. TSV format is often
 * preferred for Excel compatibility and when data contains many commas.
 * 
 * @param data - Array of objects to export
 * @param options - Export options (filename, columns, columnLabels)
 * 
 * @example
 * ```typescript
 * // Export compound data to TSV for Excel
 * exportToTsv(compounds, {
 *   filename: 'compounds-list',
 *   columns: ['id', 'name', 'formula', 'mass', 'charge']
 * });
 * ```
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
