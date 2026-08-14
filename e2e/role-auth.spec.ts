import { test, expect } from '@playwright/test';

// Reuse the shared admin session — per-test logins trip the server's login
// rate limiter (5/min per IP).
test.use({ storageState: 'playwright/.auth/user.json' });

const ROLE_ROUTES: Record<string, string[]> = {
  school_admin: [
    '/admin', '/admin/modules', '/admin/sis', '/admin/students', '/admin/teachers',
    '/admin/parents', '/admin/subjects', '/admin/fees', '/admin/finance',
    '/admin/finance/income', '/admin/finance/expenses', '/admin/attendance',
    '/admin/scheduling', '/admin/reports', '/admin/payroll',
    '/admin/communications', '/admin/reclass', '/admin/settings',
    '/admin/users', '/admin/notifications',
  ],
  super_admin: ['/super-admin'],
  // Full portal route inventory per role (shells + feature routes). Feature
  // routes keep their owning module's gate; the shells are always-on.
  teacher: ['/teacher', '/teacher/timetable', '/teacher/classes'],
  principal: ['/principal', '/principal/effectiveness', '/principal/reports', '/principal/school'],
  bursar: ['/bursar', '/bursar/receipts'],
  parent: ['/parent', '/parent/child', '/parent/timetable', '/parent/fees', '/parent/pay', '/parent/payments'],
};

const CROSS_ROLE_403 = ['/bursar', '/principal', '/teacher', '/parent', '/super-admin'];

// Portal feature routes must stay guarded for a school_admin session.
const PORTAL_FEATURE_GUARDS = [
  '/teacher/timetable', '/teacher/classes',
  '/principal/effectiveness', '/principal/reports', '/principal/school',
  '/parent/child', '/parent/timetable', '/parent/fees', '/parent/pay', '/parent/payments',
  '/bursar/receipts',
];

test('all role routes return OK for school_admin and cross-role guards return 303', async ({ page }, testInfo) => {
  testInfo.setTimeout(240000);
  const errors: string[] = [];

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

  // Verify the module hub renders ( /admin is a launcher now )
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => (document.body?.innerText ?? '').includes('Modules'),
    { timeout: 12000 },
  );
  const dashBody = await page.textContent('body');
  errors.push(`${dashBody?.includes('Modules') ? 'PASS' : 'FAIL'} module-hub-renders`);

  const failed = errors.filter((r) => r.startsWith('FAIL'));
  console.log('\n=== ROLE-WALK RESULTS ===\n' + errors.join('\n'));
  expect(failed).toHaveLength(0);
});

test('non-admin role routes are blocked by routeGuard for school_admin', async ({ page }) => {
  for (const route of ['/teacher', '/parent', '/bursar', '/principal', '/super-admin']) {
    const resp = await page.request.get(route, { maxRedirects: 0 });
    expect(resp.status(), `${route} should redirect`).toBe(303);
  }
});

test('portal feature routes are guarded for school_admin', async ({ page }) => {
  for (const route of PORTAL_FEATURE_GUARDS) {
    const resp = await page.request.get(route, { maxRedirects: 0 });
    expect(resp.status(), `${route} should redirect for admin`).toBe(303);
  }
});

test('admin finance sub-routes render income/expenses pages', async ({ page }) => {
  await page.goto('/admin/finance/income', { waitUntil: 'domcontentloaded' });
  let body = await page.textContent('body');
  expect(body).toContain('Income');
  expect(body).not.toContain('Internal Server Error');

  await page.goto('/admin/finance/expenses', { waitUntil: 'domcontentloaded' });
  body = await page.textContent('body');
  expect(body).toContain('Expenses');
  expect(body).not.toContain('Internal Server Error');
});
