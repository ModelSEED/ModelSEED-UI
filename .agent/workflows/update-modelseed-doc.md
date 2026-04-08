---
name: update-modelseed-doc
description: Automatically sync the project status and technical discoveries to the ModelSEED-UI Google Doc tracker.
---

This workflow synchronizes the current state of the codebase, API discoveries, and issue resolutions with the ModelSEED-UI Testing & Feedback Google Doc.

## 📋 Steps

1. **Information Gathering**
   - Read `.gsd/STATE.md` to get the current Milestone and Phase status.
   - Read `.gsd/phases/18/RESEARCH.md` and `VERIFICATION.md` for the latest API findings.
   - Check `lib/api/config.ts` for current feature flag states (`USE_NEW_PROXY`, `USE_MODELSEED_API`).

2. **Doc Review**
   - Use the `browser_subagent` to open the Google Doc: `https://docs.google.com/document/d/1F-_K22FkwjQsrtp31hT0ngJeB7MQLgnoreq4fRyCT94/edit`.
   - Identify which tables need updates (Issue Tracking, Required Updates, API Status).

3. **Execution**
// turbo
   - Use the `browser_subagent` to navigate to the appropriate sections and update the tables:
     - **Issue Tracking**: Mark resolved bugs as "Closed" and add new technical blockers found.
     - **Required Updates**: Move completed transition tasks to "Complete" or "Partially Complete".
     - **API Status**: Update current state (Functional/Error) and add specific discovery notes.

4. **Verification**
   - Take a final screenshot of the doc to confirm updates are reflected correctly.
   - Log the sync time in the doc if a "Last Updated" field exists.

## 🚨 Critical Rules
- Do NOT rewrite instructions or setup guides unless they have changed in the codebase.
- Keep table entries concise.
- Preserve the existing Heading structure to ensure the Side Outline remains functional.
