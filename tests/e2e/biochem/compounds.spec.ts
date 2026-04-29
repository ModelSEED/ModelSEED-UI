import { test, expect } from '@playwright/test';

test.describe('Compounds Page - Search & Display', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://staging.modelseed.org/biochem/compounds');
        await page.waitForLoadState('networkidle');
    });

    test('should search across all compound fields', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Search"]').first();
        await searchInput.fill('glucose');
        await page.waitForTimeout(3000);

        const rows = page.locator('[role="row"]').filter({ hasNotText: 'ID' });
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should open export modal with column selection', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export CSV")');
        await expect(exportButton).toBeVisible();
        await exportButton.click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 10000 });

        await page.locator('button:has-text("Cancel")').click();
    });
});
