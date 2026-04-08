# lib/utils

> Reusable helper functions for ModelSEED UI

## Overview

This folder contains utility functions used across the application.

## Files

| File | Purpose | Lines | Key Exports |
|------|---------|-------|-------------|
| [`exportCsv.ts`](#exportcsvts) | CSV/TSV export with browser download | ~200 | `exportToCsv()`, `exportToTsv()`, `objectsToCsv()`, `downloadCsv()` |

---

## exportCsv.ts

**Purpose**: Convert JavaScript arrays of objects to CSV/TSV format and trigger browser downloads. Compliant with [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180).

### Interfaces

```ts
interface ExportCsvOptions {
  filename?: string;           // Output filename (default: 'export.csv')
  columns?: string[];          // Specific columns to export (default: all)
  columnLabels?: Record<string, string>;  // Custom column headers
  delimiter?: string;          // Field delimiter (default: ',' for CSV)
}
```

### Exports

| Function | Description |
|----------|-------------|
| `exportToCsv(data, options?)` | Convert data to CSV and trigger download (most commonly used) |
| `exportToTsv(data, options?)` | Convert data to TSV and trigger download |
| `objectsToCsv(data, options?)` | Convert data to CSV string (no download) |
| `downloadCsv(content, filename)` | Trigger browser download of CSV content |

### Usage

```tsx
import { exportToCsv, exportToTsv } from '@/lib/utils/exportCsv';

// Quick export (all columns, default filename)
exportToCsv(reactions);

// Customized export
exportToCsv(reactions, {
  filename: 'model-reactions',
  columns: ['id', 'name', 'equation', 'gpr'],
  columnLabels: {
    id: 'Reaction ID',
    name: 'Reaction Name',
    equation: 'Chemical Equation',
    gpr: 'Gene-Protein-Reaction'
  }
});

// TSV for Excel compatibility
exportToTsv(compounds, {
  filename: 'compounds-list',
  columns: ['id', 'name', 'formula', 'mass', 'charge']
});

// Get CSV string without download
const csvString = objectsToCsv(data, { columns: ['id', 'name'] });
```

### Features

- **RFC 4180 compliant**: Proper escaping of quotes, newlines, and delimiters
- **Null/undefined handling**: Empty values rendered as empty strings
- **Column selection**: Export only the columns you need
- **Custom headers**: Rename columns for readability
- **TSV support**: Tab-delimited for data with many commas
- **Empty data handling**: Warns and returns early if data is empty

### How It Works

1. `escapeField()` — Wraps fields in double quotes if they contain delimiters, newlines, or quotes. Internal double quotes are escaped by doubling them.
2. `objectsToCsv()` — Builds header row from column names (or custom labels), then maps each object to a delimited row.
3. `downloadCsv()` — Creates a Blob, generates a temporary download link, triggers click, and cleans up.

### Adding New Export Utilities

If you need additional export formats (e.g., Excel, JSON), follow this pattern:
1. Define an options interface
2. Create a conversion function (data → string)
3. Create a download function (string → browser download)
4. Create a convenience function combining both

---

**Related:**
- Main lib README: [`../README.md`](../README.md)
