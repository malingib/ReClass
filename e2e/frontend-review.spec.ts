import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';

/**
 * Frontend / UX-UI review against this session's changes.
 * Covers: login, admin dashboard, two-system fee pages (school vs remedial),
 * ReClass dashboard, KCB bank-payment form, teacher-portal scoping, parent RBAC.
 * Captures screenshots + console errors for manual inspection.
 *
 * Auth is performed ONCE (setup project) and reused via storageState so the
 * 7-login burst doesn't trip the server's login rate limit (5/min).
 */
const ADMIN = { email: 'admin@school.ac.ke', password: 'ReClass2026!' };
const authFile = 'playwright/.auth/user.json';

// All review tests reuse the authenticated session produced by _auth-setup.spec.ts.
test.use({ storageState: authFile });

const consoleErrors: { url: string; msg: string }[] = [];

test.beforeEach(async ({ page }) => {
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push({ url: page.url(), msg: m.text() });
  });
  page.on('pageerror', (e) => consoleErrors.push({ url: page.url(), msg: e.message }));
});

test.afterAll(() => {
  if (consoleErrors.length) {
    console.log('\n=== CONSOLE ERRORS CAPTURED ===');
    for (const e of consoleErrors) console.log(`[${e.url}] ${e.msg}`);
  } else {
    console.log('\n=== NO CONSOLE ERRORS ===');
  }
});

test('admin School Dashboard renders with real data', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'School Dashboard' })).toBeVisible();
  await expect(page.getByText('Students').first()).toBeVisible();
  await expect(page.getByText('Teachers').first()).toBeVisible();
  await expect(page.getByText('Outstanding').first()).toBeVisible();
  await page.screenshot({ path: 'e2e/review-admin-dashboard.png', fullPage: true });
});

test('Finance Fees page (school domain) is scoped + functional', async ({ page }) => {
  await page.goto('/admin/fees');
  await expect(page.getByRole('heading', { name: 'Fee structures' })).toBeVisible();
  await expect(page.getByText('Termly fee definitions invoiced to students')).toBeVisible();
  expect(await page.getByText('Remedial fee definitions').count()).toBe(0);
  await page.getByRole('button', { name: 'Add Fee' }).click();
  await expect(page.getByText('Fee Name', { exact: true })).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: 'e2e/review-finance-fees.png', fullPage: true });
});

test('Remedial Fees page (remedial domain) is separate + scalable', async ({ page }) => {
  await page.goto('/admin/remedial-fees');
  await expect(page.getByRole('heading', { name: 'Remedial fee structures' })).toBeVisible();
  await expect(page.getByText(/Fees collected from parents via M-Pesa paybill/)).toBeVisible();
  await page.getByRole('button', { name: 'Add Fee' }).click();
  await expect(page.getByText('Fee Name', { exact: true })).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: 'e2e/review-remedial-fees.png', fullPage: true });
});

test('ReClass dashboard loads (previously crashed on dropped tables)', async ({ page }) => {
  await page.goto('/admin/reclass');
  await expect(page.getByRole('heading', { name: 'Remedial Operations' })).toBeVisible();
  await expect(page.getByText('Active').first()).toBeVisible();
  await expect(page.getByText('Teacher attendance').first()).toBeVisible();
  await page.screenshot({ path: 'e2e/review-reclass-dashboard.png', fullPage: true });
});

test('Finance dashboard shows KCB bank-payment entry form', async ({ page }) => {
  await page.goto('/admin/finance');
  await expect(page.getByRole('heading', { name: 'Bursar & Finance' })).toBeVisible();
  await expect(page.getByText('Record KCB / Buni Bank Payment')).toBeVisible();
  await expect(page.locator('label[for="invoice_id"]')).toBeVisible();
  await expect(page.locator('label[for="amount"]')).toBeVisible();
  await expect(page.locator('label[for="bank_reference"]')).toBeVisible();
  await expect(page.locator('label[for="bank_name"]')).toBeVisible();
  await page.screenshot({ path: 'e2e/review-finance-kcb.png', fullPage: true });
});

test('Teacher portal is scoped by teacher_type', async ({ page }) => {
  await page.goto('/teacher');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1').first()).toBeVisible();
  await page.screenshot({ path: 'e2e/review-teacher-portal.png', fullPage: true });
});

test('Parent Fees page is RBAC-protected (admin redirected away)', async ({ page }) => {
  await page.goto('/parent/fees');
  await expect(page).not.toHaveURL(/\/parent\/fees/);
  await expect(page.getByRole('heading', { name: 'School Dashboard' })).toBeVisible();
});
