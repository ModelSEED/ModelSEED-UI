---
phase: 4
plan: 1
wave: 1
status: complete
---

# Summary: Plan 4.1 — Biochem Data Models & API Utility

## What Was Done

### Task 1: Install Data Grid & Query Dependencies
- Installed `@tanstack/react-query` (^5.90.21) and `@mui/x-data-grid` (^8.27.3) via npm.
- Both packages confirmed in `package.json` dependencies.

### Task 2: Create Solr API Utility
- Created `lib/api/biochem.ts` — a full TypeScript port of the legacy AngularJS `Biochem` service.
- Defined strict interfaces: `Reaction`, `Compound`, `SolrResponse<T>`, `SolrQueryOpts`.
- Implemented `buildSolrUrl()` mirroring legacy `get_solr` query construction with field lists, search fields, pagination, and sorting.
- Implemented `sanitizeQuery()` mirroring legacy input sanitization.
- Exported public functions: `getReactions`, `getCompounds`, `getReactionById`, `getCompoundById`, `findReactionsForCompound`, `getCompoundImageUrl`.
- Exposed `EXTERNAL_DBS` constant for BiGG/KEGG/MetaCyc link generation.
- Compiles cleanly with `npx tsc --noEmit`.

## Files Created/Modified
- `lib/api/biochem.ts` (264 lines)
- `package.json` (dependencies added)

## Timestamp Log
- Created: 2026-03-04 07:50:00 -06:00
