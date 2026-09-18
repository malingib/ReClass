import { expect, test } from '@playwright/test';

// Live verification: real login against hosted Supabase + screenshots of
// every page touched by the welfare-connect UI steal.
// Run: npx playwright test --config apps/web-react/playwright.config.ts verify-steal
// Creds come from env so they never land in git:
//   ESHULE_EMAIL, ESHULE_PASSWORD
test.describe('verify welfare-connect steal (live)', () => {
  test('login + screenshot wired pages', async ({ page }) => {
    test.setTimeout(240000);
    const email = process.env.ESHULE_EMAIL;
    const password = process.env.ESHULE_PASSWORD;
    test.skip(!email || !password, 'ESHULE_EMAIL / ESHULE_PASSWORD not set');

    await page.goto('/login');
    await page.locator('#login-email').fill(email!);
    await page.locator('#login-password').fill(password!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });

    const shots: [string, string][] = [
      ['/admin', 'admin-dashboard'],
      ['/admin/students', 'students'],
      ['/finance', 'finance-overview'],
      ['/admin/fees', 'fee-collection'],
      ['/finance/receipts', 'receipts'],
      ['/admin/payments/unmatched', 'unmatched'],
      ['/finance/reports', 'finance-reports'],
      ['/admin/reports', 'admin-reports'],
    ];
    for (const [path, name] of shots) {
      await page.goto(path);
      // Let react-query settle; tolerate error/empty states on pilot data.
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `verify-shots/${name}.png`, fullPage: true });
    }
  });
});
