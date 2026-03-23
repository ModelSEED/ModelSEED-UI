import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should login successfully via PATRIC', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for the Sign In button
    const signInBtn = page.getByRole('button', { name: 'Sign In' });
    await expect(signInBtn).toBeVisible();

    // The method typically defaults to RAST. Let's toggle to PATRIC
    const patricToggle = page.getByText('PATRIC', { exact: true });
    if (await patricToggle.isVisible()) {
      await patricToggle.click();
    }

    // Fill the credentials
    await page.getByLabel('PATRIC Username').fill('seaver');
    await page.getByLabel('Password').fill('bollocks');

    // Click Sign In
    await signInBtn.click();

    // Assert that we log in successfully
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 15000 });
  });
});
