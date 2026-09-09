import { test, expect } from '@playwright/test';

// Smoke spec for the React SPA (apps/web-react, dev on :5174).
// Run: npx playwright test --config apps/web-react/playwright.config.ts
test.describe('web-react smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('eShule login')).toBeVisible();
  });

  test('protected routes bounce to login when signed out', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unknown route shows not-found', async ({ page }) => {
    await page.goto('/no-such-page-xyz');
    await expect(page.getByText('Not found')).toBeVisible();
  });
});
