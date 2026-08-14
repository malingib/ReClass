import { describe, it, expect } from 'vitest';
import { routeFor, gatedModuleForPath, isAlwaysOn } from '../modules';

// Phase 2: ROUTE_MODULE/ROLE_MODULE merged into the registry
// (packages/shared/src/lib/modules.js). routeFor keeps role-surface context
// for the switcher; gatedModuleForPath is what the route guard consults.

describe('routeFor (module context)', () => {
  it('maps SIS-owned routes to sis', () => {
    // Subjects is SIS structure — flipped back from reclass in Phase 2.
    for (const p of ['/admin/students', '/admin/teachers', '/admin/parents', '/admin/sis/classes', '/admin/subjects']) {
      expect(routeFor(p)).toBe('sis');
    }
  });

  it('maps finance routes to finance', () => {
    for (const p of ['/admin/finance', '/admin/fees', '/admin/finance/payroll', '/admin/finance/receipts', '/admin/receipts', '/bursar/receipts']) {
      expect(routeFor(p)).toBe('finance');
    }
  });

  it('maps remedial routes to remedial', () => {
    for (const p of ['/admin/reclass', '/admin/payroll', '/admin/scheduling', '/admin/attendance', '/admin/remedial-fees', '/admin/parent-payments', '/admin/remedial/receipts']) {
      expect(routeFor(p)).toBe('remedial');
    }
  });

  it('maps platform routes to platform (always provisioned)', () => {
    for (const p of ['/admin/settings', '/admin/users', '/admin/notifications', '/super-admin/settings']) {
      expect(routeFor(p)).toBe('platform');
    }
  });

  it('returns empty for launcher and shared pages (never blocked)', () => {
    for (const p of ['/admin', '/admin/modules', '/account', '/notifications', '/login', '/']) {
      expect(routeFor(p)).toBe('');
    }
  });

  it('keeps role-surface context for the module switcher', () => {
    expect(routeFor('/teacher')).toBe('remedial');
    expect(routeFor('/parent')).toBe('remedial');
    expect(routeFor('/principal')).toBe('remedial');
    expect(routeFor('/bursar')).toBe('finance');
    expect(routeFor('/super-admin')).toBe('platform');
    expect(routeFor('/super-admin/tenants')).toBe('platform');
  });

  it('resolves portal feature routes to their owning module', () => {
    expect(routeFor('/teacher/timetable')).toBe('remedial');
    expect(routeFor('/parent/pay')).toBe('remedial');
    expect(routeFor('/parent/payments')).toBe('remedial');
    expect(routeFor('/principal/effectiveness')).toBe('remedial');
    expect(routeFor('/principal/reports')).toBe('reports');
    expect(routeFor('/bursar/receipts')).toBe('finance');
  });

  it('first-prefix-match wins (most specific first)', () => {
    // '/admin/finance/payroll' must resolve to finance, not a shorter prefix.
    expect(routeFor('/admin/finance/payroll')).toBe('finance');
    expect(routeFor('/admin/finance/receipts')).toBe('finance');
    // '/parent/payments' must not be swallowed by the '/parent/pay' prefix.
    expect(routeFor('/parent/payments')).toBe('remedial');
  });
});

describe('gatedModuleForPath (route guard)', () => {
  it('gates only module-owned routes — portal shells always render', () => {
    for (const p of ['/teacher', '/parent', '/principal', '/bursar']) {
      expect(gatedModuleForPath(p)).toBe('');
    }
    for (const p of ['/admin', '/admin/modules', '/account', '/notifications']) {
      expect(gatedModuleForPath(p)).toBe('');
    }
  });

  it('keeps module gates on feature routes', () => {
    expect(gatedModuleForPath('/teacher/timetable')).toBe('remedial');
    expect(gatedModuleForPath('/parent/pay')).toBe('remedial');
    expect(gatedModuleForPath('/parent/payments')).toBe('remedial');
    expect(gatedModuleForPath('/principal/effectiveness')).toBe('remedial');
    expect(gatedModuleForPath('/principal/reports')).toBe('reports');
    expect(gatedModuleForPath('/bursar/receipts')).toBe('finance');
    expect(gatedModuleForPath('/admin/reclass')).toBe('remedial');
    expect(gatedModuleForPath('/admin/finance')).toBe('finance');
    expect(gatedModuleForPath('/admin/reports')).toBe('reports');
  });
});

describe('isAlwaysOn (guard exemption)', () => {
  it('marks sis/platform/auth as never disabled', () => {
    expect(isAlwaysOn('sis')).toBe(true);
    expect(isAlwaysOn('platform')).toBe(true);
    expect(isAlwaysOn('auth')).toBe(true);
  });

  it('marks provisionable modules as blockable', () => {
    expect(isAlwaysOn('remedial')).toBe(false);
    expect(isAlwaysOn('finance')).toBe(false);
    expect(isAlwaysOn('communications')).toBe(false);
    expect(isAlwaysOn('reports')).toBe(false);
  });
});
