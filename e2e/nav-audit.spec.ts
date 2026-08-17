import { test, expect, type Page } from '@playwright/test';

/**
 * Navigation / role / domain audit.
 * Verifies per-role nav, the two-system separation (school fees=Finance/KCB vs
 * remedial=ReClass/M-Pesa) is reflected in the sidebar, and that no page orphans
 * its nav. Captures evidence screenshots.
 */
const authFile = 'playwright/.auth/user.json';

test.use({ storageState: authFile });

const consoleErrors: { url: string; msg: string }[] = [];
test.beforeEach(async ({ page }) => {
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ url: page.url(), msg: m.text() }); });
  page.on('pageerror', (e) => consoleErrors.push({ url: page.url(), msg: e.message }));
});
test.afterAll(() => {
  if (consoleErrors.length) { console.log('\n=== CONSOLE ERRORS ==='); consoleErrors.forEach(e => console.log(`[${e.url}] ${e.msg}`)); }
  else console.log('\n=== NO CONSOLE ERRORS ===');
});

async function sidebarLinks(page: Page): Promise<string[]> {
  return page.locator('aside nav a').allInnerTexts();
}

test('school_admin sidebar shows two systems separated (Finance vs ReClass)', async ({ page }) => {
  await page.goto('/admin/finance');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500); // let Svelte hydrate
  const links = await sidebarLinks(page);
  console.log('FINANCE PAGE SIDEBAR LINKS:', JSON.stringify(links));
  // P0 fix: the Finance page sidebar must NOT collapse to empty
  expect(links.length, 'sidebar should not collapse on Finance page').toBeGreaterThanOrEqual(3);
  // The School fees group must be present (two-system separation visible)
  expect(links.join(' ')).toContain('School fee definitions');
  expect(links.join(' ')).toContain('Bursar & Finance');
  await page.screenshot({ path: 'e2e/audit-finance-sidebar.png', fullPage: true });
});

test('Finance module is reachable from the /admin/modules switcher', async ({ page }) => {
  await page.goto('/admin/modules');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  // Module card title (h2/heading) — disambiguate from any sidebar text
  await expect(page.getByRole('heading', { name: 'Bursar & Finance' }).first()).toBeVisible();
  await page.screenshot({ path: 'e2e/audit-modules-switcher.png', fullPage: true });
});

test('school_admin sidebar groups the two fee systems distinctly', async ({ page }) => {
  // Module-isolated sidebar: on the Finance page only finance-owned groups
  // render; the remedial group shows on remedial pages. Assert each in turn.
  await page.goto('/admin/finance');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  let groups = await page.locator('aside nav button').allInnerTexts();
  let joined = groups.join('|');
  console.log('FINANCE PAGE SIDEBAR GROUP LABELS:', JSON.stringify(groups));
  expect(/school fee/i.test(joined)).toBe(true);
  expect(joined).not.toContain('Remedial M-Pesa'); // isolation: not on finance page

  await page.goto('/admin/reclass');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  groups = await page.locator('aside nav button').allInnerTexts();
  joined = groups.join('|');
  console.log('RECLASS PAGE SIDEBAR GROUP LABELS:', JSON.stringify(groups));
  expect(/remedial m-pesa|remedial program/i.test(joined)).toBe(true);
  await page.screenshot({ path: 'e2e/audit-admin-groups.png', fullPage: true });
});

test('teacher route is RBAC-gated for school_admin (redirected away)', async ({ page }) => {
  // The shared session is school_admin — /teacher must 303 to /admin.
  await page.goto('/teacher');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  expect(page.url()).not.toContain('/teacher');
  await page.screenshot({ path: 'e2e/audit-teacher-nav.png', fullPage: true });
});

test('parent route is RBAC-gated for admin (redirected away)', async ({ page }) => {
  await page.goto('/parent/fees');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  // admin/super_admin must not land on parent surface
  expect(page.url()).not.toContain('/parent/fees');
  await page.screenshot({ path: 'e2e/audit-parent-nav.png', fullPage: true });
});

