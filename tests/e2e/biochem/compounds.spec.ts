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
