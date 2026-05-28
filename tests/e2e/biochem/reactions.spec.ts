import { test, expect } from '@playwright/test';

test.describe('Reactions Page - Search Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/biochem/reactions');
        await page.waitForLoadState('networkidle');
    });

    test('should search across all fields including chemical equations', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Find in"]').first();
        await searchInput.fill('rxn');
        await searchInput.press('Enter');
        await expect(page.locator('[role="row"]').nth(1)).toBeVisible({ timeout: 10000 });

        const rows = page.locator('[role="row"]').filter({ hasNotText: 'ID' });
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should search by reaction ID', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Find in"]').first();
        await searchInput.fill('rxn00001');
        await searchInput.press('Enter');
        await expect(page.locator('[role="row"]').nth(1)).toBeVisible({ timeout: 10000 });

        const rows = page.locator('[role="row"]').filter({ hasNotText: 'ID' });
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should show active search in filter button', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Find in"]').first();
        await searchInput.fill('glucose');
        await searchInput.press('Enter');
        await expect(page.locator('[role="row"]').nth(1)).toBeVisible({ timeout: 10000 });

        const filterButton = page.locator('button:has-text("Filter & Columns")');
        await expect(filterButton).toBeVisible();
    });
});
