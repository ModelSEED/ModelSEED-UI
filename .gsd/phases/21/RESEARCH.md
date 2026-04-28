# Research - Phase 21: PATRIC & RAST Genome Selection Fix

## 1. PATRIC Data API (RQL)
The legacy code in `external/ModelSEED-UI/app/services/patric.js` uses a Solr-based RQL syntax.

- **Endpoint**: `https://www.patricbrc.org/api/genome/`
- **Common Parameters**:
    - `http_accept=application/solr+json`
    - `limit(L,O)`: Limit L, Offset O
    - `sort(+field)` or `sort(-field)`
    - `select(field1,field2,...)`
    - `and(eq(field,value),...)`
    - `or(eq(field,value),...)`
- **Search Logic**:
    - Single word: `or(eq(genome_name,WORD*),eq(genome_id,WORD))`
    - Multiple words: `and(eq(genome_name,WORD1*),eq(genome_name,WORD2*),...)`
- **Auth**: Requires `Authorization` header with the PATRIC token (raw string).

## 2. RAST (modelseed_support) API
The legacy code in `external/ModelSEED-UI/app/services/ms.js` uses a JSON-RPC 1.1 call.

- **Endpoint**: `https://modelseed.org/services/ms_fba`
- **Method**: `msSupport.list_rast_jobs`
- **Params**: `[{}]` (empty object within array)
- **Response Structure**: Array of job objects.
    - `type === 'Genome'` indicates a successful genome reconstruction (annotation).
    - Fields: `mod_time`, `genome_name`, `genome_id`, `id`, `contig_count`.
- **Auth**: Same PATRIC token.

## 3. UI Patterns
The new UI already uses `DataGrid` from `@mui/x-data-grid` and a custom `DataControlHeader`.

### 3.1 DataControlHeader Integration
- Existing implementations in `app/(reference-data)/genomes/page.tsx` show how to use `slots={{ toolbar: DataControlHeader }}`.
- For server-side search (PATRIC), the `onSearch` prop of `DataControlHeader` should be used to trigger a refetch with the new query.

### 3.2 Build Model Flow
- Clicking "Build Model" in a table row should trigger a small configuration form.
- Legacy UI simply populated a form below or next to the selection.
- Modern approach: A dialog or a collapsed "Configure" section for the selected genome ensures the user doesn't lose context.

## 4. Dependencies
- `@tanstack/react-query`: To handle fetching and caching of search results.
- `@mui/x-data-grid`: Standard data table.

## Timestamp Log
- Created: 2026-03-13 09:55:00 -05:00
