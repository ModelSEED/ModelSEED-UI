# ModelSEED-UI E2E Test Suite

## What is Playwright?

[Playwright](https://playwright.dev/) is a modern end-to-end testing framework developed by Microsoft. It allows you to write tests that simulate real user interactions with your web application in a browser.

### Key Features

- **Multi-browser support**: Tests run in Chromium, Firefox, and WebKit
- **Automatic waiting**: Playwright automatically waits for elements to be ready before interacting
- **Network interception**: Can mock API responses and monitor network requests
- **Screenshots/videos**: Built-in support for capturing visual evidence
- **Parallel execution**: Tests run in parallel for faster feedback

## Why Use E2E Tests?

End-to-end (E2E) tests verify that your application works correctly from the user's perspective by simulating real browser interactions. They catch bugs that unit tests miss and give confidence that features actually work.

## Prerequisites

### Required Environment Variables

Create a `.env.local` file with your PATRIC credentials:

```bash
# .env.local
NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MODELSEED_API=true
PATRIC_TOKEN=your_patric_token_here
PATRIC_USERNAME=your_username
PATRIC_PASSWORD=your_password
```

**Note**: The test suite will skip authenticated tests if `PATRIC_TOKEN` is not set.

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test tests/e2e/suite.spec.ts
```

### Run tests in UI mode (visual)
```bash
npx playwright test --ui
```

### Run with visible browser
```bash
npx playwright test --headed
```

### Run specific test by name
```bash
npx playwright test -g "homepage"
```

### Generate test report
```bash
npx playwright show-report
```

## Test Organization

The test suite is organized into logical groups:

| Category | Description |
|----------|-------------|
| `01-public-pages.spec.ts` | Tests for public-facing pages (Home, About, Team, etc.) |
| `02-reference-data.spec.ts` | Tests for reference data pages (Biochem, Genomes, Media) |
| `03-authenticated.spec.ts` | Tests requiring authentication (My Models, My Media, My Jobs) |
| `04-model-detail.spec.ts` | Tests for model detail page and all its tabs |
| `05-analysis.spec.ts` | Tests for FBA, Gapfilling, and Compare features |
| `06-navigation.spec.ts` | Tests for navigation between pages |
| `07-edge-cases.spec.ts` | Tests for error handling and edge cases |

## Authentication

Tests use localStorage injection to authenticate:

```typescript
async function authenticatePage(page: any, token: string) {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('auth', JSON.stringify({
      user_id: 'seaver',
      token: t,
      method: 'PATRIC',
    }));
  }, token);
}
```

This bypasses the login UI and directly sets the auth token.

## Test Best Practices

1. **Use semantic test names**: Test names should describe what they verify
2. **One assertion per test**: Makes debugging easier
3. **Use waits wisely**: Playwright's auto-wait is usually sufficient
4. **Clean up after tests**: Reset state between tests if needed
5. **Handle missing elements gracefully**: Use `.isVisible()` checks before asserting

## Debugging Failed Tests

### Take a screenshot on failure
Screenshots are automatically captured on test failure in the `test-results/` folder.

### View test traces
```bash
npx playwright show-trace test-results/*.zip
```

### Debug with breakpoints
```bash
npx playwright test --debug
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run E2E Tests
  run: npx playwright test
```

## Configuration

See `playwright.config.ts` for test configuration options:

- `testDir`: Directory containing tests (default: `./tests/e2e`)
- `retries`: Number of retries for failed tests
- `workers`: Number of parallel workers
- `reporter`: Test report format (html, json, junit, etc.)
- `baseURL`: Base URL for all tests
- `trace`: Tracing mode for failed tests
