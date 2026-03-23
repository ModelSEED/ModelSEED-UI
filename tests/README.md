# Testing Platform

This directory contains the automated test suite for ModelSEED-UI, enabling safe JavaScript framework updates and catching regressions before they reach users.

---

## Overview

The testing platform uses a multi-layered approach:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Vitest | Fast tests for utility functions and API clients |
| Integration Tests | Vitest | Real API validation against Poplar backend |
| E2E Tests | Playwright | Browser automation for critical user workflows |
| CI/CD | GitHub Actions | Automated testing on every code change |

---

## Quick Start

### Run All Tests

```bash
# Unit + Integration tests (fast)
npm run test:run

# Unit tests with coverage report
npm run test:coverage

# E2E tests (requires running dev server or token)
npm run test:e2e

# E2E tests with browser UI
npm run test:e2e:ui
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Vitest run once |
| `npm run test:coverage` | Vitest with coverage report |
| `npm run test:ui` | Vitest with browser UI |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright with browser UI |

---

## Test Structure

```
tests/
├── unit/                      # Unit tests (Vitest)
│   ├── api/
│   │   ├── auth.test.ts       # Authentication API tests
│   │   ├── biochem.test.ts    # Solr biochemistry API tests
│   │   ├── modelseed.test.ts  # ModelSEED API tests
│   │   └── workspace.test.ts   # Workspace API tests
│   └── utils/
│       └── exportCsv.test.ts  # CSV export utility tests
│
├── integration/               # Integration tests (Vitest)
│   └── ...                   # Reserved for complex workflows
│
├── e2e/                      # E2E tests (Playwright)
│   ├── auth.spec.ts          # Authentication flow
│   ├── browse-models.spec.ts  # My Models page
│   ├── build-model.spec.ts    # Plant model builder
│   ├── media-workflow.spec.ts # Media editor
│   ├── model-detail.spec.ts    # Model detail page
│   └── run-fba.spec.ts        # FBA analysis
│
├── utils/
│   └── testHelpers.ts        # Shared test utilities
│
└── setup.ts                  # Vitest global setup
```

---

## Configuration

### Vitest (`vitest.config.ts`)

- Environment: `happy-dom` (ESM-compatible DOM simulation)
- Coverage: v8 provider with thresholds
- Alias: `@/` maps to project root

### Playwright (`playwright.config.ts`)

- Browser: Chromium
- Base URL: `http://localhost:3000`
- Parallel: Enabled (local), Sequential (CI)
- Retries: 2 (CI only)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PATRIC_TOKEN` | For E2E | PATRIC auth token for browser tests |
| `NEXT_PUBLIC_USE_MODELSEED_API` | No | Enable ModelSEED API (default: true) |
| `NEXT_PUBLIC_MODELSEED_API_URL` | No | API base URL |

---

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/utils/exportCsv.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { objectsToCsv } from '@/lib/utils/exportCsv';

describe('exportCsv utils', () => {
  it('should convert objects to CSV string', () => {
    const data = [{ id: '1', name: 'Test' }];
    const result = objectsToCsv(data);
    expect(result).toBe('id,name\n1,Test');
  });
});
```

### API Integration Test Example

```typescript
// tests/unit/api/modelseed.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { listPublicMediaFromApi } from '@/lib/api/modelseed';

describe('ModelSEED API', () => {
  let isApiAvailable = true;

  beforeAll(async () => {
    try {
      await listPublicMediaFromApi();
    } catch {
      isApiAvailable = false;
    }
  });

  it('should list public media', async () => {
    if (!isApiAvailable) return;  // Skip if API unavailable
    const media = await listPublicMediaFromApi();
    expect(Array.isArray(media)).toBe(true);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('should login via PATRIC', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByLabel('PATRIC Username').fill('username');
  await page.getByRole('dialog').getByLabel('Password').fill('password');
  await page.getByRole('dialog').getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 15000 });
});
```

---

## Running Tests in CI

### GitHub Actions Workflow

The CI pipeline runs on:

- **Every push** to `develop` or `master`
- **Every pull request** to `develop` or `master`

| Job | Trigger | PATRIC_TOKEN Required |
|-----|---------|----------------------|
| Unit Tests | PR + Push | No |
| E2E Tests | Push only | Yes |

### Setting Up Secrets

1. Go to GitHub repository Settings
2. Navigate to Secrets and Variables > Actions
3. Add `PATRIC_TOKEN` with your PATRIC auth token

---

## Security Considerations

### Never Commit Tokens

- Auth tokens must NEVER be hardcoded in test files
- Use environment variables only
- Tests skip gracefully when `PATRIC_TOKEN` is not set

### Example (Correct)

```typescript
const TOKEN = process.env.PATRIC_TOKEN;

test.beforeEach(async ({ page }) => {
  if (!TOKEN) {
    test.skip(true, 'PATRIC_TOKEN not set');
    return;
  }
  // ...
});
```

### Example (Incorrect)

```typescript
// NEVER DO THIS
const TOKEN = process.env.PATRIC_TOKEN || 'hardcoded-token';
```

---

## Coverage Goals

| Area | Target | Status |
|------|--------|--------|
| Utility Functions | 90% | In Progress |
| API Clients | 80% | In Progress |
| UI Components | 60% | Planned |
| **Overall** | **70%** | In Progress |

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

---

## Adding New Tests

### Unit Tests

1. Create file: `tests/unit/<category>/<feature>.test.ts`
2. Use `describe`/`it` blocks matching file structure
3. Mock external dependencies with `vi.mock()`

### E2E Tests

1. Create file: `tests/e2e/<feature>.spec.ts`
2. Use Playwright's `test` and `expect`
3. Add auth setup in `beforeEach` if authenticated route

### Integration Tests

1. Create file: `tests/integration/<feature>.test.ts`
2. Use real API calls with graceful skip on failure

---

## Related Documentation

- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - Tech stack and API clients
- [AUTHENTICATION.md](../docs/AUTHENTICATION.md) - Auth system
- [WORKSPACE.md](../docs/WORKSPACE.md) - Workspace API
- [issues.md](../issues.md) - Known issues
