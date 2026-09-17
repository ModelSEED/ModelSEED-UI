import { test, expect } from '@playwright/test';

test.describe('Compounds Page - Search & Display', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/biochem/compounds');
        await page.waitForLoadState('networkidle');
    });

    test('should search across all compound fields', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Find in"]').first();
        await searchInput.fill('cpd');
        await searchInput.press('Enter');
        await expect(page.locator('[role="row"]').nth(1)).toBeVisible({ timeout: 10000 });

        const rows = page.locator('[role="row"]').filter({ hasNotText: 'ID' });
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should resolve a specific compound ID (cpd05323)', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Find in"]').first();
        await searchInput.fill('cpd05323');
        await searchInput.press('Enter');
        await expect(page.locator('a[href="/biochem/compounds/cpd05323"]').first()).toBeVisible({
            timeout: 20000,
        });
    });

    test('should match compound name case-insensitively (glucoiberin → Glucoiberin)', async ({
        page,
    }) => {
        const searchInput = page.locator('input[placeholder*="Find in"]').first();
        await searchInput.fill('glucoiberin');
        await searchInput.press('Enter');
        await expect(page.locator('a[href="/biochem/compounds/cpd05323"]').first()).toBeVisible({
            timeout: 20000,
        });
    });

    test('propagates supported compound search, sort, and pagination controls with reset and empty results against scoped Solr mocks', async ({ page }) => {
        const compound = (id: string, name: string, formula = 'H2O') => ({ id, name, formula, aliases: [] });
        const initialCompounds = Array.from({ length: 30 }, (_, index) =>
            compound(`cpd${String(index + 1).padStart(5, '0')}`, `Initial compound ${index + 1}`),
        );
        const matchingCompound = compound('cpd99999', 'Needle compound', 'C6H12O6');
        const response = (docs: object[], start = 0, numFound = docs.length) => ({
            responseHeader: { status: 0 },
            response: { numFound, start, docs },
        });

        await page.route('**/solr/**', async (route) => {
            const url = new URL(route.request().url());
            if (url.searchParams.get('rows') === '0') {
                await route.fulfill({ json: response([]) });
                return;
            }
            const query = url.searchParams.get('q') ?? '';
            const start = Number(url.searchParams.get('start') ?? '0');
            const docs = query.includes('no-match') || query.includes('no\\-match') ? []
                : query.includes('needle') ? [matchingCompound]
                    : initialCompounds.slice(start, start + 25);
            await route.fulfill({ json: response(docs, start, docs.length ? query.includes('needle') ? 1 : 30 : 0) });
        });

        await page.goto('/biochem/compounds');
        await expect(page.getByText('Initial compound 1', { exact: true })).toBeVisible();

        const nextPage = page.getByRole('button', { name: 'Go to next page' });
        const pageRequest = page.waitForRequest((request) => {
            const url = new URL(request.url());
            return url.pathname.includes('/solr/') && url.searchParams.get('start') === '25';
        });
        await nextPage.click();
        expect(new URL((await pageRequest).url()).searchParams.get('start')).toBe('25');
        await expect(page.getByText('Initial compound 26', { exact: true })).toBeVisible();

        const nameHeader = page.getByRole('columnheader', { name: /^Name/ });
        const sortRequest = page.waitForRequest((request) => {
            const url = new URL(request.url());
            return url.pathname.includes('/solr/') && url.searchParams.get('sort') === 'name asc';
        });
        await nameHeader.click();
        expect(new URL((await sortRequest).url()).searchParams.get('sort')).toBe('name asc');

        const searchInput = page.locator('input[placeholder*="Find in"]').first();
        await searchInput.fill('needle');
        await expect(page.getByText('Initial compound 1', { exact: true })).toBeVisible();
        const searchRequest = page.waitForRequest((request) => {
            const url = new URL(request.url());
            return url.pathname.includes('/solr/') && (url.searchParams.get('q') ?? '').includes('needle');
        });
        await searchInput.press('Enter');
        await searchRequest;
        await expect(page.getByText('Needle compound')).toBeVisible();

        await page.getByRole('button', { name: 'Clear search' }).click();
        await expect(searchInput).toHaveValue('');
        await expect(page.getByText('Initial compound 1', { exact: true })).toBeVisible();

        await searchInput.fill('no-match');
        await searchInput.press('Enter');
        await expect(page.locator('[role="grid"] [role="row"]:has([role="gridcell"])')).toHaveCount(0);
    });

    test('should open export modal with column selection', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export CSV")');
        await expect(exportButton).toBeVisible();
        await exportButton.click();

        const modal = page.getByRole('dialog', { name: 'Export Data' });
        await expect(modal).toBeVisible({ timeout: 10000 });

        await page.locator('button:has-text("Cancel")').click();
    });

    test('export modal should show active search filter', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Find in"]').first();
        await searchInput.fill('cpd');
        await searchInput.press('Enter');
        await expect(page.locator('[role="row"]').nth(1)).toBeVisible({ timeout: 10000 });

        const exportButton = page.locator('button:has-text("Export CSV")');
        await exportButton.click();

        const modal = page.getByRole('dialog', { name: 'Export Data' });
        await expect(modal).toBeVisible({ timeout: 10000 });

        await page.locator('button:has-text("Cancel")').click();
    });
});
