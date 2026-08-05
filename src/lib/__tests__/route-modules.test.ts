import { describe, it, expect } from 'vitest';
import { ROUTE_MODULE, moduleForPath } from '../route-modules';

describe('moduleForPath', () => {
  it('maps SIS-owned routes to sis', () => {
    for (const p of ['/admin/students', '/admin/teachers', '/admin/parents', '/admin/subjects', '/admin/sis/classes']) {
      expect(moduleForPath(p)).toBe('sis');
    }
  });

  it('maps finance routes to finance', () => {
    for (const p of ['/admin/finance', '/admin/fees', '/admin/finance/payroll', '/admin/finance/receipts', '/admin/receipts']) {
      expect(moduleForPath(p)).toBe('finance');
    }
  });

  it('maps remedial routes to reclass', () => {
    for (const p of ['/admin/reclass', '/admin/payroll', '/admin/scheduling', '/admin/attendance', '/admin/remedial-fees', '/admin/parent-payments', '/admin/remedial/receipts']) {
      expect(moduleForPath(p)).toBe('reclass');
    }
  });

  it('maps platform routes to platform (always provisioned)', () => {
    for (const p of ['/admin/settings', '/admin/users', '/admin/credentials', '/admin/notifications']) {
      expect(moduleForPath(p)).toBe('platform');
    }
  });

  it('returns empty for launcher and shared pages (never blocked)', () => {
    for (const p of ['/admin', '/admin/modules', '/account', '/notifications', '/login', '/']) {
      expect(moduleForPath(p)).toBe('');
    }
  });

  it('maps role surfaces to their owning module', () => {
    expect(moduleForPath('/teacher')).toBe('reclass');
    expect(moduleForPath('/teacher/timetable')).toBe('reclass');
    expect(moduleForPath('/parent')).toBe('reclass');
    expect(moduleForPath('/parent/pay')).toBe('reclass');
    expect(moduleForPath('/principal')).toBe('reclass');
    expect(moduleForPath('/principal/effectiveness')).toBe('reclass');
    expect(moduleForPath('/bursar')).toBe('finance');
    expect(moduleForPath('/bursar/receipts')).toBe('finance');
  });

  it('maps super-admin to platform (never blocked)', () => {
    expect(moduleForPath('/super-admin')).toBe('platform');
    expect(moduleForPath('/super-admin/modules')).toBe('platform');
    expect(moduleForPath('/super-admin/tenants')).toBe('platform');
  });

  it('first-prefix-match wins (most specific first)', () => {
    // '/admin/finance/payroll' must resolve to finance, not be swallowed by a shorter prefix.
    expect(moduleForPath('/admin/finance/payroll')).toBe('finance');
    expect(moduleForPath('/admin/finance/receipts')).toBe('finance');
  });

  it('every ROUTE_MODULE prefix is under /admin', () => {
    for (const [prefix] of ROUTE_MODULE) {
      expect(prefix.startsWith('/admin/')).toBe(true);
    }
  });
});
