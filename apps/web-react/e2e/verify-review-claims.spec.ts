import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Ad-hoc verification of two review findings (read-only review, test-only file):
 *  1) [charts] Principal "Revenue trend (live)" uses dataKey="total" but rows are
 *     {month, amount, count} -> chart renders with data (axis ticks present) yet ZERO bars.
 *     Admin sibling chart (dataKey="amount") with the same mocks renders bars -> contrast proof.
 *  2) [nav] A signed-in bursar follows a visible header/sidebar "My Profile" link
 *     and is bounced to /login by the ProtectedRoute deny sink.
 */

const SESSION_KEYS = [
  'sb-127-auth-token',
  'sb-localhost-auth-token',
  'sb-rlswdeswlkuaigwtojxw-auth-token',
];

type Role = 'school_admin' | 'principal' | 'bursar';

const now = Date.now();
const isoDaysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

// Two payments guaranteed to fall in two different calendar months (40 > 31 days apart).
const PAYMENTS = [
  { id: 'p1', created_at: isoDaysAgo(5), amount: 120000, status: 'paid', method: 'mpesa', domain: null, receipt_no: 'R-001' },
  { id: 'p2', created_at: isoDaysAgo(40), amount: 80000, status: 'paid', method: 'mpesa', domain: 'school', receipt_no: 'R-002' },
];

async function signInAs(page: Page, role: Role) {
  await page.addInitScript(
    ({ sessionKeys, activeRole }) => {
      const session = {
        access_token: 'test-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
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
    },
    { sessionKeys: SESSION_KEYS, activeRole: role },
  );
}

async function fulfillJson(route: Route, body: unknown[]) {
  const method = route.request().method();
  await route.fulfill({
    status: 200,
    headers: { 'content-type': 'application/json', 'content-range': '0-0/0' },
    body: method === 'HEAD' ? '' : JSON.stringify(body),
  });
}

async function mockSupabase(page: Page, roles: Role[]) {
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ json: { id: 'test-user-id', email: 'pilot@example.com' } });
  });
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').filter(Boolean).pop() ?? '';
    if (table === 'user_roles') return fulfillJson(route, roles.map((role) => ({ role })));
    if (table === 'payments') return fulfillJson(route, PAYMENTS);
    return fulfillJson(route, []);
  });
}

/** Measure visible bars (height > 1px) inside the recharts card headed `title`. */
async function chartBars(page: Page, title: string) {
  const card = page.locator('h3').filter({ hasText: title }).locator('xpath=../..');
  await expect(card).toBeVisible();
  // Main chart svg first; legend icons are also svg.recharts-surface.
  const svg = card.locator('svg.recharts-surface').first();
  await expect(svg).toBeVisible();
  // Month labels (YYYY-MM) on the x-axis prove the rows reached the chart.
  const monthTicks = await svg.locator('text').filter({ hasText: /^\d{4}-\d{2}$/ }).count();
  const bars = await card.evaluate((el) => {
    // Each <Bar> mounts g.recharts-bar-rectangles > g.recharts-layer (the shape layer);
    // its bbox height is the union of rendered bar rectangles.
    const nodes = Array.from(el.querySelectorAll<SVGGraphicsElement>('g.recharts-bar-rectangles > *'));
    const heights = nodes.map((n) => n.getBoundingClientRect().height);
    return {
      layer: el.querySelectorAll('g.recharts-bar').length,
      heights: heights.map((h) => Math.round(h)),
      visible: heights.filter((h) => h > 1).length,
    };
  });
  const emptyState = await card.getByText('No revenue data yet.').count();
  return { monthTicks, bars, emptyState };
}

test.use({ viewport: { width: 1440, height: 900 } });

test.describe('review claim verification', () => {
  test('principal revenue chart has data (ticks) but ZERO bars; admin sibling renders bars', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // ── Principal: dataKey="total" (Misc.tsx:80) ──
    await mockSupabase(page, ['principal']);
    await signInAs(page, 'principal');
    await page.goto('/principal');
    await expect(page.getByRole('heading', { name: 'Principal oversight' })).toBeVisible();

    const principal = await chartBars(page, 'Revenue trend (live)');
    console.log('PRINCIPAL chart:', JSON.stringify(principal));
    expect(principal.emptyState, 'empty-state guard must pass => rows reached the chart').toBe(0);
    expect(principal.monthTicks, 'x-axis shows the two mocked months => chart received data').toBe(2);
    expect(principal.bars.visible, 'claim: zero visible bars despite data').toBe(0);

    // ── Admin: same mocks, dataKey="amount" (Dashboard.tsx:52) → bars must be visible ──
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Good morning|Dashboard/ })).toBeVisible();
    const admin = await chartBars(page, 'School Fee Collection');
    console.log('ADMIN chart:', JSON.stringify(admin));
    expect(admin.emptyState).toBe(0);
    expect(admin.monthTicks).toBe(2);
    expect(admin.bars.visible, 'contrast: admin chart with dataKey="amount" renders bars').toBeGreaterThan(0);

    expect(pageErrors, 'no uncaught page errors').toEqual([]);
  });

  test('signed-in bursar follows visible header "My Profile" link → bounced to /login', async ({ page }) => {
    await mockSupabase(page, ['bursar']);
    await signInAs(page, 'bursar');
    await page.goto('/admin');
    // bursar is admitted to /admin by its own gate (ADMIN_ROLES) — no bounce yet
    await expect(page.getByRole('heading', { name: /Good morning|Dashboard/ })).toBeVisible();

    const profileBtn = page.locator('header button').filter({ hasText: 'Bursar' });
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    const myProfile = page.locator('header').getByRole('link', { name: 'My Profile' });
    await expect(myProfile, 'the link is visible to the signed-in bursar').toBeVisible();
    await expect(myProfile).toHaveAttribute('href', '/admin/settings/profile');
    await myProfile.click();

    await expect(page, 'deny sink sends a signed-in bursar to the login screen').toHaveURL(/\/login$/);
  });

  test('signed-in bursar follows visible sidebar "My Profile" link → bounced to /login', async ({ page }) => {
    await mockSupabase(page, ['bursar']);
    await signInAs(page, 'bursar');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Good morning|Dashboard/ })).toBeVisible();

    const sidebar = page.locator('aside[class*="md:flex"]');
    await sidebar.getByRole('button', { name: 'Settings' }).click();
    await sidebar.getByRole('button', { name: 'Account', exact: true }).click();

    const myProfile = sidebar.getByRole('link', { name: 'My Profile', exact: true });
    await expect(myProfile, 'sidebar offers My Profile to the bursar (nav-data.ts:273 ALL_ADMIN)').toBeVisible();
    await expect(myProfile).toHaveAttribute('href', '/admin/settings/profile');
    await myProfile.click();

    await expect(page, 'route gate SETTINGS_ROLES (rbac.ts:80) has no bursar → /login').toHaveURL(/\/login$/);
  });
});
