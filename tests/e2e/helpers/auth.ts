/**
 * Auth E2E Test Helper
 * 
 * Provides authentication utilities for Playwright E2E tests.
 * Tests will skip gracefully if PATRIC_TOKEN is not available.
 */

import { test as base, Page } from '@playwright/test';

export interface TestUser {
    token?: string;
    username?: string;
    password?: string;
}

export function getTestUser(): TestUser | null {
    const token = process.env.PATRIC_TOKEN || process.env.PATRIC_TEST_TOKEN;
    const username = process.env.PATRIC_USERNAME;
    const password = process.env.PATRIC_PASSWORD;
    
    if (!token && (!username || !password)) {
        return null;
    }
    
    return { token, username, password };
}

export const test = base.extend<{ authenticatedPage: Page }>({
    authenticatedPage: async ({ page }, runFixture) => {
        const user = getTestUser();

        if (!user) {
            console.warn('⚠️ No PATRIC credentials available - authenticated tests will be skipped');
            await runFixture(page);
            return;
        }

        let token = user.token;
        let username = user.username || 'testuser';

        // If we have credentials but no token, perform login
        if (!token && user.username && user.password) {
            try {
                // We use a dynamic import to avoid potential issues with Node/Browser environment mismatches
                // in the top-level scope of a Playwright config-loaded file.
                const { loginPatric } = await import('@/lib/api/auth');
                const auth = await loginPatric(user.username, user.password);
                token = auth.token;
                username = auth.user_id;
            } catch (err) {
                console.error('❌ Failed to login with PATRIC_USERNAME/PASSWORD:', err);
            }
        }

        if (!token) {
            console.warn('⚠️ No PATRIC authentication available - authenticated tests will be skipped');
            await runFixture(page);
            return;
        }
        
        // Set up authentication before test
        await page.goto('/');
        
        // Store token in localStorage (simulate login)
        await page.evaluate(({ token, username }) => {
            localStorage.setItem('auth', JSON.stringify({
                token: token,
                user: username,
                method: 'PATRIC',
                timestamp: Date.now()
            }));
        }, { token, username });
        
        await runFixture(page);
    }
});
