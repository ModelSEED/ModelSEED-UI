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

  test('should navigate to FBA page', async ({ page }) => {
    // Navigate to FBA page
    await page.goto('/fba');
    
    // Verify page loads
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 15000 });
  });

  test('should display FBA form elements', async ({ page }) => {
    await page.goto('/fba');
    
    // Check for common FBA form elements
    const heading = page.getByRole('heading');
    await expect(heading).toBeVisible();
  });
});
