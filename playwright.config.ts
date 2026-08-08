import { defineConfig } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  webServer: {
    command: 'npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120000,
  },
  testDir: 'e2e',
  timeout: 30000,
  retries: CI ? 2 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /_auth-setup\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      // All specs share the session produced by the setup project. The login
      // rate limiter (5/min per IP) makes per-test logins flaky, so specs must
      // consume the storageState instead of re-authenticating.
      testMatch: /frontend-review\.spec\.ts|nav-audit\.spec\.ts|receipts-smoke\.spec\.ts|app\.spec\.ts|role-auth\.spec\.ts|scope-check\.spec\.ts|finance-crud\.spec\.ts|walk-all\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
  ],
});
