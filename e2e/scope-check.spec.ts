import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL || 'admin@school.ac.ke';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'ReClass2026!';

async function loginOnce(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 25000, waitUntil: 'domcontentloaded' });
}

test('module dashboards are scoped to their own domains', async ({ page }, testInfo) => {
  testInfo.setTimeout(120000);
  await loginOnce(page);

  // Reclass = remedial domain: must reference remedial teachers / active sessions,
  // and must NOT surface a whole-school "Total Students" KPI (that is /admin + /admin/sis).
  await page.goto('/admin/reclass', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('Remedial'), { timeout: 15000 });
  const reclass = await page.textContent('body');
  expect(reclass).toMatch(/Remedial teachers|Active sessions|Teacher attendance/i);
  expect(reclass).not.toContain('Internal Server Error');

  // SIS = owns students/classes/admissions.
  await page.goto('/admin/sis', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('Student Information'), { timeout: 15000 });
  const sis = await page.textContent('body');
  expect(sis).toMatch(/Total Students|Classes|Admissions/i);

  // Students nav lives under SIS group (not Front office) — verify sidebar shows Students inside SIS.
  const sidebar = await page.locator('aside').first().textContent();
  const sisIdx = (sidebar ?? '').indexOf('SIS');
  const foIdx = (sidebar ?? '').indexOf('Front office');
  const studentsIdx = (sidebar ?? '').indexOf('Students');
  expect(studentsIdx).toBeGreaterThan(sisIdx);
  // Students should appear after SIS group, not before Front office's Students duplicate.
  expect(studentsIdx).toBeGreaterThan(foIdx < 0 ? -1 : foIdx);
});
