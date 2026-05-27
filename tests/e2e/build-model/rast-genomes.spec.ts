import { test, expect, type Page, type Route } from '@playwright/test';

const PATRIC_TOKEN = process.env.PATRIC_TOKEN;

const MOCK_RAST_JOBS = [
    { owner: 'seaver', contig_count: 6188, genome_size: 6007980, mod_time: '2012-05-08 23:08:29', project: 'seaver_6666666', genome_name: 'Unknown sp.', type: 'Genome', id: '50639', creation_time: '2012-05-03 16:34:53', genome_id: '6666666.16170' },
    { owner: 'seaver', contig_count: 1, genome_size: 4641652, mod_time: '2017-09-12 14:09:39', project: 'seaver_6666666', genome_name: 'Escherichia coli str. K12 substr. MG1655', type: 'Genome', id: '502220', creation_time: '2017-09-12 14:00:24', genome_id: '6666666.279675' },
];

const MSSS_LIST_RESPONSE = { version: '1.1', result: [[...MOCK_RAST_JOBS]], id: 'list-rast-genomes' };
const MSSS_EMPTY_RESPONSE = { version: '1.1', result: [[]], id: 'list-rast-genomes' };
const PROXY_EMPTY_RESPONSE = { result: [[]] };

async function authenticatePage(page: Page, token: string): Promise<void> {
    await page.addInitScript((t: string) => {
        window.localStorage.setItem('auth', JSON.stringify({ user_id: 'seaver', token: t, method: 'PATRIC' }));
    }, token);
}

async function mockMsssListRoute(page: Page, response: object = MSSS_LIST_RESPONSE): Promise<void> {
    await page.route('**/services/ms_fba', async (route: Route) => {
        const postData = route.request().postDataJSON();
        if (postData?.method === 'MSSeedSupportServer.list_rast_jobs') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
        } else {
            await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ version: '1.1', error: { code: -32603, message: 'Mock error' }, id: postData?.id ?? 'mock' }) });
        }
    });
}

async function mockProxyRoute(page: Page, response: object = PROXY_EMPTY_RESPONSE): Promise<void> {
    await page.route('**/api/rast/jobs', async (route: Route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
    });
}

async function clickRastTab(page: Page): Promise<void> {
    await page.goto('/plant');
    await page.getByRole('tab', { name: /RAST Microbes/i }).click();
    await page.waitForTimeout(1000);
}

test.describe('RAST Genomes Table — Build Model Page', () => {

    test.describe('Authenticated: RAST table loads and displays genome jobs', () => {
        test.skip(!PATRIC_TOKEN, 'PATRIC_TOKEN not set in .env.local');

        test.beforeEach(async ({ page }) => {
            await authenticatePage(page, PATRIC_TOKEN!);
            await mockMsssListRoute(page);
            await mockProxyRoute(page);
        });

        test('displays RAST genome jobs in the data grid', async ({ page }) => {
            await clickRastTab(page);
            const grid = page.locator('.MuiDataGrid-root');
            await expect(grid).toBeVisible({ timeout: 10000 });
            await expect(grid.getByText('Escherichia coli str. K12 substr. MG1655')).toBeVisible({ timeout: 5000 });
            await expect(grid.getByText('6666666.279675')).toBeVisible({ timeout: 3000 });
        });

        test('shows Build Model button for each row', async ({ page }) => {
            await clickRastTab(page);
            const buildButtons = page.locator('button:has-text("Build Model")');
            await expect(buildButtons.first()).toBeVisible({ timeout: 10000 });
            expect(await buildButtons.count()).toBeGreaterThanOrEqual(2);
        });

        test('handles empty RAST job list gracefully', async ({ page }) => {
            await mockMsssListRoute(page, MSSS_EMPTY_RESPONSE);
            await clickRastTab(page);
            const banner = page.locator('text=RAST genome jobs are temporarily unavailable');
            await expect(banner).toBeVisible({ timeout: 10000 });
        });

        test('handles MSSS server error gracefully', async ({ page }) => {
            await page.route('**/services/ms_fba', async (route: Route) => {
                await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ version: '1.1', error: { code: -32603, message: 'Internal server error' }, id: 'list-rast-genomes' }) });
            });
            await clickRastTab(page);
            const banner = page.locator('text=RAST genome jobs are temporarily unavailable');
            await expect(banner).toBeVisible({ timeout: 10000 });
        });

        test('falls back to proxy when MSSS returns auth error', async ({ page }) => {
            await page.route('**/services/ms_fba', async (route: Route) => {
                await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ version: '1.1', error: { code: -32603, message: 'Authentication required' }, id: 'list-rast-genomes' }) });
            });
            await page.route('**/api/rast/jobs', async (route: Route) => {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MSSS_LIST_RESPONSE) });
            });
            await clickRastTab(page);
            const grid = page.locator('.MuiDataGrid-root');
            await expect(grid).toBeVisible({ timeout: 10000 });
            await expect(grid.getByText('Escherichia coli str. K12 substr. MG1655')).toBeVisible({ timeout: 5000 });
        });

        test('opens genome preview dialog on Build Model click', async ({ page }) => {
            await clickRastTab(page);
            const grid = page.locator('.MuiDataGrid-root');
            await expect(grid).toBeVisible({ timeout: 10000 });

            await page.locator('button:has-text("Build Model")').first().click();
            await page.waitForTimeout(1500);

            const dialog = page.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 8000 });
            await expect(dialog.getByText(/RAST Genome Data/)).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Unauthenticated: graceful empty state', () => {
        test('shows AuthGuard message when not logged in', async ({ page }) => {
            await mockMsssListRoute(page);
            await page.goto('/plant');
            await expect(page.getByText('Authentication Required')).toBeVisible({ timeout: 10000 });
        });

        test('does not throw console errors when unauthenticated', async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(err.message));

            await page.goto('/plant');
            await page.waitForTimeout(3000);
            expect(errors.filter(e => !e.includes('ResizeObserver'))).toEqual([]);
        });
    });
});
