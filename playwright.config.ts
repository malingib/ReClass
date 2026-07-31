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
      testMatch: /frontend-review\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
  ],
});
