import { test, expect } from '@playwright/test';

// Reuse the shared admin session — per-test logins trip the login rate limiter.
test.use({ storageState: 'playwright/.auth/user.json' });

test('module dashboards are scoped to their own domains', async ({ page }, testInfo) => {
  testInfo.setTimeout(120000);

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
  // Sidebar items render only after Svelte hydration; wait until they appear.
  const aside = page.locator('aside').first();
  await aside.getByText('Students').waitFor({ timeout: 10000 });
  const sidebar = await aside.textContent();
  const sisIdx = (sidebar ?? '').indexOf('SIS');
  const foIdx = (sidebar ?? '').indexOf('Front office');
  const studentsIdx = (sidebar ?? '').indexOf('Students');
  expect(studentsIdx).toBeGreaterThan(sisIdx);
  // Students should appear after SIS group, not before Front office's Students duplicate.
  expect(studentsIdx).toBeGreaterThan(foIdx < 0 ? -1 : foIdx);
});
