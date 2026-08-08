import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npx vite dev --port 5180',
    port: 5180,
    reuseExistingServer: true,
    timeout: 120000,
  },
  testDir: 'e2e',
  timeout: 300000,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/audit-results.json' }]],
  use: {
    baseURL: 'http://localhost:5180',
    headless: true,
    screenshot: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /audit-auth-setup\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'audit',
      dependencies: ['setup'],
      testMatch: /comprehensive-audit\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
  ],
});
