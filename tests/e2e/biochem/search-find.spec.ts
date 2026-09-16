import { test, expect } from '@playwright/test';

/**
 * Find-in-page search bar tests.
 *
 * The search bar sets DataGrid quickFilterValues → triggers server-side re-fetch
 * → only matching rows are returned.  GridHighlightText renders <mark> highlights
 * inside each cell that contains the matching text.
 *
 * The search bar commits on Enter (matches the per-column quick filter contract);
 * `fill` alone leaves the text in the draft state and does NOT trigger filtering.
 */
test.describe('Find in Page Search', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/biochem/reactions');
        await page.waitForSelector('[role="grid"]', { timeout: 30000 });
        // Wait for at least one data row
        await page.waitForFunction(
            () => {
                const grid = document.querySelector('[role="grid"]');
                return grid && grid.querySelectorAll('[role="row"]').length > 1;
            },
            { timeout: 30000 },
        );
    });

    test('grid loads with data rows', async ({ page }) => {
        await expect(page.locator('[role="grid"]')).toBeVisible();
        expect(await page.locator('[role="row"]').count()).toBeGreaterThan(1);
    });

    test('search box is visible with correct placeholder', async ({ page }) => {
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await expect(searchBox).toBeVisible();
    });

    test('typing filters rows to only matching ones', async ({ page }) => {
        const initialRows = await page.locator('[role="row"]').count();

        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('atp');
        await searchBox.press('Enter');
        await page.waitForTimeout(1500);

        const filteredRows = await page.locator('[role="row"]').count();
        // Must have at least header + 1 result
        expect(filteredRows).toBeGreaterThan(1);
        // Should be fewer than (or equal to) unfiltered total
        expect(filteredRows).toBeLessThanOrEqual(initialRows);
    });

    test('matching text is highlighted in cells', async ({ page }) => {
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('atp');
        await searchBox.press('Enter');
        await page.waitForTimeout(1500);

        // GridHighlightText renders <mark> inside cells
        const highlights = page.locator('[role="gridcell"] mark');
        await expect(highlights.first()).toBeVisible({ timeout: 5000 });
        expect(await highlights.count()).toBeGreaterThan(0);
    });

    test('cpd05331 marks only Glucoraphanin in the visible Equation result', async ({ page }) => {
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('cpd05331');
        await searchBox.press('Enter');

        const equationCell = page.locator('[role="gridcell"]', { hasText: 'Glucoraphanin' }).filter({ hasText: '<=>' }).first();
        await expect(equationCell).toBeVisible({ timeout: 30000 });
        const marks = equationCell.locator('mark');
        await expect(marks).toHaveCount(1, { timeout: 10000 });
        await expect(marks).toHaveText('Glucoraphanin');
    });

    test('highlighted mark text matches the search term (case-insensitive)', async ({ page }) => {
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('atp');
        await searchBox.press('Enter');
        await page.waitForTimeout(1500);

        const firstMark = page.locator('[role="gridcell"] mark').first();
        await expect(firstMark).toBeVisible({ timeout: 5000 });
        const text = await firstMark.innerText();
        expect(text.toLowerCase()).toBe('atp');
    });

    test('clear button removes filter and restores all rows', async ({ page }) => {
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('atp');
        await searchBox.press('Enter');
        await page.waitForTimeout(1500);

        const filteredRows = await page.locator('[role="row"]').count();

        const clearButton = page.locator('button[aria-label="Clear search"]');
        await expect(clearButton).toBeVisible();
        await clearButton.click();
        await page.waitForTimeout(1500);

        await expect(searchBox).toHaveValue('');

        // Row count should be back to unfiltered (more rows than filtered)
        const restoredRows = await page.locator('[role="row"]').count();
        expect(restoredRows).toBeGreaterThanOrEqual(filteredRows);

        // No highlights should remain
        expect(await page.locator('[role="gridcell"] mark').count()).toBe(0);
    });

    test('Escape key clears search', async ({ page }) => {
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('atp');
        await searchBox.press('Enter');
        await page.waitForTimeout(1500);

        // Input already equals committed term → Escape clears.
        await searchBox.press('Escape');
        await page.waitForTimeout(1500);

        await expect(searchBox).toHaveValue('');
        expect(await page.locator('[role="gridcell"] mark').count()).toBe(0);
    });

    test('search for "phos" returns rows and highlights across pagination', async ({ page }) => {
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('phos');
        await searchBox.press('Enter');
        await page.waitForTimeout(1500);

        // Should find rows (phosphate reactions exist in ModelSEED)
        const rows = await page.locator('[role="row"]').count();
        expect(rows).toBeGreaterThan(1); // header + at least 1 data row

        // Highlights should appear
        const marks = page.locator('[role="gridcell"] mark');
        await expect(marks.first()).toBeVisible({ timeout: 5000 });
        expect(await marks.count()).toBeGreaterThan(0);
    });

    test('no-match search returns empty grid gracefully', async ({ page }) => {
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('xyzxyzxyz_no_match_9999');
        await searchBox.press('Enter');
        await page.waitForTimeout(1500);

        // Only header row should remain (no data rows)
        const rows = await page.locator('[role="row"]').count();
        expect(rows).toBeLessThanOrEqual(2); // at most header + empty-state row

        // No highlights
        expect(await page.locator('[role="gridcell"] mark').count()).toBe(0);
    });

    test('Filter & Columns button still works alongside search', async ({ page }) => {
        // Apply a search first
        const searchBox = page.locator('input[placeholder*="Find in"]').first();
        await searchBox.fill('atp');
        await searchBox.press('Enter');
        await page.waitForTimeout(1500);

        // Filter panel should still open
        const filterButton = page.locator('button:has-text("Filter & Columns")');
        await expect(filterButton).toBeVisible();
        await filterButton.click();

        await expect(page.locator('text=Visible Columns').first()).toBeVisible({ timeout: 5000 });

        // Close without changes
        await page.locator('button:has-text("Cancel")').first().click();
    });
});

test('reaction quick search sends canonical 168 query and ignores a stale response', async ({ page }) => {
    const response = (docs: object[]) => ({
        responseHeader: { status: 0 },
        response: { numFound: docs.length, start: 0, docs },
    });
    const reaction = (id: string, name: string) => ({
        id,
        name,
        definition: 'cpd00001 => cpd00002',
        equation: 'cpd00001 => cpd00002',
        reversibility: '>',
        aliases: [],
        ec_numbers: [],
        pathways: [],
        is_obsolete: '0',
    });
    let releaseStale!: () => void;
    const staleResponse = new Promise<void>((resolve) => {
        releaseStale = resolve;
    });
    let sawCanonical168Query = false;

    await page.route('**/solr/**', async (route) => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get('q') ?? '';
        if (url.searchParams.get('rows') === '0') {
            await route.fulfill({ json: response([]) });
            return;
        }
        if (query.includes('id:*168*')) {
            sawCanonical168Query = query.includes('id:rxn00168');
            await staleResponse;
            await route.fulfill({ json: response([reaction('rxn00168', 'Stale numeric reaction')]) });
            return;
        }
        if (query.includes('id:*rxn00168*')) {
            await route.fulfill({ json: response([reaction('rxn00168', 'Current normalized reaction')]) });
            return;
        }
        await route.fulfill({ json: response([reaction('rxn00001', 'Initial reaction')]) });
    });

    await page.goto('/biochem/reactions');
    await expect(page.getByText('Initial reaction')).toBeVisible();

    const searchBox = page.locator('input[placeholder*="Find in"]').first();
    await searchBox.fill('168');
    await searchBox.press('Enter');
    await expect.poll(() => sawCanonical168Query).toBe(true);

    await searchBox.fill('rxn00168');
    await searchBox.press('Enter');
    await expect(page.getByText('Current normalized reaction')).toBeVisible();

    releaseStale();
    await page.waitForTimeout(250);
    await expect(page.getByText('Current normalized reaction')).toBeVisible();
    await expect(page.getByText('Stale numeric reaction')).toHaveCount(0);
});
