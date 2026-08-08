import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'audit-screenshots');

// Admin portal routes
const ADMIN_ROUTES = [
  '/admin',
  '/admin/modules',
  // SIS
  '/admin/sis',
  '/admin/students',
  '/admin/teachers',
  '/admin/parents',
  '/admin/subjects',
  '/admin/sis/classes',
  '/admin/sis/admissions',
  // Finance
  '/admin/fees',
  '/admin/finance',
  '/admin/finance/income',
  '/admin/finance/expenses',
  '/admin/finance/payroll',
  '/admin/finance/receipts',
  '/admin/payments/unmatched',
  // Remedial
  '/admin/reclass',
  '/admin/reclass/students',
  '/admin/remedial-fees',
  '/admin/parent-payments',
  '/admin/remedial/receipts',
  '/admin/scheduling',
  '/admin/attendance',
  '/admin/payroll',
  // Communications
  '/admin/communications',
  '/admin/communications/announcements',
  '/admin/communications/templates',
  '/admin/notifications',
  // Platform
  '/admin/credentials',
  '/admin/settings',
  '/admin/users',
  '/admin/reports',
];

// Routes that must 303-redirect for school_admin
const BLOCKED_FOR_ADMIN = [
  '/teacher', '/teacher/timetable', '/teacher/classes',
  '/parent', '/parent/child', '/parent/timetable', '/parent/fees', '/parent/pay', '/parent/payments',
  '/principal', '/principal/effectiveness', '/principal/reports', '/principal/school',
  '/bursar', '/bursar/receipts',
  '/super-admin',
];

// Keywords indicating hardcoded/demo/placeholder content
const HARDCODED_KEYWORDS = [
  'lorem ipsum', 'placeholder', 'fixme', 'hack',
  'dummy', 'mock data', 'fake',
  'coming soon', 'not implemented', 'not yet implemented',
  'under construction', 'work in progress',
  'john doe', 'jane smith', 'sarah', 'johnny',
  '$1,000', '$500', '$2,500', '$10,000',
  'demo', 'sample data', 'example data',
  'password123', 'admin123',
  'tbd', 'tba', 'todo',
];

test.describe('Full Platform Audit', () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: join(SCREENSHOT_DIR, '00-login.png'), fullPage: true });
    
    // Check form exists
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Check email input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    await expect(emailInput).toBeVisible();
    
    // Check password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Check submit button
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('authenticate as admin', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'admin@school.ac.ke');
    await page.fill('input[type="password"]', 'ReClass2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**', { timeout: 25000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: join(SCREENSHOT_DIR, '01-admin-dashboard.png'), fullPage: true });
  });

  // Crawl every admin route
  for (const route of ADMIN_ROUTES) {
    const safeName = route.replace(/\//g, '_').replace(/^_/, '');
    
    test(`page: ${route}`, async ({ page }, testInfo) => {
      testInfo.setTimeout(30000);
      
      // Collect console errors
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
        if (msg.type() === 'warning') consoleWarnings.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(`PAGE_ERROR: ${err.message}`));

      // Navigate
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = resp?.status() ?? -1;
      
      // Wait for network idle
      try {
        await page.waitForLoadState('networkidle', { timeout: 8000 });
      } catch { /* OK */ }

      await page.waitForTimeout(1500); // Let JS settle

      // Screenshot
      await page.screenshot({ path: join(SCREENSHOT_DIR, `${safeName}.png`), fullPage: true });

      // Get body text
      const bodyText = await page.textContent('body').catch(() => '');

      // Report
      console.log(`\n=== ${route} (${status}) ===`);
      
      // Check status
      if (status >= 500) {
        console.log(`  ❌ SERVER ERROR: ${status}`);
        testInfo.attach('error', { body: `Server error ${status} on ${route}` });
      }
      
      // Check for error pages
      if (/internal server error|Application error|Something went wrong/i.test(bodyText)) {
        console.log('  ❌ Error page rendered');
      }

      // Check for console errors
      if (consoleErrors.length > 0) {
        console.log(`  🔴 Console errors (${consoleErrors.length}):`);
        consoleErrors.forEach(e => console.log(`    ${e.slice(0, 150)}`));
      }

      // Check for hardcoded content
      const lowerText = bodyText.toLowerCase();
      const foundHardcoded = HARDCODED_KEYWORDS.filter(kw => lowerText.includes(kw.toLowerCase()));
      if (foundHardcoded.length > 0) {
        console.log(`  ⚠️ Hardcoded content: ${foundHardcoded.join(', ')}`);
      }

      // Check for empty states
      if (/no data|no records|no results|nothing here|no items/i.test(bodyText)) {
        console.log('  ℹ️ Empty state detected');
      }

      // Check for broken links
      const links = await page.locator('a[href]').all();
      const emptyLinks: string[] = [];
      for (const link of links.slice(0, 30)) {
        const text = await link.textContent().catch(() => '');
        const href = await link.getAttribute('href');
        if (href?.startsWith('/') && !text.trim()) {
          emptyLinks.push(href);
        }
      }
      if (emptyLinks.length > 0) {
        console.log(`  ⚠️ Links with empty text: ${emptyLinks.join(', ')}`);
      }

      // Check for images without alt
      const imgs = await page.locator('img').all();
      const noAltImgs: number[] = [];
      for (let i = 0; i < imgs.length && i < 20; i++) {
        const alt = await imgs[i].getAttribute('alt');
        if (!alt?.trim()) noAltImgs.push(i);
      }
      if (noAltImgs.length > 0) {
        console.log(`  ⚠️ ${noAltImgs.length} images without alt text`);
      }

      // Check for unlabeled buttons
      const buttons = await page.locator('button').all();
      const unlabeledButtons: number[] = [];
      for (let i = 0; i < buttons.length && i < 30; i++) {
        const text = await buttons[i].textContent().catch(() => '');
        const ariaLabel = await buttons[i].getAttribute('aria-label');
        if (!text.trim() && !ariaLabel) unlabeledButtons.push(i);
      }
      if (unlabeledButtons.length > 0) {
        console.log(`  ⚠️ ${unlabeledButtons.length} buttons without text or aria-label`);
      }

      // Check for forms without labels
      const inputs = await page.locator('input:not([type="hidden"]):not([type="submit"])').all();
      const unlabeledInputs: string[] = [];
      for (const input of inputs.slice(0, 20)) {
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const label = id ? await page.locator(`label[for="${id}"]`).count() : 0;
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        if (label === 0 && !ariaLabel && !placeholder && !name) {
          unlabeledInputs.push(`input#${id || '(no id)'}`);
        }
      }
      if (unlabeledInputs.length > 0) {
        console.log(`  ⚠️ Unlabeled inputs: ${unlabeledInputs.join(', ')}`);
      }

      // Check tables for data
      const tables = await page.locator('table').count();
      if (tables > 0) {
        const rows = await page.locator('table tbody tr').count();
        console.log(`  📊 Tables: ${tables}, rows: ${rows}`);
      }

      // Check for forms
      const forms = await page.locator('form').count();
      if (forms > 0) {
        console.log(`  📝 Forms: ${forms}`);
      }

      console.log(`  ✅ Screenshot: ${safeName}.png`);
      
      // Fail test on server errors
      expect(status, `${route} should not return 500`).toBeLessThan(500);
    });
  }

  test('blocked routes return 303 for school_admin', async ({ page }) => {
    for (const route of BLOCKED_FOR_ADMIN) {
      const resp = await page.request.get(route, { maxRedirects: 0 });
      expect(resp.status(), `${route} should 303-redirect for admin`).toBe(303);
    }
  });

  test('login page has no hardcoded demo data', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    const bodyText = await page.textContent('body').catch(() => '');
    const lower = bodyText.toLowerCase();
    const hardcoded = HARDCODED_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()));
    expect(hardcoded, `Login page contains hardcoded content: ${hardcoded.join(', ')}`).toHaveLength(0);
  });

  test('health endpoint responds', async ({ request }) => {
    const resp = await request.get('/api/healthz');
    expect(resp.status()).toBe(200);
  });
});
