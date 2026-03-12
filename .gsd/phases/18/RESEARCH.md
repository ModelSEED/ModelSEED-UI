---
phase: 18
level: 2
researched_at: 2026-03-12T15:35:00-05:00
---

# Phase 18 Research: modelseed-api and End-to-End Testing

This file is the shared research log for Phase 18 plans. Use it to record:

- The endpoint matrix and test expectations for the Poplar `modelseed-api` instance.
- The chosen backend and frontend test harnesses.
- Any environment assumptions (tokens, base URLs, configuration flags) required to run the tests.

Initial context from José:

- Base URL: `http://poplar.cels.anl.gov:8000`
- Health check: `/api/health`
- Docs: `/docs` (Swagger) and `/demo/` (demo dashboard)
- Authentication: PATRIC token in the `Authorization` header for all `/api/*` endpoints.

## Timestamp Log
- Created: 2026-03-12 15:35:00 -05:00

