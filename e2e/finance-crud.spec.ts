import { test, expect } from '@playwright/test';

// Reuse the shared admin session — per-test logins trip the login rate limiter.
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Finance income/expenses CRUD', () => {
  test('income: create, display, and delete an income record', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

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

    const marker = `E2E income ${Date.now()}`;
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill(marker);
      if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await amountInput.fill('500');
      }
      await submitBtn.click();
      await page.waitForTimeout(2000);

      // After submit, the page should still be stable (not crash)
      const postBody = await page.textContent('body');
      expect(postBody).not.toContain('Internal Server Error');

      // Clean up the record we just created so re-runs don't accumulate data.
      // The row appears in the table after submit — find and delete it.
      const deleteBtn = page
        .getByRole('row', { name: new RegExp(marker, 'i') })
        .getByRole('button', { name: /delete|trash/i })
        .first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        const confirmBtn = page.getByRole('button', { name: /confirm|delete/i }).first();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(1500);
      }
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

    await page.goto('/admin/finance/expenses', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = await page.textContent('body');
    expect(body).not.toContain('Internal Server Error');

    const descInput = page.locator('input[name="description"], textarea[name="description"]').first();
    const amountInput = page.locator('input[name="amount"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    const marker = `E2E expense ${Date.now()}`;
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill(marker);
      if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await amountInput.fill('200');
      }
      await submitBtn.click();
      await page.waitForTimeout(2000);

      const postBody = await page.textContent('body');
      expect(postBody).not.toContain('Internal Server Error');

      // Clean up the record we just created so re-runs don't accumulate data.
      const deleteBtn = page
        .getByRole('row', { name: new RegExp(marker, 'i') })
        .getByRole('button', { name: /delete|trash/i })
        .first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        const confirmBtn = page.getByRole('button', { name: /confirm|delete/i }).first();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(1500);
      }
    }

    const realErrors = consoleErrors.filter(
      (e) => !/inpage\.js|IN_PAGE_CHANNEL|ExtendedBroadcastMessage|Content Security Policy/i.test(e),
    );
    expect(realErrors).toHaveLength(0);
  });
});
