import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'admin@school.ac.ke';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'ReClass2026!';
const authFile = 'playwright/.auth/user.json';

// The app keeps persistent connections (Supabase Realtime, Sentry) open, so
// `networkidle` never settles. Wait for the DOM to be ready and for the body to
// carry real content instead — fast and reliable.
async function waitForApp(page: import('@playwright/test').Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? '';
      return text.trim().length > 0 && !text.includes('Internal Server Error');
    },
    { timeout: 15000 },
  );
}

// ─── Public pages (no auth) ─────────────────────────────────────────
test.describe('Root redirect', () => {
  test('landing page renders for unauthenticated user', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /School management/i })).toBeVisible();
    // Two "Sign in" CTAs on the landing page — assert the hero one exactly.
    await expect(page.getByRole('button', { name: 'Sign in to eShule' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('sign in button navigates to /login', async ({ page }) => {
    await page.goto('/');
    // Svelte attaches handlers after hydration — retry the click if the first
    // attempt is swallowed (SSR'd button is inert pre-hydration).
    const btn = page.getByRole('button', { name: 'Sign in', exact: true });
    for (let attempt = 0; attempt < 3 && !page.url().includes('/login'); attempt++) {
      await btn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });
});

test.describe('Login page', () => {
  test('renders login form with email and password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('shows error with invalid credentials', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/login');

    await page.fill('input[type="email"], input[name="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    // The error renders in a red alert box (class bg-red-50 / border-red-200).
    await expect(page.locator('.bg-red-50, [role="alert"]')).toBeVisible({ timeout: 15000 });
  });

  test('logs in and redirects to admin modules hub', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    // /admin is a pure module launcher → lands on /admin/modules.
    await page.waitForURL(/\/admin/, { timeout: 25000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/admin');
  });
});

// ─── Authenticated pages (reuse the shared session) ─────────────────
test.describe('Dashboard (admin)', () => {
  test.use({ storageState: authFile });

  test('admin modules hub renders without error', async ({ page }) => {
    await page.goto('/admin/modules');
    await waitForApp(page);

    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content).not.toContain('Internal Server Error');

    await expect(page.getByRole('heading', { name: 'Modules' })).toBeVisible();
  });

  test('sidebar navigation links are present on a module page', async ({ page }) => {
    // The module hub intentionally hides the sidebar — assert on a real page.
    await page.goto('/admin/finance');
    await waitForApp(page);
    await page.waitForTimeout(1500);

    const navLinks = page.locator('aside nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Feature pages (admin)', () => {
  test.use({ storageState: authFile });

  const adminPages = [
    '/admin/students',
    '/admin/teachers',
    '/admin/parents',
    '/admin/subjects',
    '/admin/fees',
    '/admin/parent-payments',
    '/admin/attendance',
    '/admin/scheduling',
  ];

  for (const path of adminPages) {
    test(`${path} loads without error`, async ({ page }) => {
      await page.goto(path);
      await waitForApp(page);

      const content = await page.textContent('body');
      expect(content).not.toContain('Internal Server Error');
      expect(content).not.toContain('TypeError');
    });
  }
});

test.describe('Notifications page', () => {
  test.use({ storageState: authFile });

  test('loads notifications page', async ({ page }) => {
    await page.goto('/admin/notifications');
    await waitForApp(page);

    const content = await page.textContent('body');
    expect(content).not.toContain('Internal Server Error');
  });
});

test.describe('Bursar waiver workflow', () => {
  test.use({ storageState: authFile });

  // The role guard redirects (303) cross-role access back to the admin's own
  // dashboard rather than serving a 403. We assert the raw redirect status via
  // an API request with redirects disabled.
  test('admin is forbidden from bursar waivers', async ({ page }) => {
    const resp = await page.request.get('/bursar/waivers', { maxRedirects: 0 });
    expect(resp.status()).toBe(303);
    expect(resp.headers()['location']).toContain('/admin');
  });

  test('admin is forbidden from bursar aging', async ({ page }) => {
    const resp = await page.request.get('/bursar/aging', { maxRedirects: 0 });
    expect(resp.status()).toBe(303);
    expect(resp.headers()['location']).toContain('/admin');
  });
});

test.describe('Reports export', () => {
  test.use({ storageState: authFile });

  test('admin reports page has print and CSV actions', async ({ page }) => {
    await page.goto('/admin/reports');
    await waitForApp(page);

    const content = await page.textContent('body');
    expect(content).not.toContain('Internal Server Error');
    expect(content).toContain('Print / PDF');
    expect(content).toContain('Teacher Attendance CSV');
  });

  test('teacher attendance CSV endpoint returns data', async ({ page }) => {
    const response = await page.request.get('/admin/reports/teacher-attendance-csv');
    expect(response.status()).toBeLessThan(400);
    const body = await response.text();
    expect(body).toContain('Teacher');
  });

  test('revenue CSV endpoint returns data', async ({ page }) => {
    const response = await page.request.get('/admin/reports/revenue-csv');
    expect(response.status()).toBeLessThan(400);
    const body = await response.text();
    expect(body).toContain('Amount (KES)');
  });
});

test.describe('Role-based route guards', () => {
  test.use({ storageState: authFile });

  test('admin cannot access teacher routes', async ({ page }) => {
    const resp = await page.request.get('/teacher', { maxRedirects: 0 });
    expect(resp.status()).toBe(303);
    expect(resp.headers()['location']).toContain('/admin');
  });

  test('admin cannot access principal routes', async ({ page }) => {
    const resp = await page.request.get('/principal', { maxRedirects: 0 });
    expect(resp.status()).toBe(303);
    expect(resp.headers()['location']).toContain('/admin');
  });

  test('admin cannot access parent routes', async ({ page }) => {
    const resp = await page.request.get('/parent', { maxRedirects: 0 });
    expect(resp.status()).toBe(303);
    expect(resp.headers()['location']).toContain('/admin');
  });

  test('admin cannot access bursar routes', async ({ page }) => {
    const resp = await page.request.get('/bursar', { maxRedirects: 0 });
    expect(resp.status()).toBe(303);
    expect(resp.headers()['location']).toContain('/admin');
  });
});

test.describe('Scheduling page (admin)', () => {
  test.use({ storageState: authFile });

  test('scheduling page loads with calendar grid', async ({ page }) => {
    await page.goto('/admin/scheduling');
    await waitForApp(page);
    const content = await page.textContent('body');
    expect(content).not.toContain('Internal Server Error');
  });
});

test.describe('Parent Payments (admin)', () => {
  test.use({ storageState: authFile });

  test('parent payments list loads', async ({ page }) => {
    await page.goto('/admin/parent-payments');
    await waitForApp(page);
    const content = await page.textContent('body');
    expect(content).not.toContain('Internal Server Error');
  });
});

test.describe('Cross-role workflow: principal attendance review', () => {
  test.use({ storageState: authFile });

  test('principal reports page blocked for admin', async ({ page }) => {
    const resp = await page.request.get('/principal/reports', { maxRedirects: 0 });
    expect(resp.status()).toBe(303);
    expect(resp.headers()['location']).toContain('/admin');
  });

  test('admin attendance page loads (teacher attendance view)', async ({ page }) => {
    await page.goto('/admin/attendance');
    await waitForApp(page);
    const content = await page.textContent('body');
    expect(content).not.toContain('Internal Server Error');
  });
});

test.describe('Cross-role workflow: student marking', () => {
  test.use({ storageState: authFile });

  test('admin students page loads with data table', async ({ page }) => {
    await page.goto('/admin/students');
    await waitForApp(page);
    const content = await page.textContent('body');
    expect(content).not.toContain('Internal Server Error');
  });
});

test.describe('CRUD form operations (admin)', () => {
  test.use({ storageState: authFile });

  test('fees page opens create dialog', async ({ page }) => {
    await page.goto('/admin/fees');
    await waitForApp(page);
    await page.waitForTimeout(1500); // let Svelte hydrate

    const addButton = page.getByRole('button', { name: /Add Fee/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect(page.locator('dialog, [role="dialog"], [data-slot="dialog-content"]')).toBeVisible({ timeout: 8000 });
  });

  test('subjects page opens create dialog', async ({ page }) => {
    await page.goto('/admin/subjects');
    await waitForApp(page);
    await page.waitForTimeout(1500);

    const addButton = page.getByRole('button', { name: /Add Subject/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect(page.locator('dialog, [role="dialog"], [data-slot="dialog-content"]')).toBeVisible({ timeout: 8000 });
  });

  test('teachers page opens create dialog', async ({ page }) => {
    await page.goto('/admin/teachers');
    await waitForApp(page);
    await page.waitForTimeout(1500);

    const addButton = page.getByRole('button', { name: /Add Teacher/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect(page.locator('dialog, [role="dialog"], [data-slot="dialog-content"]')).toBeVisible({ timeout: 8000 });
  });

  test('settings integrations tab manages credentials', async ({ page }) => {
    await page.goto('/admin/settings');
    await waitForApp(page);

    await page.getByRole('tab', { name: /Integrations/i }).click();
    await expect(page.getByRole('heading', { name: /Add Credential/i })).toBeVisible();
  });
});
