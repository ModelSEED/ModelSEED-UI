import { test, expect } from '@playwright/test';

// Token MUST be provided via environment variable for security
// Set PATRIC_TOKEN in CI or local .env - never hardcode tokens
const SEAVER_TOKEN = process.env.PATRIC_TOKEN;

test.describe('Build Model Flow', () => {
  test.beforeEach(async ({ page }) => {
    if (!SEAVER_TOKEN) {
      test.skip(true, 'PATRIC_TOKEN not set in environment');
      return;
    }
    
    // Inject token directly into localStorage
    await page.addInitScript((token) => {
      window.localStorage.setItem('auth', JSON.stringify({
        user_id: 'seaver',
        token: token,
        method: 'PATRIC',
      }));
    }, SEAVER_TOKEN);
  });

  test('should display the build plant model form', async ({ page }) => {
    // Navigate to plant build model page
    await page.goto('/plant');

    // Expect the heading (page says "Build Model")
    await expect(page.getByRole('heading', { name: /Build Model/i })).toBeVisible();

    // Verify some expected form fields
    await expect(page.getByLabel(/Name Model to build/i)).toBeVisible({ timeout: 10000 });
    
    const submitBtn = page.getByRole('button', { name: /Reconstruct/i }).or(page.getByRole('button', { name: /Build/i }));
    await expect(submitBtn).toBeVisible();
  });
});
