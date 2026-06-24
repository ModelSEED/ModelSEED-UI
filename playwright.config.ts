import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Read from default ".env" or ".env.local" file
dotenv.config({ path: '.env.local' });

// Allow tests to target an already-running dev server on a non-default port
// (e.g. when port 3000 is occupied by another process). Set PLAYWRIGHT_PORT
// or PLAYWRIGHT_BASE_URL to override the defaults.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;


export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium-local',
      use: { ...devices['Desktop Chrome'], baseURL, headless: true },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
