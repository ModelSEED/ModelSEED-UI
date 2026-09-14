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

    test('should expose reversibility accessibly and retain thermodynamics on the detail route', async ({ page }) => {
        const reversibilityHeader = page.getByRole('columnheader', { name: /Reversibility/ });
        await reversibilityHeader.scrollIntoViewIfNeeded();
        await expect(reversibilityHeader).toBeVisible();

        const badge = page.getByTestId('reversibility-badge').first();
        await badge.scrollIntoViewIfNeeded();
        await expect(badge).toHaveText('');
        await expect(badge).toHaveAttribute('aria-label', /Reversibility .*; evidence grade /);
        await expect(badge).toHaveAttribute('title', /Reversibility .*; evidence grade /);

        const reactionRow = badge.locator('xpath=ancestor::*[@role="row"]');
        const reactionLink = reactionRow.locator('a[href^="/biochem/reactions/"]');
        await expect(reactionLink).toBeVisible();
        await reactionLink.click();

        await expect(page).toHaveURL(/\/biochem\/reactions\/[^/?#]+$/);
        const thermoSummary = page.getByTestId('thermo-summary-band');
        await expect(thermoSummary).toBeVisible();
        await expect(thermoSummary.getByText('Recommended reversibility', { exact: true })).toBeVisible();
    });
});
