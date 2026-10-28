import { test, expect, type Page } from '@playwright/test';

const specialCharacterSearch = '3-(methylsulfinyl)propyl-glucosinolate';
const noMatchSearch = 'modelseed-e2e-no-match-4f1dcb0e';

function compoundRows(page: Page) {
    return page.locator('[role="grid"] [role="row"]:has([role="gridcell"])');
}

async function waitForGridData(page: Page): Promise<void> {
    await expect(page.locator('[role="grid"]')).toBeVisible();
    await expect(compoundRows(page).first()).toBeVisible({ timeout: 30_000 });
}

async function search(page: Page, value: string): Promise<void> {
    const input = page.getByPlaceholder('Find in compounds...');
    await input.fill(value);
    await input.press('Enter');
}

test.describe('Compounds Page - real Solr UI coverage', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        const simulateSolrFailure = testInfo.title === 'shows a user-visible error when the live Solr request fails';
        if (simulateSolrFailure) {
            await page.route('**/solr/compounds*/select?**', (route) => route.abort('failed'));
        }
        await page.goto('/biochem/compounds');
        if (!simulateSolrFailure) await waitForGridData(page);
    });

    test('searches by compound ID and restores the initial page after reset', async ({ page }) => {
        const firstRow = compoundRows(page).first();
        const initialId = (await firstRow.locator('[data-field="id"]').innerText()).trim();

        await search(page, 'cpd05323');
        await expect(page.locator('a[href="/biochem/compounds/cpd05323"]')).toBeVisible({ timeout: 30_000 });

        await page.getByRole('button', { name: 'Clear search' }).click();
        await expect(page.getByPlaceholder('Find in compounds...')).toHaveValue('');
        await expect(firstRow.locator('[data-field="id"]')).toHaveText(initialId, { timeout: 30_000 });
    });

    test('searches a stable compound synonym containing special characters', async ({ page }) => {
        await search(page, specialCharacterSearch);
        await expect(page.locator('a[href="/biochem/compounds/cpd05323"]')).toBeVisible({ timeout: 30_000 });
        await expect(compoundRows(page)).toHaveCount(1, { timeout: 30_000 });
    });

    test('paginates, filters, and presents a deterministic empty state against live Solr', async ({ page }) => {
        const pageLabel = page.locator('.MuiTablePagination-displayedRows').first();
        await expect(pageLabel).toContainText('1–25 of', { timeout: 10_000 });

        await page.getByRole('button', { name: 'Go to next page' }).click();
        await expect(pageLabel).toContainText('26–50 of', { timeout: 30_000 });

        const quickFilter = page.getByRole('button', { name: /(Quick filter for|Edit filter for) ID/ });
        await quickFilter.click();
        const filterInput = page.getByRole('textbox', { name: 'Value' });
        await expect(filterInput).toBeVisible();
        await filterInput.fill('cpd0');
        await filterInput.press('Enter');
        await expect(pageLabel).toContainText('1–25 of', { timeout: 30_000 });
        await expect(compoundRows(page).first()).toBeVisible();

        await quickFilter.click();
        await page.getByRole('button', { name: 'Clear', exact: true }).click();
        await expect(page.getByRole('button', { name: /Quick filter for ID/ })).toBeVisible();

        await search(page, noMatchSearch);
        await expect(compoundRows(page)).toHaveCount(0, { timeout: 30_000 });
    });

    test('shows a user-visible error when the live Solr request fails', async ({ page }) => {
        await expect(page.getByRole('alert').filter({ hasText: 'Unable to load compounds' }))
            .toContainText('Unable to load compounds', { timeout: 30_000 });
        await expect(compoundRows(page)).toHaveCount(0);
    });

    test('opens export with the active live-search context', async ({ page }) => {
        await search(page, 'glucoiberin');
        await expect(page.locator('a[href="/biochem/compounds/cpd05323"]')).toBeVisible({ timeout: 30_000 });
        await page.getByRole('button', { name: 'Export CSV' }).click();
        await expect(page.getByRole('dialog', { name: 'Export Data' })).toBeVisible();
    });
});
