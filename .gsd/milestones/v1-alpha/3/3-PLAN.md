---
phase: 3
plan: 3
wave: 1
---

# Plan 3.3: Publications Page Implementation

## Objective
Recreate the Publications page (`/publications`) with its live filtering, and table view using MUI. Ensure data is structured statically to replicate the live endpoint since the backend may be missing.

## Context
- `.gsd/SPEC.md`
- `.gsd/DECISIONS.md`
- Original template: `external/ModelSEED-UI/app/views/docs/publications.html`
- Original controller: `external/ModelSEED-UI/app/ctrls/ctrls.js` (Lines 392-425)

## Tasks

<task type="auto">
  <name>Extract Publications Data</name>
  <files>
    - `lib/data/publications.ts` (new)
  </files>
  <action>
    - Create a static exported JSON array structure that would match the `/publications` REST API output.
    - Since we have no direct access to the live MS REST API from the codebase right now without firing a manual fetch, pull the data by curling `https://modelseed.org/api/v0/publications` (or provide instructions to extract what's possible, or if unavailable, stub a minimum of 5 modelseed publications for visual fidelity).
    - Data interface: `title`, `authors` (array string or joined), `publication` `volumn` (sic from legacy), `number`, `pages`, `year`.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Publications structured accurately.</done>
</task>

<task type="auto">
  <name>Implement Publications UI and Filtering</name>
  <files>
    - `app/publications/page.tsx`
    - `app/publications/publications.module.css` (new)
  </files>
  <action>
    - Make this page a `"use client"` so we can manage `query` state for searching, and `reversed` state for sorting by year.
    - Match layout `<md-input-container>` search and `<b ng-click="reversed=!reversed">Year</b>` toggle logic.
    - Use standard HTML `<table>` or MUI `<Table>` customized to mimic legacy CSS styling.
    - Apply highlight filtering (like `ng-bind-html="pub.title | highlight: query"`) in React using a text-split highlight method or regex.
    - Include empty state texts: "No publications found" or loading indicators appropriately.
  </action>
  <verify>npm run check or standard verify</verify>
  <done>Publication search logic matching legacy AngularJS filters behavior, styling exact 1:1.</done>
</task>

## Success Criteria
- [ ] Users can browse publications that initially load.
- [ ] Users can search via string, highlighting matched strings.
- [ ] Users can toggle sort order by year.


## Timestamp Log
- Created: 2026-03-03T16:21:00-06:00
