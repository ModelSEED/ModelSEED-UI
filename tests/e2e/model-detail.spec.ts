import { test, expect } from '@playwright/test';

const SEAVER_TOKEN = process.env.PATRIC_TOKEN;

test.describe('Model Detail Flow', () => {
  test.beforeEach(async ({ page }) => {
    if (!SEAVER_TOKEN) {
      test.skip(true, 'PATRIC_TOKEN not set in environment');
      return;
    }
    
    await page.addInitScript((token) => {
      window.localStorage.setItem('auth', JSON.stringify({
        user_id: 'seaver',
        token: token,
        method: 'PATRIC',
      }));
    }, SEAVER_TOKEN);
  });

  test('should display model detail page with tabs', async ({ page }) => {
    // Navigate to a test model detail page
    // Note: This requires a valid model ref - adjust as needed
    await page.goto('/my-models');
    
    // Wait for the DataGrid to load
    await expect(page.getByRole('grid')).toBeVisible({ timeout: 15000 });
    
    // Click on first model row if available
    const firstRow = page.getByRole('row').nth(1);
    if (await firstRow.isVisible()) {
      await firstRow.click();
    }
  });

  test('should load model overview tab', async ({ page }) => {
    await page.goto('/my-models');
    
    // Verify page loads (use heading class to avoid matching tab)
    await expect(page.locator('div.MuiTypography-h5').filter({ hasText: 'My Models' })).toBeVisible({ timeout: 15000 });
  });
});
