# Testing Platform (`TESTING.md`)

> **Quick Reference**
> - Tests Location: `tests/` directory
> - Unit Tests: `tests/unit/` (Vitest)
> - E2E Tests: `tests/e2e/` (Playwright) - 59 comprehensive tests
> - API Tests: `scripts/api-test.mjs` - Direct endpoint testing
> - CI/CD: `.github/workflows/ci.yml`

This document covers the testing infrastructure that enables safe JavaScript framework updates and catches regressions before they reach users.

---

## Testing Stack

| Layer | Tool | Speed | Coverage |
|-------|------|-------|---------|
| **Unit Tests** | Vitest | < 1s | Utility functions, API clients |
| **API Tests** | Node.js | 5-10s | Direct endpoint validation |
| **E2E Tests** | Playwright | 30-60s | Critical user workflows (59 tests) |

### Why This Stack?

- **Vitest**: Native ESM support, 2-3x faster than Jest, official Next.js 16 recommendation
- **Playwright**: GitHub-native integration, professional-grade browser automation
- **happy-dom**: Better ESM compatibility than jsdom for Next.js 16

---

## Available Commands

```bash
# Unit tests (watch mode)
npm test

# Unit tests (single run)
npm run test:run

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with browser UI
npm run test:e2e:ui

# API smoke tests
npm run test:poplar-smoke
```

---

## Test Organization

### Unit Tests (`tests/unit/`)

Tests for individual functions and modules in isolation.

```
tests/unit/
├── api/
│   ├── auth.test.ts         # loginPatric, loginRast, token handling
│   ├── biochem.test.ts      # Solr compound/reaction queries
│   ├── modelseed.test.ts    # Model, Media, Job API calls
│   └── workspace.test.ts    # Workspace ls/get operations
└── utils/
    └── exportCsv.test.ts    # CSV generation utilities
```

### E2E Tests (`tests/e2e/`)

Browser-based tests that verify complete user workflows.

```
tests/e2e/
├── auth.spec.ts             # PATRIC/RAST login flow
├── browse-models.spec.ts    # My Models page navigation
├── build-model.spec.ts      # Plant model builder
├── media-workflow.spec.ts   # Media editor
├── model-detail.spec.ts     # Model detail tabs
└── run-fba.spec.ts         # FBA analysis
```

---

## Writing Tests

### Unit Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('@/lib/api/external', () => ({
  fetchData: vi.fn(),
}));

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something specific', () => {
    const result = someFunction(input);
    expect(result).toBe(expected);
  });
});
```

### API Integration Test Pattern

```typescript
describe('API Feature', () => {
  let isApiAvailable = true;

  beforeAll(async () => {
    try {
      await actualApiCall();
    } catch (e) {
      isApiAvailable = false;
    }
  });

  it('should work when API available', async () => {
    if (!isApiAvailable) return;  // Graceful skip
    const result = await actualApiCall();
    expect(result).toBeDefined();
  });
});
```

### E2E Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Auth setup if needed
    await page.goto('/');
  });

  test('should complete workflow', async ({ page }) => {
    await page.click('[data-testid="action"]');
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The test workflow (`.github/workflows/test.yml`) runs on:

| Event | Unit Tests | E2E Tests |
|-------|------------|-----------|
| Pull Request | Yes | No |
| Push to `develop` | Yes | Yes |
| Push to `master` | Yes | Yes |

### Required Secrets

| Secret | Description |
|--------|-------------|
| `PATRIC_TOKEN` | PATRIC authentication token for E2E tests |

### Coverage Enforcement

Coverage thresholds are set in `vitest.config.ts`:

```typescript
thresholds: {
  lines: 10,      // Currently 10%, increase as tests grow
  functions: 10,
  branches: 10,
  statements: 10,
}
```

---

## Environment Configuration

### Development

```bash
# Local development with tests
npm run test:run

# With coverage
npm run test:coverage

# E2E with browser UI
npm run test:e2e:ui
```

### CI Environment Variables

```yaml
NEXT_PUBLIC_USE_MODELSEED_API: 'true'
NEXT_PUBLIC_MODELSEED_API_URL: 'http://poplar.cels.anl.gov:8000'
PATRIC_TOKEN: ${{ secrets.PATRIC_TOKEN }}
```

---

## Best Practices

### Security

1. **Never commit tokens** - Use environment variables only
2. **Skip on missing secrets** - Tests should handle missing `PATRIC_TOKEN`
3. **No sensitive data** - Use test accounts with limited access

### Test Design

1. **One assertion per test** - Each test should verify one thing
2. **Descriptive names** - Test names should describe expected behavior
3. **Arrange-Act-Assert** - Structure tests clearly
4. **Fast feedback** - Keep unit tests under 100ms

### API Tests

1. **Graceful degradation** - Skip tests when APIs unavailable
2. **Real responses** - Test against actual API responses when possible
3. **Error handling** - Verify error paths work correctly

---

## Troubleshooting

### Tests Pass Locally But Fail in CI

1. Verify `PATRIC_TOKEN` is set in GitHub secrets
2. Check environment variables match local setup
3. Review Playwright browser installation logs

### E2E Tests Timeout

1. Increase timeout: `await expect(locator).toBeVisible({ timeout: 30000 })`
2. Check network connectivity in CI
3. Verify dev server starts correctly

### Coverage Below Threshold

1. Add more tests for untested code paths
2. Increase threshold gradually as test suite grows
3. Focus on critical paths first (API clients, auth)

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and API clients
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Auth system details
- [WORKSPACE.md](./WORKSPACE.md) - Workspace API
- `tests/README.md` - Quick reference for test commands
