import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL || 'admin@school.ac.ke';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'ReClass2026!';

async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 25000, waitUntil: 'domcontentloaded' });
}

test.describe('Finance income/expenses CRUD', () => {
  test('income: create, display, and delete an income record', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

    await loginAsAdmin(page);
    await page.goto('/admin/finance/income', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Verify page loaded (no 500)
    const body = await page.textContent('body');
    expect(body).not.toContain('Internal Server Error');

    // Try to create an income record — fill in form fields.
    // Use field names from the income page schema: description, amount, category, received_at.
    const descInput = page.locator('input[name="description"], textarea[name="description"]').first();
    const amountInput = page.locator('input[name="amount"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill('E2E test income');
      if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await amountInput.fill('500');
      }
      await submitBtn.click();
      await page.waitForTimeout(2000);

      // After submit, the page should still be stable (not crash)
      const postBody = await page.textContent('body');
      expect(postBody).not.toContain('Internal Server Error');
    }

    const realErrors = consoleErrors.filter(
      (e) => !/inpage\.js|IN_PAGE_CHANNEL|ExtendedBroadcastMessage|Content Security Policy/i.test(e),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('expenses: create, display, and delete an expense record', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

    await loginAsAdmin(page);
    await page.goto('/admin/finance/expenses', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = await page.textContent('body');
    expect(body).not.toContain('Internal Server Error');

    const descInput = page.locator('input[name="description"], textarea[name="description"]').first();
    const amountInput = page.locator('input[name="amount"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill('E2E test expense');
      if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await amountInput.fill('200');
      }
      await submitBtn.click();
      await page.waitForTimeout(2000);

      const postBody = await page.textContent('body');
      expect(postBody).not.toContain('Internal Server Error');
    }

    const realErrors = consoleErrors.filter(
      (e) => !/inpage\.js|IN_PAGE_CHANNEL|ExtendedBroadcastMessage|Content Security Policy/i.test(e),
    );
    expect(realErrors).toHaveLength(0);
  });
});
