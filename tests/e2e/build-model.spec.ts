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

    // Expect the heading
    await expect(page.getByRole('heading', { name: /Build Plant Model/i })).toBeVisible();

    // Verify some expected form fields (e.g. Workspace selection, Model Name)
    await expect(page.getByText(/Target Workspace/i)).toBeVisible();
    await expect(page.getByLabel(/Output Model Name/i)).toBeVisible();
    
    const submitBtn = page.getByRole('button', { name: /Reconstruct/i }).or(page.getByRole('button', { name: /Build/i }));
    await expect(submitBtn).toBeVisible();
  });
});
