import { test, expect } from '@playwright/test';

const SEAVER_TOKEN = process.env.PATRIC_TOKEN;

test.describe('Media Workflow Flow', () => {
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

  test('should display My Media page', async ({ page }) => {
    // Navigate to My Media page
    await page.goto('/my-media');
    
    // Verify page loads
    await expect(page.getByRole('heading', { name: /my media/i })).toBeVisible({ timeout: 15000 });
  });

  test('should display media DataGrid', async ({ page }) => {
    await page.goto('/my-media');
    
    // Verify DataGrid loads
    const grid = page.locator('.MuiDataGrid-root');
    await expect(grid).toBeVisible({ timeout: 15000 });
  });
});
