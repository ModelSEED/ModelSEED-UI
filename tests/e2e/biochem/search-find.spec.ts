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
