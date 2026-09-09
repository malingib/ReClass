import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev --workspace=@eshule/web-react',
    url: 'http://localhost:5173/login',
    reuseExistingServer: true,
  },
});
