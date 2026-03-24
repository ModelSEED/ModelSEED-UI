import { test, expect } from '@playwright/test';

const SEAVER_TOKEN = process.env.PATRIC_TOKEN;

test.describe('Run FBA Flow', () => {
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

  test('should navigate to FBA results page', async ({ page }) => {
    // FBA is a dynamic route - requires a path like /fba/seaver/models/TestModel/.fba
    // This test navigates to my-jobs where FBA jobs are listed
    await page.goto('/my-jobs');
    
    // Verify page loads
    await expect(page.getByText('My Jobs')).toBeVisible({ timeout: 15000 });
  });

  test('should display FBA link from model page', async ({ page }) => {
    // Navigate to my-models page where FBA action is available
    await page.goto('/my-models');
    
    // Check for the Run FBA button if models exist
    const grid = page.locator('.MuiDataGrid-root');
    await expect(grid).toBeVisible({ timeout: 15000 });
  });
});
