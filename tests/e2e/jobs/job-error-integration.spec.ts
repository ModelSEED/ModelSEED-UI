/**
 * End-to-end coverage for the modelseed-api job-error integration paths
 * documented in modelseed-api/docs/JOB_ERROR_UI_INTEGRATION.md.
 *
 * Path 1 — sync 4xx on submit: pre-flight validation returns a structured
 *   { detail: { code, message, hint, field, retryable } } body that the UI
 *   should render as message + hint, with the affected input named.
 *
 * Path 2 — async job.error: /api/jobs polling returns `status: "failed"`
 *   with a stringy `error` field that the UI should surface as a tooltip on
 *   the Failed badge AND as a click-to-open detail dialog with parameters
 *   and progress.
 *
 * The tests stub the backend via `page.route`, so they run without real
 * PATRIC credentials. The dev server must be reachable (set
 * PLAYWRIGHT_BASE_URL or PLAYWRIGHT_PORT if not on the default :3000).
 */

import { test, expect, type Page } from '@playwright/test';

const STUB_TOKEN = 'stub-patric-token-for-routing-tests';

async function injectStubAuth(page: Page) {
    await page.goto('/');
    await page.evaluate((token) => {
        localStorage.setItem('auth', JSON.stringify({
            token,
            user_id: 'stubuser@patricbrc.org',
            method: 'PATRIC',
        }));
    }, STUB_TOKEN);
}

test.describe('Path 2: /my-jobs renders job.error from failed rows', () => {
    test.beforeEach(async ({ page }) => {
        // Stub the /api/jobs polling endpoint with a single failed job so the
        // grid always has a row to interact with regardless of auth state.
        await page.route('**/api/jobs**', async (route) => {
            const url = new URL(route.request().url());
            if (!url.pathname.endsWith('/api/jobs')) {
                return route.fallback();
            }
            await route.fulfill({
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'job-failed-token-expiry': {
                        id: 'job-failed-token-expiry',
                        app: 'GapfillModel',
                        status: 'failed',
                        progress: 'Saving model...',
                        error: 'WorkspaceError: Token validation failed: Token expired',
                        parameters: {
                            command: 'GapfillModel',
                            arguments: {
                                model: '/stubuser@patricbrc.org/modelseed/EcoliModel',
                                media: 'Complete',
                                template_type: 'gn',
                                output_path: '/stubuser@patricbrc.org/modelseed/EcoliModel',
                            },
                        },
                        submitTimestamp: new Date(Date.now() - 60_000).toISOString(),
                        startTimestamp: new Date(Date.now() - 50_000).toISOString(),
                    },
                }),
            });
        });

        await injectStubAuth(page);
        await page.goto('/my-jobs');
        // Auth-gated; if the AuthGuard couldn't hydrate, skip.
        const guardRedirected = await page
            .waitForURL('**/', { timeout: 3000 })
            .then(() => true)
            .catch(() => false);
        test.skip(guardRedirected, 'AuthGuard redirected to home — stub auth is not enough.');
        await page.waitForSelector('[role="grid"]', { timeout: 30_000 });
    });

    test('shows the error preview as a tooltip on the Failed chip', async ({ page }) => {
        const failedChip = page.locator('[data-failed-job-chip="true"]');
        await expect(failedChip).toBeVisible();
        await failedChip.hover();
        const tooltip = page.locator('[role="tooltip"]', {
            hasText: 'Token validation failed: Token expired',
        });
        await expect(tooltip).toBeVisible({ timeout: 5000 });
    });

    test('opens the detail dialog when the failed badge is clicked', async ({ page }) => {
        const failedChip = page.locator('[data-failed-job-chip="true"]');
        await failedChip.click();

        const dialog = page.getByTestId('failed-job-details-dialog');
        await expect(dialog).toBeVisible();

        const errorBlock = page.getByTestId('failed-job-error-text');
        await expect(errorBlock).toContainText('Token validation failed: Token expired');

        // Progress note from the stubbed job is surfaced verbatim.
        await expect(dialog).toContainText('Saving model...');

        // Parameters block contains the model arg.
        await expect(dialog).toContainText('EcoliModel');

        await dialog.getByRole('button', { name: 'Close' }).click();
        await expect(dialog).toBeHidden();
    });

    test('opens the detail dialog from the info icon action button', async ({ page }) => {
        const infoIcon = page.getByTestId('open-failed-job-job-failed-token-expiry');
        await expect(infoIcon).toBeVisible();
        await infoIcon.click();
        await expect(page.getByTestId('failed-job-details-dialog')).toBeVisible();
    });
});

test.describe('Path 1: sync 4xx detail surfaces structured error', () => {
    test('reconstruct submit renders backend message + hint + field when API returns GENOME_NOT_FOUND', async ({ page }) => {
        // Intercept the FastAPI reconstruct endpoint and return a structured
        // 404 matching the doc's GENOME_NOT_FOUND example.
        await page.route('**/api/jobs/reconstruct**', async (route) => {
            if (route.request().method() !== 'POST') return route.fallback();
            await route.fulfill({
                status: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    detail: {
                        code: 'GENOME_NOT_FOUND',
                        message: "Genome '9999999.9' could not be fetched from BV-BRC.",
                        hint: "Check the genome ID is correct (BV-BRC format, e.g. '83332.12').",
                        field: 'genome',
                        retryable: false,
                    },
                }),
            });
        });

        await injectStubAuth(page);
        await page.goto('/plant');

        // AuthGuard may bounce to home if our stub auth isn't accepted; skip then.
        const guardRedirected = await page
            .waitForURL('**/', { timeout: 3000 })
            .then(() => true)
            .catch(() => false);
        test.skip(guardRedirected, 'AuthGuard redirected to home — stub auth is not enough.');

        // Tab 1 is the microbe upload tab (PlantSEED tab 0 is in maintenance).
        // The submit handler runs `handleUploadSubmit` which requires a file +
        // a model name. Synthesize a tiny FASTA file in-memory.
        const fastaContent = '>contig1\nATGCATGCATGCATGCATGCATGC\n';
        await page.locator('input[type="file"]').setInputFiles({
            name: 'tiny.fa',
            mimeType: 'text/plain',
            buffer: Buffer.from(fastaContent, 'utf8'),
        });

        await page.getByLabel('Name Model to build', { exact: false }).fill('TestModel');

        await page.getByRole('button', { name: 'Build Model' }).click();

        // The Alert exposes data-error-code for stable selection regardless of
        // which severity it ends up rendering with.
        const errorAlert = page.locator('[data-error-code="GENOME_NOT_FOUND"]');
        await expect(errorAlert).toBeVisible({ timeout: 10_000 });
        await expect(errorAlert).toContainText("Genome '9999999.9' could not be fetched");
        await expect(errorAlert).toContainText('Check the genome ID is correct');
        await expect(errorAlert).toContainText('Affected input:');
        await expect(errorAlert).toContainText('genome');
    });
});

test.describe('Home-page session-expired notice', () => {
    test('shows the session-expired alert when redirected with ?reason=token_expired', async ({ page }) => {
        await page.goto('/?reason=token_expired');
        const notice = page.getByTestId('session-expired-notice');
        await expect(notice).toBeVisible();
        await expect(notice).toContainText('Session expired');
    });

    test('hides the session-expired alert without the query param', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByTestId('session-expired-notice')).toHaveCount(0);
    });
});
