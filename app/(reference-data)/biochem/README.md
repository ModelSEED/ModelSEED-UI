# Biochemistry Reference Data (`/biochem`)

This directory provides interactive access to the **ModelSEED Biochemistry Library**, the core of the reference database.

## 📁 Content Breakdown

| Folder | Description |
|-------|-------------|
| [`reactions/`](./reactions/README.md) | **Global Reaction List**: View all metabolic reactions with Solr-powered search and Chemical Equation formatting. |
| [`compounds/`](./compounds/README.md) | **Compound Library**: View chemical structures and metadata. |

## 🧬 Scientific logic
- **Search Engine**: All data is fetched from a dedicated **Solr Index** (`lib/api/biochem.ts`) for sub-second performance across thousands of reagents.
- **Equation Rendering**: We use a refined React component to transform plain text equations into scientifically accurate formulas.

## 📁 Key Routes
- `/biochem/reactions`: The main interactive DataGrid.
- `/biochem/reactions/[id]`: The deep-dive detail view for a specific transformation.
- `/biochem/compounds`: The searchable chemical library.

--- 
*Maintained at: `app/(reference-data)/biochem/README.md`*

## Timestamp Log
- Updated: 2026-03-31 16:00:00 CDT - Integrated side drawers for inline compound data fetching inside the Media Editor contexts. Fully functional Solr querying.
