import { expect, test } from '@playwright/test';

// Data-backed verification: stub Supabase REST tables with fixtures so the
// stolen charts/lists render WITH data (pilot backend has none).
// Auth stays real (login with ESHULE_EMAIL / ESHULE_PASSWORD).
const STUDENTS = [
  { id: 's01', admission_no: 'ADM-001', first_name: 'Amina', last_name: 'Otieno', grade: 'Grade 7', status: 'active' },
  { id: 's02', admission_no: 'ADM-002', first_name: 'Brian', last_name: 'Kamau', grade: 'Grade 7', status: 'active' },
  { id: 's03', admission_no: 'ADM-003', first_name: 'Cynthia', last_name: 'Achieng', grade: 'Grade 7', status: 'active' },
  { id: 's04', admission_no: 'ADM-004', first_name: 'David', last_name: 'Mwangi', grade: 'Grade 7', status: 'suspended' },
  { id: 's05', admission_no: 'ADM-005', first_name: 'Esther', last_name: 'Wanjiru', grade: 'Grade 7', status: 'active' },
  { id: 's06', admission_no: 'ADM-006', first_name: 'Felix', last_name: 'Omondi', grade: 'Grade 8', status: 'active' },
  { id: 's07', admission_no: 'ADM-007', first_name: 'Grace', last_name: 'Njeri', grade: 'Grade 8', status: 'active' },
  { id: 's08', admission_no: 'ADM-008', first_name: 'Henry', last_name: 'Kiprop', grade: 'Grade 8', status: 'active' },
  { id: 's09', admission_no: 'ADM-009', first_name: 'Irene', last_name: 'Atieno', grade: 'Grade 8', status: 'graduated' },
  { id: 's10', admission_no: 'ADM-010', first_name: 'John', last_name: 'Barasa', grade: 'Grade 9', status: 'active' },
  { id: 's11', admission_no: 'ADM-011', first_name: 'Kevin', last_name: 'Oduor', grade: 'Grade 9', status: 'active' },
  { id: 's12', admission_no: 'ADM-012', first_name: 'Lydia', last_name: 'Chebet', grade: 'Grade 9', status: 'active' },
];

const FEE_TYPES = [
  { id: 'ft1', name: 'Tuition Term 1', term: 'Term 1' },
  { id: 'ft2', name: 'Activity Fee', term: 'Term 1' },
  { id: 'ft3', name: 'Lunch Programme', term: 'Term 2' },
];

const INVOICES = [
  { id: 'i1', fee_type_id: 'ft1', amount_due: 5000, amount_paid: 5000, status: 'paid', created_at: '2026-07-02T08:00:00Z', student: { first_name: 'Amina', last_name: 'Otieno', admission_no: 'ADM-001' } },
  { id: 'i2', fee_type_id: 'ft1', amount_due: 5000, amount_paid: 3000, status: 'partial', created_at: '2026-07-03T08:00:00Z', student: { first_name: 'Brian', last_name: 'Kamau', admission_no: 'ADM-002' } },
  { id: 'i3', fee_type_id: 'ft1', amount_due: 5000, amount_paid: 0, status: 'unpaid', created_at: '2026-07-04T08:00:00Z', student: { first_name: 'David', last_name: 'Mwangi', admission_no: 'ADM-004' } },
  { id: 'i4', fee_type_id: 'ft2', amount_due: 1500, amount_paid: 1500, status: 'paid', created_at: '2026-07-05T08:00:00Z', student: { first_name: 'Felix', last_name: 'Omondi', admission_no: 'ADM-006' } },
  { id: 'i5', fee_type_id: 'ft2', amount_due: 1500, amount_paid: 500, status: 'partial', created_at: '2026-08-01T08:00:00Z', student: { first_name: 'Grace', last_name: 'Njeri', admission_no: 'ADM-007' } },
  { id: 'i6', fee_type_id: 'ft1', amount_due: 5000, amount_paid: 5000, status: 'paid', created_at: '2026-08-02T08:00:00Z', student: { first_name: 'John', last_name: 'Barasa', admission_no: 'ADM-010' } },
  { id: 'i7', fee_type_id: 'ft3', amount_due: 2000, amount_paid: 0, status: 'unpaid', created_at: '2026-08-03T08:00:00Z', student: { first_name: 'Kevin', last_name: 'Oduor', admission_no: 'ADM-011' } },
  { id: 'i8', fee_type_id: 'ft2', amount_due: 1500, amount_paid: 1500, status: 'paid', created_at: '2026-06-10T08:00:00Z', student: { first_name: 'Lydia', last_name: 'Chebet', admission_no: 'ADM-012' } },
];

const PAYMENTS = [
  { id: 'p1', receipt_no: 'R-001', amount: 5000, status: 'paid', created_at: '2026-06-12T10:00:00Z', student: { first_name: 'Amina', last_name: 'Otieno', admission_no: 'ADM-001' } },
  { id: 'p2', receipt_no: 'R-002', amount: 3000, status: 'paid', created_at: '2026-07-05T10:00:00Z', student: { first_name: 'Brian', last_name: 'Kamau', admission_no: 'ADM-002' } },
  { id: 'p3', receipt_no: 'R-003', amount: 1500, status: 'paid', created_at: '2026-07-20T10:00:00Z', student: { first_name: 'Felix', last_name: 'Omondi', admission_no: 'ADM-006' } },
  { id: 'p4', receipt_no: 'R-004', amount: 5000, status: 'paid', created_at: '2026-08-04T10:00:00Z', student: { first_name: 'John', last_name: 'Barasa', admission_no: 'ADM-010' } },
  { id: 'p5', receipt_no: 'R-005', amount: 500, status: 'paid', created_at: '2026-08-10T10:00:00Z', student: { first_name: 'Grace', last_name: 'Njeri', admission_no: 'ADM-007' } },
];

const UNMATCHED = [
  { id: 'u1', phone: '0712345678', amount: 1500, created_at: '2026-09-10T09:00:00Z', reason: 'Unknown admission number', status: 'unmatched', mpesa_receipt: 'QHX7ABC123' },
  { id: 'u2', phone: '0722000111', amount: 5000, created_at: '2026-09-11T09:00:00Z', reason: 'No bill reference', status: 'unmatched', mpesa_receipt: 'QHX7DEF456' },
];

const ATTENDANCE = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date(2026, 7, 24 + i);
  return { day: d.toISOString().slice(0, 10), attended: 38 + (i % 4), absent: 4 - (i % 3), total: 42, tenant_id: 't-1' };
});

async function stubTables(page: import('@playwright/test').Page) {
  const json = (body: unknown, range?: string, partial = false) => ({
    status: partial ? 206 : 200,
    contentType: 'application/json',
    headers: range ? { 'content-range': range } : {},
    body: JSON.stringify(body),
  });
  const ranged = (rows: unknown[]) => json(rows, `0-${rows.length - 1}/${rows.length}`, true);
  // Tenant context: pilot backend lacks the tenants table — stub one school.
  await page.route('**/rest/v1/tenants**', (r) => r.fulfill(json([{ id: 't-1' }])));
  await page.route('**/rest/v1/students**', (r) => {
    // supabase-js head-count queries arrive as HEAD — answer with a bare count.
    if (r.request().method() === 'HEAD') return r.fulfill(json([], `*/${STUDENTS.length}`));
    return r.fulfill(ranged(STUDENTS));
  });
  await page.route('**/rest/v1/fee_types**', (r) => r.fulfill(json(FEE_TYPES)));
  await page.route('**/rest/v1/invoices**', (r) => {
    if (r.request().method() === 'HEAD') return r.fulfill(json([], `*/${INVOICES.length}`));
    return r.fulfill(ranged(INVOICES));
  });
  await page.route('**/rest/v1/payments**', (r) => r.fulfill(ranged(PAYMENTS)));
  await page.route('**/rest/v1/unmatched_payments**', (r) => r.fulfill(json(UNMATCHED)));
  await page.route('**/rest/v1/v_teacher_attendance_daily**', (r) => r.fulfill(json(ATTENDANCE)));
  await page.route('**/rest/v1/sis_enrollments**', (r) => r.fulfill(json([], '*/10')));
  await page.route('**/rest/v1/sis_admissions**', (r) => r.fulfill(json([], '*/3')));
}

async function realLogin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(process.env.ESHULE_EMAIL!);
  await page.locator('#login-password').fill(process.env.ESHULE_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
}

test.describe('verify steal with data (mocked REST)', () => {
  test('charts + lists render with data', async ({ page }) => {
    test.setTimeout(240000);
    test.skip(!process.env.ESHULE_EMAIL || !process.env.ESHULE_PASSWORD, 'no creds');
    await stubTables(page);
    await realLogin(page);
    const shots: [string, string][] = [
      ['/admin', 'data-admin-dashboard'],
      ['/finance', 'data-finance-overview'],
      ['/admin/fees', 'data-fee-collection'],
      ['/admin/students', 'data-students'],
      ['/finance/receipts', 'data-receipts'],
      ['/admin/payments/unmatched', 'data-unmatched'],
    ];
    for (const [path, name] of shots) {
      await page.goto(path);
      await page.waitForTimeout(3500);
      await page.screenshot({ path: `verify-shots/${name}.png`, fullPage: true });
    }
    // Open a payment detail modal on unmatched to verify the dialog UX.
    await page.goto('/admin/payments/unmatched');
    await page.getByRole('button', { name: /Unknown admission number/ }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'verify-shots/data-payment-modal.png', fullPage: false });
  });

  test('mobile: payment list + drawer + search', async ({ page }) => {
    test.setTimeout(240000);
    test.skip(!process.env.ESHULE_EMAIL || !process.env.ESHULE_PASSWORD, 'no creds');
    await page.setViewportSize({ width: 390, height: 844 });
    await stubTables(page);
    await realLogin(page);
    await page.goto('/finance/receipts');
    await page.waitForTimeout(3500);
    await page.screenshot({ path: 'verify-shots/mobile-receipts.png', fullPage: true });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'verify-shots/mobile-drawer.png', fullPage: false });
    // Drawer now closes on Escape (added with the steal) — then open search.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'verify-shots/mobile-search.png', fullPage: false });
  });
});
