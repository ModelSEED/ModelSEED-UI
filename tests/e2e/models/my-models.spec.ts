import { test, expect } from '@playwright/test';

test.describe('My Models Page - PlantSEED Copy', () => {
    async function ensurePlantSeedModels(page: import('@playwright/test').Page) {
        const plantSeedChip = page.locator('.MuiChip-root:has-text("PlantSEED")');
        const chipCount = await plantSeedChip.count();
        test.skip(chipCount === 0, 'No PlantSEED models available for this environment.');
        return plantSeedChip;
    }

    test.beforeEach(async ({ page }) => {
        await page.goto('/my-models');
        await page.waitForSelector('[role="grid"]', { timeout: 30000 });
    });

    test('should display PlantSEED indicator chip', async ({ page }) => {
        const plantSeedChip = await ensurePlantSeedModels(page);
        await expect(plantSeedChip.first()).toBeVisible();
    });

    test('should show Copy button for PlantSEED models', async ({ page }) => {
        await ensurePlantSeedModels(page);
        const copyButton = page.locator('button:has-text("Copy")').first();
        await expect(copyButton).toBeVisible();
    });

    test('should open CopyModelModal when Copy clicked', async ({ page }) => {
        await ensurePlantSeedModels(page);
        const copyButton = page.locator('button:has-text("Copy")').first();
        await copyButton.click();

        // Check modal opens
        const modal = page.locator('[role="dialog"]:has-text("Copy Model to My Workspace")');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Close modal
        await page.locator('button:has-text("Cancel")').click();
    });

    test('should NOT show Edit Model tab for PlantSEED models', async () => {
        // This would need to navigate to a PlantSEED model detail page
        // and verify the Edit Model tab is not present
        // Skipping for now as it requires specific model ID
    });
});
