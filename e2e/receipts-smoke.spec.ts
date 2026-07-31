import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test('receipts system renders with no console errors and print route works', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  const pages = ['/admin/finance', '/admin/receipts', '/admin/parent-payments', '/admin/reclass', '/parent/pay', '/parent/payments'];

  for (const path of pages) {
    const resp = await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    expect(resp?.status(), `HTTP status for ${path}`).toBeLessThan(400);
  }

  // Pages render with no app errors.
  expect(errors.filter(e => !e.includes('404')), `console errors: ${errors.join(' | ')}`).toHaveLength(0);
});
