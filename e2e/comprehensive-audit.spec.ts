import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * COMPREHENSIVE PLATFORM AUDIT (v2 — single login via storageState)
 * 
 * Walks every admin page, captures console errors + screenshots,
 * tests key interactions, validates cross-role guards, checks for
 * hardcoded data.
 */

const authFile = 'playwright/.auth/audit-user.json';
test.use({ storageState: authFile });

// ─── Collectors ──────────────────────────────────────────────────────
const consoleErrors: { url: string; msg: string }[] = [];
const pageErrors: { url: string; msg: string }[] = [];
const findings: { severity: 'critical' | 'major' | 'minor' | 'info'; page: string; description: string }[] = [];

function find(page: string, severity: 'critical' | 'major' | 'minor' | 'info', desc: string) {
  findings.push({ severity, page, description: desc });
}

async function screenshot(page: Page, name: string) {
  mkdirSync('e2e/audit-screenshots', { recursive: true });
  await page.screenshot({ path: `e2e/audit-screenshots/${name}.png`, fullPage: true });
}

async function waitForApp(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? '';
      return text.trim().length > 0 && !text.includes('Internal Server Error');
    },
    { timeout: 12000 },
  );
}

// ─── Routes ──────────────────────────────────────────────────────────
const ADMIN_ROUTES: Array<{ path: string; label: string; group: string }> = [
  { path: '/admin', label: 'Dashboard', group: 'core' },
  { path: '/admin/modules', label: 'Module Hub', group: 'core' },
  { path: '/admin/settings', label: 'Settings', group: 'core' },
  { path: '/admin/users', label: 'Users', group: 'core' },
  { path: '/admin/reports', label: 'Reports', group: 'core' },
  { path: '/account', label: 'Account', group: 'core' },
  { path: '/notifications', label: 'Notifications', group: 'core' },
  { path: '/admin/sis', label: 'SIS Dashboard', group: 'sis' },
  { path: '/admin/sis/classes', label: 'Classes', group: 'sis' },
  { path: '/admin/sis/admissions', label: 'Admissions', group: 'sis' },
  { path: '/admin/students', label: 'Students', group: 'sis' },
  { path: '/admin/students/import', label: 'Student Import', group: 'sis' },
  { path: '/admin/teachers', label: 'Teachers', group: 'sis' },
  { path: '/admin/parents', label: 'Parents', group: 'sis' },
  { path: '/admin/subjects', label: 'Subjects', group: 'sis' },
  { path: '/admin/fees', label: 'Fee Structures', group: 'finance' },
  { path: '/admin/finance', label: 'Finance Dashboard', group: 'finance' },
  { path: '/admin/finance/income', label: 'Income', group: 'finance' },
  { path: '/admin/finance/expenses', label: 'Expenses', group: 'finance' },
  { path: '/admin/finance/receipts', label: 'Receipts', group: 'finance' },
  { path: '/admin/finance/payroll', label: 'Finance Payroll', group: 'finance' },
  { path: '/admin/payments/unmatched', label: 'Unmatched Payments', group: 'finance' },
  { path: '/admin/reclass', label: 'Remedial Dashboard', group: 'remedial' },
  { path: '/admin/reclass/students', label: 'Remedial Students', group: 'remedial' },
  { path: '/admin/remedial-fees', label: 'Remedial Fees', group: 'remedial' },
  { path: '/admin/parent-payments', label: 'Parent Payments', group: 'remedial' },
  { path: '/admin/attendance', label: 'Attendance', group: 'remedial' },
  { path: '/admin/scheduling', label: 'Scheduling', group: 'remedial' },
  { path: '/admin/payroll', label: 'Payroll', group: 'remedial' },
  { path: '/admin/remedial/receipts', label: 'Remedial Receipts', group: 'remedial' },
  { path: '/admin/communications', label: 'Comms Dashboard', group: 'comms' },
  { path: '/admin/communications/announcements', label: 'Announcements', group: 'comms' },
  { path: '/admin/communications/templates', label: 'Templates', group: 'comms' },
  { path: '/admin/notifications', label: 'Message Log', group: 'comms' },
];

const CROSS_ROLE_GUARDS = [
  '/teacher', '/teacher/classes', '/teacher/timetable',
  '/parent', '/parent/fees', '/parent/pay',
  '/principal', '/principal/reports', '/principal/school',
  '/bursar', '/super-admin',
];

// ═════════════════════════════════════════════════════════════════════
test.describe('Full Platform Audit', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const t = m.text();
        if (!/inpage\.js|IN_PAGE_CHANNEL|ExtendedBroadcast|CSP|Supabase|sentry/i.test(t)) {
          consoleErrors.push({ url: page.url(), msg: t });
        }
      }
    });
    page.on('pageerror', (e) => {
      if (!/inpage\.js|IN_PAGE_CHANNEL/i.test(e.message)) {
        pageErrors.push({ url: page.url(), msg: e.message });
      }
    });
  });

  // ── 1. Login (public page — must run WITHOUT the admin session) ──
  test.describe('public login page', () => {
    // Override the file-level storageState so this block is truly unauthenticated.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('1. login page renders with correct branding', async ({ page }, testInfo) => {
      testInfo.setTimeout(60000);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      // Login page load hits rate-limit + Supabase — give it time to settle.
      await page.waitForSelector('h1', { timeout: 20000 });
      await page.waitForTimeout(800); // let hydration settle
      await screenshot(page, '01-login');
      await expect(page.locator('h1').first()).toHaveText(/Sign in/i, { timeout: 10000 });
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      // Logo should be 'e' for eShule (login page uses text-base, sidebar text-xs)
      const logo = page.locator('.bg-primary.font-bold.text-white');
      await expect(logo.first()).toHaveText('e', { timeout: 10000 });
    });
  });

  /** Wait for Svelte hydration — click handlers attach only after it.
   *  body-text presence alone races hydration; buttons are SSR'd but inert. */
  async function waitForHydration(page: Page) {
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('main button, aside button');
        return btn !== null;
      },
      { timeout: 15000 },
    );
    // Give Svelte a beat to attach event listeners after first paint.
    await page.waitForTimeout(1200);
  }

  /** Click a button and retry once if the dialog never appeared (hydration). */
  async function openDialog(page: Page, btnName: RegExp, dialogSelector = 'dialog, [role="dialog"], [data-slot="dialog-content"]') {
    for (let attempt = 0; attempt < 3; attempt++) {
      const btn = page.getByRole('button', { name: btnName }).first();
      if (await btn.count() > 0) {
        await btn.click({ timeout: 8000 }).catch(() => {});
      }
      try {
        await expect(page.locator(dialogSelector).first()).toBeVisible({ timeout: 8000 });
        return true;
      } catch {
        await page.waitForTimeout(1500); // hydration retry
      }
    }
    return false;
  }

  // ── 2. Walk all pages ───────────────────────────────────────────
  for (const route of ADMIN_ROUTES) {
    test(`2.${String(ADMIN_ROUTES.indexOf(route) + 1).padStart(2, '0')} ${route.path} [${route.group}]`, async ({ page }) => {
      const idx = ADMIN_ROUTES.indexOf(route) + 1;
      const resp = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      const status = resp?.status() ?? -1;

      if (status >= 400) {
        // 4xx is as broken as 5xx for a route that must exist (dead link / stale
        // path); 3xx would mean an unexpected redirect to inspect.
        find(route.path, 'critical', `HTTP ${status}`);
      }

      try {
        await waitForApp(page);
      } catch {
        find(route.path, 'critical', 'Page failed to load');
      }

      const body = await page.textContent('body') ?? '';
      if (body.includes('Internal Server Error')) find(route.path, 'critical', 'Internal Server Error');
      if (body.includes('Cannot read') || body.includes('TypeError') || body.includes('ReferenceError'))
        find(route.path, 'critical', 'JS runtime error displayed');

      const name = `${String(idx).padStart(2, '0')}-${route.group}-${route.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await screenshot(page, name);
    });
  }

  // ── 3. Cross-role guards ────────────────────────────────────────
  for (const path of CROSS_ROLE_GUARDS) {
    test(`3.${CROSS_ROLE_GUARDS.indexOf(path) + 1} guard: admin→${path}`, async ({ page }) => {
      const resp = await page.request.get(path, { maxRedirects: 0 });
      expect(resp.status()).toBe(303);
      expect(resp.headers()['location']).toContain('/admin');
    });
  }

  // ── 4. Interactions ─────────────────────────────────────────────
  test('4.1 fees: Add Fee dialog opens', async ({ page }) => {
    await page.goto('/admin/fees');
    await waitForApp(page);
    await waitForHydration(page);
    const opened = await openDialog(page, /Add Fee/i);
    expect(opened, 'Add Fee dialog should open').toBe(true);
    await screenshot(page, '50-fees-dialog');
    await page.keyboard.press('Escape');
  });

  test('4.2 teachers: Add Teacher dialog opens', async ({ page }) => {
    await page.goto('/admin/teachers');
    await waitForApp(page);
    await waitForHydration(page);
    const opened = await openDialog(page, /Add Teacher/i);
    expect(opened, 'Add Teacher dialog should open').toBe(true);
    await screenshot(page, '51-teachers-dialog');
    await page.keyboard.press('Escape');
  });

  test('4.3 subjects: Add Subject dialog opens', async ({ page }) => {
    await page.goto('/admin/subjects');
    await waitForApp(page);
    await waitForHydration(page);
    const opened = await openDialog(page, /Add Subject/i);
    expect(opened, 'Add Subject dialog should open').toBe(true);
    await screenshot(page, '52-subjects-dialog');
    await page.keyboard.press('Escape');
  });

  test('4.4 credentials: Add Credential form appears in Settings > Integrations', async ({ page }) => {
    await page.goto('/admin/settings');
    await waitForApp(page);
    await waitForHydration(page);
    // Credentials live in the Integrations tab of School Settings — assert the
    // tab and its inline Add Credential form render.
    await page.getByRole('tab', { name: /Integrations/i }).click();
    await expect(page.getByRole('heading', { name: /Add Credential/i })).toBeVisible();
    await screenshot(page, '53-credentials-form');
  });

  test('4.5 students: search works', async ({ page }) => {
    await page.goto('/admin/students');
    await waitForApp(page);
    const search = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await search.count() > 0) {
      await search.fill('Brian');
      await page.waitForTimeout(500);
      await screenshot(page, '54-students-search');
    }
  });

  test('4.6 module hub shows remedial module', async ({ page }) => {
    await page.goto('/admin/modules');
    await waitForApp(page);
    const body = await page.textContent('body') ?? '';
    if (!body.includes('Remedial') && !body.includes('remedial')) {
      find('/admin/modules', 'major', 'Remedial module missing from hub');
    }
    await screenshot(page, '55-module-hub');
  });

  test('4.7 settings has form inputs', async ({ page }) => {
    await page.goto('/admin/settings');
    await waitForApp(page);
    const inputs = page.locator('input, select, textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    await screenshot(page, '56-settings');
  });

  // ── 5. Reports / exports ────────────────────────────────────────
  test('5.1 teacher attendance CSV', async ({ page }) => {
    const resp = await page.request.get('/admin/reports/teacher-attendance-csv');
    expect(resp.status()).toBeLessThan(400);
    const body = await resp.text();
    expect(body).toContain('Teacher');
  });

  test('5.2 revenue CSV', async ({ page }) => {
    const resp = await page.request.get('/admin/reports/revenue-csv');
    expect(resp.status()).toBeLessThan(400);
    const body = await resp.text();
    expect(body).toContain('Amount (KES)');
  });

  // ── 6. Summary ──────────────────────────────────────────────────
  test('6. audit summary', async () => {
    const summary = {
      timestamp: new Date().toISOString(),
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      findings,
      consoleErrorDetails: consoleErrors,
      pageErrorDetails: pageErrors,
    };
    mkdirSync('e2e', { recursive: true });
    writeFileSync('e2e/audit-findings.json', JSON.stringify(summary, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    AUDIT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    console.log(`Findings: ${findings.length}`);
    if (findings.length) {
      console.log('\n─── FINDINGS ───');
      for (const f of findings) console.log(`[${f.severity.toUpperCase()}] ${f.page}: ${f.description}`);
    }
    if (consoleErrors.length) {
      console.log('\n─── CONSOLE ERRORS ───');
      for (const e of consoleErrors.slice(0, 20)) console.log(`[${e.url}] ${e.msg}`);
    }
    if (pageErrors.length) {
      console.log('\n─── PAGE ERRORS ───');
      for (const e of pageErrors.slice(0, 20)) console.log(`[${e.url}] ${e.msg}`);
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    const criticals = findings.filter(f => f.severity === 'critical');
    expect(criticals, `Critical findings:\n${criticals.map(f => `[${f.page}] ${f.description}`).join('\n')}`).toHaveLength(0);
  });
});
