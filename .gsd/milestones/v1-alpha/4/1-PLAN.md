---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Biochem Data Models & API Utility

## Objective
Establish the core data fetching strategy and utilities for the Biochemistry section. This involves installing required dependencies (`@tanstack/react-query`, `@tanstack/react-table` or `@mui/x-data-grid`) and creating a TypeScript utility that mimics the Solr fetching logic from `biochem.js` (including query formatting and Solr endpoint integration).

## Context
- `.gsd/SPEC.md`
- `.gsd/DECISIONS.md`
- `external/ModelSEED-UI/app/services/biochem.js`
- `external/ModelSEED-UI/config.js`

## Tasks

<task type="auto">
  <name>Install Data Grid & Query dependencies</name>
  <files>package.json</files>
  <action>
    - Install `@tanstack/react-query` and `@mui/x-data-grid` via npm.
    - These are necessary for handling large datasets and paginated queries matching the legacy angular application.
  </action>
  <verify>npm list @tanstack/react-query @mui/x-data-grid</verify>
  <done>Dependencies installed successfully and exist in package.json.</done>
</task>

<task type="auto">
  <name>Create Solr API Utility</name>
  <files>lib/api/biochem.ts</files>
  <action>
    - Create a file to handle Solr HTTP requests.
    - Port the logic from `get_solr` in `biochem.js` to a modern TypeScript `fetch` wrapper.
    - Define types for `Reaction` and `Compound` matching the fields retrieved from ModelSEED Solr (e.g. `id`, `name`, `stoichiometry`, `deltag`, `formula`, `mass`, etc).
    - Implement `getReactions`, `getCompounds`, `getReactionDetail`, and `getCompoundDetail` functions.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>TypeScript utility compiles without errors and exports data fetching methods.</done>
</task>

## Success Criteria
- [ ] Dependencies `@tanstack/react-query` and `@mui/x-data-grid` are installed.
- [ ] `lib/api/biochem.ts` exists and exposes Solr fetching methods with strict typography.

## Timestamp Log
- Created: 2026-03-03 17:28:00 -06:00
