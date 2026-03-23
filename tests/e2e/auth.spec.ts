import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should login successfully via PATRIC', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Click the Sign In button in header to open modal
    await page.getByRole('banner').getByRole('button', { name: 'Sign In' }).click();

    // Wait for modal to appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Default method is PATRIC, so just fill credentials in the dialog
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('PATRIC Username').fill('seaver');
    await dialog.getByLabel('Password').fill('bollocks');

    // Submit the form
    await dialog.getByRole('button', { name: 'Sign In' }).click();

    // Assert that we log in successfully
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 15000 });
  });
});
