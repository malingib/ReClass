import { expect, test, type Page, type Route } from '@playwright/test';

type Role = 'super_admin' | 'school_admin' | 'principal' | 'teacher' | 'bursar' | 'parent';

const SESSION_KEYS = [
  'sb-127-auth-token',
  'sb-localhost-auth-token',
  'sb-rlswdeswlkuaigwtojxw-auth-token',
];

const ROLE_CASES: { role: Role; path: string; heading: string | RegExp }[] = [
  { role: 'super_admin', path: '/super-admin', heading: 'System administration' },
  { role: 'school_admin', path: '/admin', heading: /Dashboard|Good morning/ },
  { role: 'principal', path: '/principal', heading: 'Principal oversight' },
  { role: 'teacher', path: '/teacher', heading: 'Teacher dashboard' },
  { role: 'bursar', path: '/bursar', heading: 'Bursar' },
  { role: 'parent', path: '/parent', heading: /Good (morning|afternoon|evening), Parent/ },
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
    headers: {
      'content-type': 'application/json',
      'content-range': '0-0/0',
    },
    body: method === 'HEAD' ? '' : JSON.stringify(body),
  });
}

test.describe('role-based React access', () => {
  for (const roleCase of ROLE_CASES) {
    test(`${roleCase.role} opens ${roleCase.path}`, async ({ page }) => {
      await mockSupabaseReads(page, [roleCase.role]);
      await signInAs(page, roleCase.role);

      await page.goto(roleCase.path);

      await expect(page).toHaveURL(new RegExp(`${roleCase.path.replaceAll('/', '\\/')}$`));
      await expect(page.getByRole('heading', { name: roleCase.heading })).toBeVisible();
    });
  }

  test('parent cannot open admin workspace', async ({ page }) => {
    await mockSupabaseReads(page, ['parent']);
    await signInAs(page, 'parent');

    await page.goto('/admin');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('teacher cannot open parent portal', async ({ page }) => {
    await mockSupabaseReads(page, ['teacher']);
    await signInAs(page, 'teacher');

    await page.goto('/parent');

    await expect(page).toHaveURL(/\/login$/);
  });
});
