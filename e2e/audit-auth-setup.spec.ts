import { test as setup } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

const ADMIN = { email: 'admin@school.ac.ke', password: 'ReClass2026!' };
const authFile = 'playwright/.auth/audit-user.json';

setup('authenticate admin for audit', async ({ page }) => {
  // Reuse the cached session — repeated logins trip the server's rate limiter.
  if (existsSync(authFile)) return;

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);

  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.click('button[type="submit"]');
    // /admin is a pure module launcher → redirects to /admin/modules.
    try {
      await page.waitForURL(/\/admin/, { timeout: 45000, waitUntil: 'domcontentloaded' });
      break;
    } catch {
      // Rate-limited or transient — check for the rate-limit message and back off.
      const body = await page.textContent('body').catch(() => '');
      const rateLimited = /too many login attempts|try again in 60 seconds/i.test(body ?? '');
      if (rateLimited && attempt < 3) {
        console.log(`[setup] rate-limited on attempt ${attempt}; waiting 65s…`);
        await page.waitForTimeout(65000);
        continue;
      }
      throw new Error(`Login failed after attempt ${attempt}: ${(body ?? '').slice(0, 200)}`);
    }
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  mkdirSync('playwright/.auth', { recursive: true });
  await page.context().storageState({ path: authFile });
});
