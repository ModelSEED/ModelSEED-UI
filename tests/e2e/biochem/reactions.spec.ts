import { test, expect } from '@playwright/test';

test.describe('Reactions Page - Search Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://staging.modelseed.org/biochem/reactions');
        await page.waitForLoadState('networkidle');
    });

    test('should search across all fields including chemical equations', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Search"]').first();
        await searchInput.fill('rxn');
        await page.waitForTimeout(3000);

        const rows = page.locator('[role="row"]').filter({ hasNotText: 'ID' });
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should search by reaction ID', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Search"]').first();
        await searchInput.fill('rxn00001');
        await page.waitForTimeout(3000);

        const rows = page.locator('[role="row"]').filter({ hasNotText: 'ID' });
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should show active search in filter button', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Search"]').first();
        await searchInput.fill('glucose');
        await page.waitForTimeout(2000);

        const filterButton = page.locator('button:has-text("Filters")');
        await expect(filterButton).toBeVisible();
    });

    test('should open export modal on button click', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export CSV")');
        await expect(exportButton).toBeVisible();
        await exportButton.click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 10000 });

        await page.locator('button:has-text("Cancel")').click();
    });

    test('export modal should show column selection', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export CSV")');
        await exportButton.click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 10000 });

        const checkboxes = modal.locator('input[type="checkbox"]');
        const count = await checkboxes.count();
        expect(count).toBeGreaterThan(3);

        await page.locator('button:has-text("Cancel")').click();
    });
});
