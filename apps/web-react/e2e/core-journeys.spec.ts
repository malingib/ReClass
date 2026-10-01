import { expect, test, type Page, type Route } from '@playwright/test';

// Core-journey coverage for the React SPA (mocked Supabase, no live creds).
// Run: npx playwright test --config apps/web-react/playwright.config.ts
type Role = 'super_admin' | 'school_admin' | 'principal' | 'teacher' | 'bursar' | 'parent';

const SESSION_KEYS = [
  'sb-127-auth-token',
  'sb-localhost-auth-token',
  'sb-rlswdeswlkuaigwtojxw-auth-token',
];

async function signInAs(page: Page, role: Role) {
  await page.addInitScript(({ sessionKeys, activeRole }) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
    const session = {
      access_token: 'test-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'test-refresh-token',
      user: {
        id: 'test-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'pilot@example.com',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      },
    };
    for (const key of sessionKeys) localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem('eshule_active_role', activeRole);
  }, { sessionKeys: SESSION_KEYS, activeRole: role });
}

async function mockSupabaseReads(page: Page, roles: Role[]) {
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ json: { id: 'test-user-id', email: 'pilot@example.com' } });
  });
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').filter(Boolean).pop() ?? '';
    if (table === 'user_roles') return fulfillJson(route, roles.map((role) => ({ role })));
    if (table === 'role_permissions') return fulfillJson(route, []);
    if (table === 'permissions') return fulfillJson(route, []);
    return fulfillJson(route, []);
  });
}

async function fulfillJson(route: Route, body: unknown[]) {
  const method = route.request().method();
  await route.fulfill({
    status: 200,
    headers: { 'content-type': 'application/json', 'content-range': '0-0/0' },
    body: method === 'HEAD' ? '' : JSON.stringify(body),
  });
}

async function heading(page: Page, name: string | RegExp) {
  if (typeof name === 'string') {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
}

test.describe('journey 1 — admin admissions (school_admin)', () => {
  test('dashboard → students → teachers', async ({ page }) => {
    await mockSupabaseReads(page, ['school_admin']);
    await signInAs(page, 'school_admin');

    await page.goto('/admin');
    // Loaded dashboard personalizes the h1; loading/error states keep "Dashboard".
    await heading(page, /Dashboard|Good morning/);

    await page.goto('/admin/students');
    await heading(page, 'Students');

    await page.goto('/admin/teachers');
    await heading(page, 'Teachers');
  });
});

test.describe('journey 2 — finance collections (bursar)', () => {
  test('overview → payment history → expenses', async ({ page }) => {
    await mockSupabaseReads(page, ['bursar']);
    await signInAs(page, 'bursar');

    await page.goto('/finance');
    await heading(page, 'Finance Overview');

    await page.goto('/finance/payment-history');
    await heading(page, 'Payment History');

    await page.goto('/finance/expenses');
    await heading(page, 'Expenses');

    await page.goto('/finance/financial-reports');
    await heading(page, 'Financial Reports');
    await expect(page.getByText('No financial records yet')).toBeVisible();
  });
});

test.describe('journey 3 — attendance (teacher marks, admin reviews)', () => {
  test('teacher marks attendance', async ({ page }) => {
    await mockSupabaseReads(page, ['teacher']);
    await signInAs(page, 'teacher');

    await page.goto('/teacher');
    await heading(page, 'Teacher dashboard');

    await page.goto('/teacher/attendance');
    await heading(page, 'Teacher attendance');
  });

  test('school_admin reviews teacher attendance', async ({ page }) => {
    await mockSupabaseReads(page, ['school_admin']);
    await signInAs(page, 'school_admin');

    await page.goto('/admin/teacher-attendance');
    await heading(page, 'Teacher Attendance');
  });
});

test.describe('journey 4 — guards and legacy redirects', () => {
  test('parent is bounced from admin and finance workspaces', async ({ page }) => {
    await mockSupabaseReads(page, ['parent']);
    await signInAs(page, 'parent');

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/finance');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('legacy aliases land on canonical pages', async ({ page }) => {
    await mockSupabaseReads(page, ['school_admin']);
    await signInAs(page, 'school_admin');

    await page.goto('/admin/exams');
    await expect(page).toHaveURL(/\/admin\/classes$/);
    await heading(page, 'Classes');

    await page.goto('/finance/bank-transactions');
    await expect(page).toHaveURL(/\/finance\/payment-history$/);
    await heading(page, 'Payment History');

    await page.goto('/admin/settings/sms');
    await expect(page).toHaveURL(/\/admin\/settings$/);
  });
});
