import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL || 'admin@school.ac.ke';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'ReClass2026!';

async function loginOnce(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 25000, waitUntil: 'domcontentloaded' });
}

const ROLE_ROUTES: Record<string, string[]> = {
  school_admin: [
    '/admin', '/admin/modules', '/admin/sis', '/admin/students', '/admin/teachers',
    '/admin/parents', '/admin/subjects', '/admin/fees', '/admin/finance',
    '/admin/finance/income', '/admin/finance/expenses', '/admin/attendance',
    '/admin/scheduling', '/admin/credentials', '/admin/reports', '/admin/payroll',
    '/admin/communications', '/admin/reclass', '/admin/settings',
    '/admin/users', '/admin/notifications',
  ],
  super_admin: ['/super-admin'],
  teacher: ['/teacher'],
  principal: ['/principal'],
  bursar: ['/bursar'],
  parent: ['/parent'],
};

const CROSS_ROLE_403 = ['/bursar', '/principal', '/teacher', '/parent', '/super-admin'];

test('all role routes return OK for school_admin and cross-role guards return 303', async ({ page }, testInfo) => {
  testInfo.setTimeout(240000);
  const errors: string[] = [];

  await loginOnce(page);

  // Walk all admin routes and verify they render without errors
  for (const route of ROLE_ROUTES.school_admin) {
    const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
    const status = resp?.status() ?? -1;
    let ok = status < 500;
    try {
      await page.waitForFunction(
        () => { const t = document.body?.innerText ?? ''; return t.trim().length > 0 && !t.includes('Internal Server Error'); },
        { timeout: 12000 },
      );
      const body = await page.textContent('body');
      if (body?.includes('Internal Server Error')) ok = false;
    } catch {
      ok = false;
    }
    errors.push(`${ok ? 'PASS' : 'FAIL'} ${status} ${route}`);
  }

  // Cross-role guards must return 303 redirect
  for (const route of CROSS_ROLE_403) {
    const resp = await page.request.get(route, { maxRedirects: 0 });
    const pass = resp.status() === 303;
    errors.push(`${pass ? 'PASS' : 'FAIL'} ${resp.status()} guard ${route}`);
  }

  // Verify dashboard shows expected KPIs
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  const dashBody = await page.textContent('body');
  if (dashBody) {
    const hasKpis = /Total Students|Teachers/i.test(dashBody);
    errors.push(`${hasKpis ? 'PASS' : 'FAIL'} dashboard-kpis`);
  }

  const failed = errors.filter((r) => r.startsWith('FAIL'));
  console.log('\n=== ROLE-WALK RESULTS ===\n' + errors.join('\n'));
  expect(failed).toHaveLength(0);
});

test('non-admin role routes are blocked by routeGuard for school_admin', async ({ page }) => {
  await loginOnce(page);
  for (const route of ['/teacher', '/parent', '/bursar', '/principal', '/super-admin']) {
    const resp = await page.request.get(route, { maxRedirects: 0 });
    expect(resp.status(), `${route} should redirect`).toBe(303);
  }
});

test('admin finance sub-routes render income/expenses pages', async ({ page }) => {
  await loginOnce(page);

  await page.goto('/admin/finance/income', { waitUntil: 'domcontentloaded' });
  let body = await page.textContent('body');
  expect(body).toContain('Income');
  expect(body).not.toContain('Internal Server Error');

  await page.goto('/admin/finance/expenses', { waitUntil: 'domcontentloaded' });
  body = await page.textContent('body');
  expect(body).toContain('Expenses');
  expect(body).not.toContain('Internal Server Error');
});
