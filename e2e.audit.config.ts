import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npx vite dev --port 5173 --host 0.0.0.0',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60000,
  },
  testDir: 'e2e',
  testMatch: 'full-audit.spec.ts',
  timeout: 60000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  projects: [
    {
      name: 'audit',
      testMatch: 'full-audit.spec.ts',
      use: { browserName: 'chromium' },
    },
  ],
});
