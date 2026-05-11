/**
 * Test utilities for API-aware testing
 * 
 * Provides helpers for gracefully handling external API dependencies
 * in both unit tests and E2E tests.
 */

/**
 * Check if required environment variables are available
 */
export function getRequiredEnv(varName: string): string | undefined {
    return process.env[varName];
}

/**
 * Check if PATRIC token is available for authenticated tests
 */
export function hasPatricToken(): boolean {
    const token = process.env.PATRIC_TOKEN || process.env.PATRIC_TEST_TOKEN;
    return !!token && token.length > 0;
}

/**
 * Skip test if condition is met (for optional API tests)
 */
export function skipIf(condition: boolean, reason: string) {
    if (condition) {
        console.warn(`⚠️ Skipping test: ${reason}`);
        return true;
    }
    return false;
}

/**
 * API health check helper
 */
export async function checkApiHealth(baseUrl: string): Promise<boolean> {
    try {
        const response = await fetch(`${baseUrl}/api/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Configuration for test environments
 */
export const testConfig = {
    api: {
        baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://poplar.cels.anl.gov:8000',
        timeout: 30000,
    },
    auth: {
        patricToken: process.env.PATRIC_TOKEN || process.env.PATRIC_TEST_TOKEN,
    },
    test: {
        skipIfNoToken: true,
        retryAttempts: 3,
    }
};
