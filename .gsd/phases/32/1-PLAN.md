---
phase: 32
plan: 1
wave: 1
autonomous: true
depends_on: []
files_modified:
  - lib/api/workspace.ts
  - lib/api/modelseed.ts
  - app/(user-data)/my-jobs/page.tsx
user_setup:
  - Ensure SSH tunnel to Poplar is active: ssh -L 8000:localhost:8443 user@poplar-host
---

# Plan 32.1: Poplar Backend Integration Fixes

<objective>
Integrate the updated Poplar backend fixes into the frontend to ensure proper error handling, data parsing resilience, and job status reliability.

Purpose: The Poplar backend has been updated with fixes that need to be integrated - proper HTTP status codes, error messages, and job status safety net. This plan addresses those integrations and tests workspace operations.

Output: Updated API error handling, defensive data parsing, job status safety net, tested workspace write operations
</objective>

<context>
Load for context:
- lib/api/workspace.ts (lines 1-235 - full file for error handling patterns)
- lib/api/modelseed.ts (lines 1-250 - model listing, job fetching, error handling)
- app/(user-data)/my-jobs/page.tsx (lines 1-294 - job status polling)
- lib/api/jobTracker.ts (for understanding local job tracking)
- AGENTS.md Known Issues section

Backend updates from José P. Faria:
- Workspace errors now return proper status codes (404 for not found, 403 for permission denied, 502 for upstream errors) with actual error messages from p3.theseed.org
- Model listing no longer crashes on non-numeric metadata values (backend fixed, add defensive coding)
- Job status updates have safety net so jobs won't get stuck at "queued" even if imports fail

Environment: SSH tunnel to Poplar is set up at localhost:8000 (ssh -L 8000:localhost:8443 user@poplar-host)
</context>

<tasks>

<task type="auto">
  <name>Update workspace error handling for proper HTTP status codes</name>
  <files>lib/api/workspace.ts</files>
  <action>
    Enhance error handling in callWorkspaceApi (lines 105-146) and callWorkspaceRestApi (lines 151-177) functions:
    
    1. In callWorkspaceApi: After getting response, check response.ok and response.status
    2. Extract error message from payload - look for 'message', 'detail', or nested 'error.message' fields
    3. Construct error message format: "Workspace {method} failed ({status}): {backend_message}"
    4. Handle specific status codes with user-friendly messages:
       - 400: "Bad request - check input parameters"
       - 401: "Authentication required"
       - 403: "Permission denied - you don't have access to this resource"
       - 404: "Object not found - the requested resource does not exist"
       - 500: "Internal server error - please try again later"
       - 502: "Upstream service unavailable - backend is temporarily unavailable"
       - 503: "Service unavailable - please try again later"
    5. Preserve existing JSON-RPC error handling for data.error field
    6. Log full error details to console for debugging while showing简洁 message to user
    
    Example implementation pattern:
    ```typescript
    if (!response.ok) {
      const message = extractWorkspaceErrorMessage(payload);
      const statusMsgs: Record<number, string> = {
        404: 'Object not found',
        403: 'Permission denied',
        502: 'Upstream service unavailable',
        500: 'Internal server error',
      };
      const statusMsg = statusMsgs[response.status] || 'Request failed';
      throw new Error(
        `Workspace ${method} failed (${response.status}): ${statusMsg}${message ? ` - ${message}` : ''}`,
      );
    }
    ```
    
    AVOID: Breaking existing error handling patterns - just enhance with better status-aware messages
    WHY: Users need to see meaningful error messages from p3.theseed.org instead of generic failures
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>Workspace API errors show meaningful messages like "Workspace get failed (404): Object not found - the requested resource does not exist" or "Workspace ls failed (403): Permission denied - you don't have access" instead of generic errors</done>
</task>

<task type="auto">
  <name>Add defensive handling for non-numeric metadata in model listing</name>
  <files>lib/api/modelseed.ts</files>
  <action>
    Enhance ModelseedModelSummary interface and listUserModelsFromApi function:
    
    1. Review current interface at lines 19-31 for all numeric fields
    2. In listUserModelsFromApi (lines 130-132), wrap response processing:
       ```typescript
       const safeParseNumber = (val: unknown): number | undefined => {
         if (val === null || val === undefined) return undefined;
         if (typeof val === 'number' && Number.isFinite(val)) return val;
         if (typeof val === 'string') {
           const parsed = Number(val);
           if (Number.isFinite(parsed)) return parsed;
         }
         return undefined; // Gracefully handle "N/A", "", invalid
       };
       ```
    3. Apply safeParseNumber to: num_genes, num_reactions, num_compounds, fba_count, unintegrated_gapfills, integrated_gapfills
    4. Add try-catch around entire model list processing to prevent single bad item from crashing entire list
    5. Log warnings for unparseable values for debugging
    
    AVOID: Changing API response structure - just handle edge cases gracefully
    WHY: Backend fixed the root cause, but defensive coding protects against edge cases and future API changes
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>Model listing renders without crashing even if backend returns non-numeric metadata values like "N/A", empty strings, or malformed objects</done>
</task>

<task type="auto">
  <name>Add safety net for job status polling</name>
  <files>app/(user-data)/my-jobs/page.tsx, lib/api/modelseed.ts</files>
  <action>
    Enhance job status handling with safety net:
    
    1. In my-jobs/page.tsx - Add stuck job detection:
       - Create useRef to track job status history: Map<jobId, {status: string, timestamp: number, sameCount: number}>
       - In mergeApiAndTrackedJobs (lines 73-119), track consecutive same-status polls
       - If same status for >3 polls (~30 seconds), flag as "possibly stuck"
       
    2. Update statusColor function (line 57) to handle stuck status:
       - Add 'queued_stuck' or similar indicator
       - Return 'warning' color (yellow/orange) instead of 'info' (blue)
       
    3. Add warning indicator in status Chip (line 174-185):
       - Show "(possibly stuck)" tooltip or badge for stuck jobs
       - Add refresh icon button for manual re-check
       
    4. Enhance tracked jobs fallback (lines 103-116):
       - If API fails or returns empty, tracked jobs show "status: unknown" 
       - Add "Click to retry" action that re-fetches job status
       
    5. In getJobsFromApi (modelseed.ts 224-237):
       - Add console.warn on API failures (already returns empty)
       - Ensure error doesn't break the page
    
    AVOID: Over-complicating the polling logic - simple detection is sufficient
    WHY: Jobs shouldn't get permanently stuck at "queued" - this adds a safety net for visibility
  </action>
  <verify>npm run lint && npm run typecheck</verify>
  <done>Jobs don't get permanently stuck at "queued" - safety net detects stale status and shows warning indicator with manual refresh option</done>
</task>

<task type="auto">
  <name>Test workspace write operations with Poplar backend</name>
  <files>lib/api/workspace.ts, lib/api/config.ts</files>
  <action>
    Test W001 operations now that Poplar is updated:
    
    1. Review current ensureProxyMode guards (lines 201-235) in workspace.ts
    2. Check config.ts for USE_NEW_PROXY setting and understand what it controls
    3. Test operations via curl (example):
       ```bash
       # Test workspace/ls (should work)
       curl -X POST localhost:8000/api/workspace/ls \
         -H "Content-Type: application/json" \
         -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
         -d '{"paths": ["/username/"]}'
       
       # Test workspace/create (may be new)
       curl -X POST localhost:8000/api/workspace/create \
         -H "Content-Type: application/json" \
         -d '{"type": "workspace", "name": "test"}'
       ```
       
    4. If operations succeed (200 OK response):
       - Remove ensureProxyMode guards OR make them warnings instead of errors
       - Enable write operations in UI (check where "API unavailable" is shown)
       - Update AGENTS.md to mark W001 as resolved
       
    5. If operations fail (4xx/5xx errors):
       - Document error messages - are they proper status codes now?
       - Keep existing guards in place
       - Note in AGENTS.md that W001 still blocked but has improved error messages
    
    AVOID: Breaking existing "API unavailable" graceful handling - don't remove guards unless verified working
    WHY: Workspace write operations may now work on Poplar and should be enabled if tested successfully
  </action>
  <verify>Manual curl testing or UI workflow testing</verify>
  <done>Workspace write operations either verified working (guards relaxed) or documented with new status code errors</done>
</task>

<task type="auto">
  <name>Update AGENTS.md with Phase 32 findings</name>
  <files>AGENTS.md</files>
  <action>
    Update the Known Issues document based on Phase 32 results:
    
    1. Update W001: Workspace Write Operations - mark as resolved or document current status
    2. Update WS001: Workspace /get Returns 500 - note if 404/403 handling helps
    3. Add notes about new error message improvements
    4. Document any new issues discovered
    
    Format:
    ```markdown
    ### [ISSUE-ID]: Brief Title
    **Status:** Resolved / In Progress / Blocked
    **Resolution:** What was done or what still needs fixing
    ```
  </action>
  <verify>AGENTS.md updated with accurate status</verify>
  <done>AGENTS.md reflects current state of all addressed issues</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] npm run lint passes
- [ ] npm run typecheck passes  
- [ ] Workspace errors show meaningful status-based messages with user-friendly text
- [ ] Model listing handles edge case metadata (N/A, empty string, invalid) without crashing
- [ ] Job status UI shows warning for potentially stuck jobs with refresh option
- [ ] Workspace write operations tested and documented
- [ ] AGENTS.md updated with findings
</verification>

<success_criteria>
- [ ] All 5 tasks verified complete
- [ ] Workspace API errors display proper HTTP status codes (404/403/502/500) with user-friendly messages
- [ ] Model listing handles non-numeric metadata gracefully (defensive coding)
- [ ] Job status has safety net preventing permanently stuck "queued" status
- [ ] Workspace write operations tested with updated Poplar backend
- [ ] AGENTS.md updated with Phase 32 findings
</success_criteria>
