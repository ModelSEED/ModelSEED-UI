import { expect, test } from '@playwright/test';

test.describe('Biochemistry landing page', () => {
    test('homepage Biochemistry CTA links to the landing page', async ({ page }) => {
        await page.goto('/');

        const biochemistry = page.getByRole('link', { name: 'Biochemistry (No login required)' });
        await expect(biochemistry).toBeVisible();
        await expect(biochemistry).toHaveAttribute('href', '/biochem');
    });

    test('renders public reaction and compound links', async ({ page }) => {
        await page.goto('/biochem');

        await expect(page).toHaveURL(/\/biochem$/);
        await expect(page.getByRole('heading', { name: 'Biochemistry' })).toBeVisible();

        const reactions = page.getByRole('link', { name: 'Reactions' });
        await expect(reactions).toBeVisible();
        await expect(reactions).toHaveAttribute('href', '/biochem/reactions');

        const compounds = page.getByRole('link', { name: 'Compounds' });
        await expect(compounds).toBeVisible();
        await expect(compounds).toHaveAttribute('href', '/biochem/compounds');
    });
});
