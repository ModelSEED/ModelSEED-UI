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

## Endpoint Matrix & Health Status (Updated via SSH Tunnel)

| Service | Endpoint | Method | Auth Required | Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Health** | `/api/health` | `GET` | No | ✅ PASS | `{"status":"ok","version":"0.1.0"}` |
| **Models** | `/api/models` | `GET` | Yes | ✅ PASS | 200 OK (Data retrieved) |
| **Media** | `/api/media/public` | `GET` | Yes* | ⚠️ 401 | Requires token even for public media |
| **Media** | `/api/media` | `GET` | Yes | ❌ 404 | Endpoint does not exist as guessed |

## Auth Contract

- **Header**: `Authorization: <TOKEN>`
- **Format**: Raw token string.
- **Verification**: Confirmed working against `/api/models` over tunnel.

## Connectivity: SSH Tunnel Success
- **Tunnel Command**: `ssh -L 8000:localhost:8000 poplar`
- **Verification**: `curl http://localhost:8000/api/health` returns valid JSON.
- **Env Config**: `NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000`

## Revised Test Findings

1. **Backend (SSH tunnel + script)**  
   - `/api/health` returns `{"status":"ok","version":"0.1.0"}` via `http://localhost:8000/api/health`.  
   - `/api/models` returns 200 with a non-empty list when called with a valid PATRIC token in `Authorization`.  
   - `/api/media/public` returns 401 without a token and 200 with the token, confirming that the Poplar deployment currently requires auth even for “public” media.  
   - `/api/media` returns 404; the guessed endpoint does not exist and callers must stick to `/api/media/public` (and `/api/media/mine` if/when exposed).

2. **Frontend (Next dev server + browser tests)**  
   - Home page login using `samseaver@gmail.com / bollocks` currently fails with `RAST login failed (HTTP 401)` via the RAST flow, even though direct PATRIC auth works via `curl`. This prevents the UI from reaching an authenticated state.  
   - Because login fails, `/my-models`, `/myMedia`, and `/plant` all render `Authentication Required` guards and cannot yet exercise the `modelseed-api` integration end to end from the browser.  
   - Reference data pages (Reactions, Compounds, Media Formulations, Public Plant Models, Subsystems) all show the standardized toolbar (search, Filters, Columns, pagination) and load their respective tables without any modelseed-api-related console or network errors.

3. **Implications for future work**  
   - The backend `modelseed-api` stack is behaving as expected for health, models, and media (with the caveat about `/api/media` 404), and the test harness script `scripts/test-modelseed-api.sh` is a reliable way to re-verify it.  
   - The main blocker for full Phase 17/18 end-to-end verification is the frontend auth flow (RAST login), not the `modelseed-api` itself.

## Timestamp Log
- Created: 2026-03-12 15:35:00 -05:00
- Updated: 2026-03-12 12:55:00 -05:00 (Auth tests confirmed)
- Updated: 2026-03-12 13:05:00 -05:00 (Tunnel & API verification complete)
- Updated: 2026-03-12 16:10:00 -05:00 (Backend script results and frontend UI findings recorded)

