# Testing Platform

This directory contains the automated test suite for ModelSEED-UI, enabling safe JavaScript framework updates and catching regressions before they reach users.

---

## Overview

The testing platform uses a multi-layered approach:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Vitest | Fast tests for utility functions and API clients |
| E2E Tests | Playwright | Browser automation for critical user workflows |
| API Tests | Node.js | Direct API endpoint testing |
| CI/CD | GitHub Actions | Automated testing on every code change |

---

## Quick Start

### Run All Tests

```bash
# Unit tests (fast)
npm run test:run

# Unit tests with coverage report
npm run test:coverage

# E2E tests (requires running dev server + SSH tunnel)
npm run test:e2e

# E2E tests with browser UI
npm run test:e2e:ui

# API tests (requires SSH tunnel to poplar)
npm run test:api
```

---

## Test Structure

```
tests/
├── e2e/                      # E2E tests (Playwright)
│   ├── README.md            # Playwright documentation
│   ├── suite.spec.ts        # Main E2E test suite (59 tests)
│   └── helpers/
│       └── auth.ts          # Auth helper utilities
```

---

## E2E Tests (Playwright)

The E2E test suite covers the entire application:

### Test Suites

| Suite | Tests | Coverage |
|-------|-------|----------|
| 01. Public Pages | 12 | Homepage, About, Team, Events, etc. |
| 02. Reference Data | 14 | Biochem, Genomes, Media, Public Models |
| 03. Authenticated | 7 | My Models, My Media, My Jobs |
| 04. Model Detail | 15 | All tabs (Overview, Reactions, Compounds, Genes, Biomass, Pathways, FBA, Gapfills) |
| 05. Analysis Tools | 12 | Build Model, Compare, FBA, Gapfilling, Data/Feature |
| 06. Navigation | 3 | Header, Tab navigation |
| 07. Edge Cases | 3 | Error handling |

### Running E2E Tests

```bash
# All E2E tests
npm run test:e2e

# With visible browser
npm run test:e2e:ui

# Specific test file
npx playwright test tests/e2e/suite.spec.ts

# Run tests matching pattern
npx playwright test -g "public"
```

### E2E Test Requirements

1. **Dev server running**: `npm run dev`
2. **SSH tunnel to API** (for authenticated tests):
   ```bash
   ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
   ```
3. **Environment variables** in `.env.local`:
   ```bash
   NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
   PATRIC_TOKEN=your_patric_token   # For PATRIC workspace tests
   RAST_TOKEN=your_rast_token       # For RAST workspace tests
   ```
   Note: At least one token is required for authenticated tests.

---

## API Tests

The API test script (`scripts/api-test.mjs`) directly tests all backend endpoints:

### Test Suites

| Suite | Tests |
|-------|-------|
| Configuration | API URL, Proxy settings, Reachability |
| Authentication | PATRIC/RAST token login |
| Workspace | ls, get, create, delete |
| ModelSEED API | List models, media, jobs |
| Model Analysis | Get FBA results, Get gapfill results |
| Public Data | List media, get model, export SBML |
| Biochemistry | List/search reactions & compounds |

### Running API Tests

```bash
# Start SSH tunnel first
ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov

# Run API tests
npm run test:api
```

### API Test Requirements

1. **SSH tunnel to poplar**:
   ```bash
   ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
   ```
2. **Environment variables** in `.env.local`:
   ```bash
   NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
   
   # PATRIC credentials (for /seaver@patricbrc.org/... paths)
   PATRIC_TOKEN=un=seaver@patricbrc.org|...
   
   # OR RAST credentials (for /seaver/... paths)
   RAST_TOKEN=un=seaver|...
   ```

### What API Tests Verify

- ✅ Authentication works (PATRIC and RAST tokens)
- ✅ List user models
- ✅ List workspace contents
- ✅ Get model data
- ✅ Get FBA results for models
- ✅ Get gapfill results for models
- ✅ Submit FBA jobs (via API, not tested here)
- ✅ Public data access

---

## CI/CD Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs on:

- **Every push** to `develop` or `master`
- **Every pull request** to `develop` or `master`

### Jobs

| Job | Trigger | PATRIC_TOKEN Required |
|-----|---------|----------------------|
| ESLint | PR + Push | No |
| TypeScript | PR + Push | No |
| Security Audit | PR + Push | No |
| Build | PR + Push | No |
| Unit Tests | PR + Push | No |
| E2E Tests | Push only | Yes |

### Setting Up Secrets

1. Go to GitHub repository **Settings**
2. Navigate to **Secrets and Variables > Actions**
3. Add secrets:
   - `PATRIC_TOKEN` - PATRIC auth token
   - `RAST_TOKEN` - RAST auth token (optional, for full coverage)

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PATRIC_TOKEN` | For API testing | PATRIC auth token (for PATRIC workspace) |
| `PATRIC_USERNAME` | For API login | PATRIC username |
| `PATRIC_PASSWORD` | For API login | PATRIC password |
| `RAST_TOKEN` | For API testing | RAST auth token (for RAST workspace) |
| `RAST_USERNAME` | For API login | RAST username |
| `RAST_PASSWORD` | For API login | RAST password |
| `NEXT_PUBLIC_USE_MODELSEED_API` | No | Enable ModelSEED API (default: true) |
| `NEXT_PUBLIC_MODELSEED_API_URL` | No | API base URL |
| `NEXT_PUBLIC_USE_NEW_PROXY` | No | Use new proxy (default: true) |

### PATRIC vs RAST Tokens

The API supports two authentication systems:
- **PATRIC**: Use for `/seaver@patricbrc.org/modelseed/...` workspace paths
- **RAST**: Use for `/seaver/modelseed/...` workspace paths

API tests automatically use whichever token is available. For testing both systems, set both tokens:

```bash
# .env.local
PATRIC_TOKEN=un=seaver@patricbrc.org|...
RAST_TOKEN=un=seaver|...
```

### Example .env.local

```bash
NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MODELSEED_API=true

# PATRIC credentials
PATRIC_TOKEN=un=seaver@patricbrc.org|tokenid=...|expiry=...
PATRIC_USERNAME=samseaver@gmail.com
PATRIC_PASSWORD=your_password

# RAST credentials  
RAST_TOKEN=un=seaver|tokenid=...|expiry=...
RAST_USERNAME=seaver
RAST_PASSWORD=your_password
```

---

## Security Considerations

### Never Commit Tokens

- Auth tokens must NEVER be hardcoded in test files
- Use environment variables only
- Tests skip gracefully when credentials are not set

### Example (Correct)

```typescript
const PATRIC_TOKEN = process.env.PATRIC_TOKEN;
const RAST_TOKEN = process.env.RAST_TOKEN;

test.beforeEach(async ({ page }) => {
  if (!PATRIC_TOKEN && !RAST_TOKEN) {
    test.skip(true, 'No auth tokens set');
    return;
  }
  // ...
});
```

---

## Troubleshooting

### Tests Pass Locally But Fail in CI

1. Check that `PATRIC_TOKEN` secret is set in GitHub
2. Verify environment variables match local setup
3. Check Playwright browser installation in CI logs

### E2E Tests Timeout

1. Increase timeout in test: `await expect(locator).toBeVisible({ timeout: 30000 })`
2. Check if the dev server is running (Playwright auto-starts in local mode)

### API Tests Skip

- This is expected behavior when APIs are unavailable
- Tests gracefully skip to avoid CI failures from external dependencies
- Make sure SSH tunnel is active: `ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov`

---

## Related Documentation

- [README.md](../README.md) - Main project documentation
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - Tech stack and API clients
- [AUTHENTICATION.md](../docs/AUTHENTICATION.md) - Auth system
- [WORKSPACE.md](../docs/WORKSPACE.md) - Workspace API
- [issues.md](../issues.md) - Known issues
