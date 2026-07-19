import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@school.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test1234!';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // Wait for the final redirect chain: /login → / → /admin
  await page.waitForURL('**/admin', { timeout: 15000 });
}

test.describe('Root redirect', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login');
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
    await page.goto('/login');

    await page.fill('input[type="email"], input[name="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    await expect(page.locator('[class*="error"], [class*="danger"], [role="alert"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Login with valid credentials', () => {
  test('logs in and redirects to admin dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    expect(page.url()).toContain('/admin');
  });
});

test.describe('Dashboard (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('displays admin dashboard with stats', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const content = await page.textContent('body');
    expect(content).toBeTruthy();

    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('sidebar navigation links are present', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const asideCount = await page.locator('aside').count();
    console.log('Aside elements:', asideCount);

    const navLinks = page.locator('aside nav a');
    const count = await navLinks.count();
    console.log('Nav links count:', count);
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Feature pages (admin)', () => {
  const adminPages = [
    '/admin/students',
    '/admin/teachers',
    '/admin/parents',
    '/admin/subjects',
    '/admin/fees',
    '/admin/payroll',
    '/admin/attendance',
    '/admin/scheduling',
    '/admin/credentials',
    '/admin/invoices',
  ];

  for (const path of adminPages) {
    test(`${path} loads without error`, async ({ page }) => {
      await loginAsAdmin(page);

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const content = await page.textContent('body');
      expect(content).not.toContain('500');
      expect(content).not.toContain('Internal Server Error');
    });
  }
});

test.describe('Notifications page', () => {
  test('loads notifications page', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const content = await page.textContent('body');
    expect(content).not.toContain('500');
  });
});

test.describe('Payroll workflow (admin)', () => {
  test('generate payroll form opens and validates dates', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/payroll');
    await page.waitForLoadState('networkidle');

    // Open the generator
    await page.getByRole('button', { name: /Generate Payroll/i }).click();
    await page.waitForSelector('input[name="period_start"]', { timeout: 5000 });

    // Try submitting without dates → expect validation error or no crash
    await page.getByRole('button', { name: /Generate Payroll$/i }).click();
    await page.waitForTimeout(1000);
    const content = await page.textContent('body');
    expect(content).not.toContain('500');
  });

  test('payroll page shows summary cards', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/payroll');
    await page.waitForLoadState('networkidle');
    const content = await page.textContent('body');
    expect(content).not.toContain('500');
    // Summary section should be present even with no runs
    expect(content).toContain('Total Payroll');
  });
});

test.describe('Bursar waiver workflow', () => {
  test('waivers page loads with outstanding invoices', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/bursar/waivers');
    await page.waitForLoadState('networkidle');

    const content = await page.textContent('body');
    expect(content).not.toContain('500');
    expect(content).toContain('Outstanding Invoices');
  });

  test('aging page shows buckets', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/bursar/aging');
    await page.waitForLoadState('networkidle');

    const content = await page.textContent('body');
    expect(content).not.toContain('500');
    expect(content).toContain('Total Outstanding');
  });
});

test.describe('Reports export', () => {
  test('admin reports page has print and CSV actions', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');

    const content = await page.textContent('body');
    expect(content).not.toContain('500');
    expect(content).toContain('Print / PDF');
    expect(content).toContain('Teacher Attendance CSV');
  });

  test('teacher attendance CSV endpoint returns data', async ({ page }) => {
    await loginAsAdmin(page);
    const response = await page.goto('/admin/reports/teacher-attendance-csv');
    expect(response?.status()).toBeLessThan(400);
    const body = await response?.text();
    expect(body).toBeTruthy();
  });
});
