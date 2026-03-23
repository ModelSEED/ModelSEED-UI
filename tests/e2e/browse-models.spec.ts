import { test, expect } from '@playwright/test';

// Token MUST be provided via environment variable for security
// Set PATRIC_TOKEN in CI or local .env - never hardcode tokens
const SEAVER_TOKEN = process.env.PATRIC_TOKEN;

test.describe('Browse Models Flow', () => {
  test.beforeEach(async ({ page }) => {
    if (!SEAVER_TOKEN) {
      test.skip(true, 'PATRIC_TOKEN not set in environment');
      return;
    }
    
    // Inject token to bypass UI login and speed up tests
    await page.addInitScript((token) => {
      window.localStorage.setItem('auth', JSON.stringify({
        user_id: 'seaver',
        token: token,
        method: 'PATRIC',
      }));
    }, SEAVER_TOKEN);
  });

  test('should display user models grid', async ({ page }) => {
    // Navigate to models page
    await page.goto('/my-models');

    // Expect the heading to show up
    await expect(page.getByRole('heading', { name: /my models/i })).toBeVisible();

    // Verify the DataGrid loads
    const grid = page.locator('.MuiDataGrid-root');
    await expect(grid).toBeVisible({ timeout: 15000 });
  });
});
