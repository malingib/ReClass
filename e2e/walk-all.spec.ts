import { test, expect } from '@playwright/test';

// Reuse the shared admin session — per-test logins trip the login rate limiter.
test.use({ storageState: 'playwright/.auth/user.json' });

const ADMIN_ROUTES = [
  '/admin', '/admin/modules', '/admin/sis', '/admin/sis/classes', '/admin/sis/admissions',
  '/admin/students', '/admin/students/import', '/admin/teachers', '/admin/parents',
  '/admin/subjects', '/admin/fees', '/admin/parent-payments',
  '/admin/attendance', '/admin/scheduling', '/admin/credentials', '/admin/reports',
  '/admin/payroll', '/admin/finance', '/admin/finance/income', '/admin/finance/expenses',
  '/admin/communications',
  '/admin/communications/announcements', '/admin/communications/templates',
  '/admin/reclass', '/admin/settings', '/admin/users',
  '/admin/notifications', '/notifications', '/account',
];

const CROSS_ROLE = ['/bursar', '/principal', '/teacher', '/parent', '/super-admin'];

test('walk every admin route on one session, then verify cross-role guards', async ({ page }, testInfo) => {
  testInfo.setTimeout(240000);
  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

  const results: string[] = [];

  for (const route of ADMIN_ROUTES) {
    const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
    const status = resp?.status() ?? -1;
    let ok = status < 500;
    let body = '';
    try {
      await page.waitForFunction(
        () => { const t = document.body?.innerText ?? ''; return t.trim().length > 0 && !t.includes('Internal Server Error'); },
        { timeout: 12000 },
      );
      body = (await page.textContent('body')) ?? '';
      if (body.includes('Internal Server Error')) ok = false;
    } catch {
      ok = false;
    }
    results.push(`${ok ? 'PASS' : 'FAIL'} ${status} ${route}`);
  }

  // Cross-role guards return 303 (not 403) for school_admin.
  for (const route of CROSS_ROLE) {
    const resp = await page.request.get(route, { maxRedirects: 0 });
    const pass = resp.status() === 303;
    results.push(`${pass ? 'PASS' : 'FAIL'} ${resp.status()} guard ${route}`);
  }

  const real = consoleErrors.filter(
    (e) => !/inpage\.js|IN_PAGE_CHANNEL|ExtendedBroadcastMessage|Content Security Policy/i.test(e),
  );
  console.log('\n=== WALK RESULTS ===\n' + results.join('\n'));
  console.log('\n=== REAL CONSOLE ERRORS (' + real.length + ') ===\n' + real.slice(0, 30).join('\n'));

  const failed = results.filter((r) => r.startsWith('FAIL'));
  expect(failed, 'Failed routes:\n' + failed.join('\n')).toHaveLength(0);
  expect(real, 'Console errors:\n' + real.join('\n')).toHaveLength(0);
});
