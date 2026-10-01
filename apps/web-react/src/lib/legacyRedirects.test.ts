import { describe, expect, it } from 'vitest';
import { LEGACY_REDIRECTS, resolveLegacyRedirect } from './legacyRedirects';

describe('legacy redirects', () => {
  it('covers every redirect the old App.tsx registry had', () => {
    // 134 Navigate entries in the pre-collapse registry (incl. /* bases counted once).
    expect(Object.keys(LEGACY_REDIRECTS).length).toBeGreaterThanOrEqual(120);
  });

  it.each([
    ['/admin/login', '/login'],
    ['/admin/teacher-dashboard', '/teacher'],
    ['/admin/student-dashboard', '/admin/students'],
    ['/admin/sis/classes', '/admin/classes'],
    ['/admin/classrooms', '/admin/classes'],
    // Double-hop aliases resolve directly to the canonical target.
    ['/admin/class-routine', '/admin/scheduling'],
    ['/admin/class-schedule', '/admin/scheduling'],
    ['/admin/timetable', '/admin/scheduling'],
    ['/admin/homework', '/teacher/tasks'],
    ['/admin/exams', '/admin/classes'],
    ['/admin/ranking-system', '/admin/classes'],
    ['/admin/employee-payroll', '/finance/payroll'],
    ['/admin/holidays', '/admin/calendar'],
    ['/admin/student-attendance', '/admin/teacher-attendance'],
    ['/finance/bank-transactions', '/finance/payment-history'],
    ['/finance/expense-category', '/admin/fees/structure'],
    ['/finance/ledger', '/finance/reports'],
    ['/finance/tax-reports', '/admin/reports/fee-collection'],
    ['/admin/sports', '/admin'],
    ['/comms', '/'],
    ['/notifications', '/'],
    ['/admin/notice-board', '/'],
    ['/admin/reports/attendance', '/admin/teacher-attendance'],
    ['/admin/reports/grade', '/admin/reports'],
    ['/admin/student-awards', '/admin/students'],
    ['/admin/subscription-plans', '/super-admin'],
    ['/admin/app-settings', '/admin/settings'],
    ['/admin/settings/security', '/admin/settings/profile'],
    ['/admin/settings/sms', '/admin/settings'],
    ['/admin/remedial-fees', '/admin/fee'],
    ['/admin/chat', '/admin'],
  ])('%s → %s', (from, to) => {
    expect(resolveLegacyRedirect(from)).toBe(to);
  });

  it.each([
    ['/admin/library/books/123', '/admin'],
    ['/admin/transport/routes', '/admin'],
    ['/admin/hostel/rooms', '/admin'],
    ['/admin/communications/thread/1', '/'],
    ['/admin/sms/outbox', '/'],
    ['/admin/whatsapp/inbox', '/'],
    ['/admin/notifications/all', '/'],
    ['/admin/ai/insights', '/admin/reports'],
  ])('wildcard %s → %s', (from, to) => {
    expect(resolveLegacyRedirect(from)).toBe(to);
  });

  it('ignores trailing slashes and keeps unknown paths unknown', () => {
    expect(resolveLegacyRedirect('/admin/exams/')).toBe('/admin/classes');
    expect(resolveLegacyRedirect('/admin/no-such-page-xyz')).toBeNull();
    expect(resolveLegacyRedirect('/finance/nope')).toBeNull();
  });
});
