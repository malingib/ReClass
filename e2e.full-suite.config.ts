import { defineConfig } from '@playwright/test';

// Runs the repo's EXISTING e2e specs against the dev server.
// The default playwright.config.ts uses `vite preview`, which requires a
// production build — and @sveltejs/adapter-vercel refuses to build on
// Node 26. This config lets the full suite run on the dev server instead.
export default defineConfig({
  webServer: {
    command: 'npx vite dev --port 5181',
    port: 5181,
    reuseExistingServer: true,
    timeout: 120000,
  },
  testDir: 'e2e',
  timeout: 120000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5181',
    headless: true,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /_auth-setup\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'full-suite',
      dependencies: ['setup'],
      testIgnore: /_auth-setup\.spec\.ts|comprehensive-audit\.spec\.ts|audit-auth-setup\.spec\.ts|full-audit\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
  ],
});
