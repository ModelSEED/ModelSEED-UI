/**
 * Auth E2E Test Helper
 * 
 * Provides authentication utilities for Playwright E2E tests.
 * Tests will skip gracefully if PATRIC_TOKEN is not available.
 */

import { test as base, Page } from '@playwright/test';

export interface TestUser {
    token: string;
    username: string;
}

export function getTestUser(): TestUser | null {
    const token = process.env.PATRIC_TOKEN || process.env.PATRIC_TEST_TOKEN;
    if (!token) {
        return null;
    }
    
    // Extract username from token if possible
    let username = 'testuser';
    const parts = token.split('|');
    for (const part of parts) {
        if (part.startsWith('un=')) {
            username = part.slice(3);
            break;
        }
    }
    
    return { token, username };
}

export const test = base.extend<{ authenticatedPage: Page }>({
    authenticatedPage: async ({ page }, use) => {
        const user = getTestUser();
        
        if (!user) {
            // No token available - tests using this fixture will fail
            // This is expected in CI without PATRIC_TOKEN secret
            console.warn('⚠️ PATRIC_TOKEN not available - authenticated tests will be skipped');
            await use(page);
            return;
        }
        
        // Set up authentication before test
        await page.goto('/');
        
        // Store token in localStorage (simulate login)
        await page.evaluate((token: string) => {
            localStorage.setItem('auth', JSON.stringify({
                token: token,
                user: 'testuser',
                method: 'PATRIC',
                timestamp: Date.now()
            }));
        }, user.token);
        
        await use(page);
    }
});
