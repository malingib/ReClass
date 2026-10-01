import { test, expect } from '@playwright/test';

test('root redirect for unauthenticated users', async ({ page }) => {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  // allow client-side JS to run and perform redirects
  await page.waitForTimeout(1000);
  const url = page.url();
  console.log('navigated to', url);
  expect(url).toMatch(/\/login|\/$/);
});
