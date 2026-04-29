import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Read from default ".env" or ".env.local" file
dotenv.config({ path: '.env.local' });


export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium-staging',
      use: { ...devices['Desktop Chrome'], baseURL: 'https://staging.modelseed.org', headless: true },
    },
  ],
  webServer: undefined,
});
