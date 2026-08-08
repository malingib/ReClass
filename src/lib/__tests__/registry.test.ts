import { describe, it, expect } from 'vitest';
import {
  suiteModules,
  MODULES,
  MODULE_LIST,
  KERNEL_MODULES,
  routeFor,
  canImport,
} from '../modules';

describe('module registry (Phase 1)', () => {
  it('exposes exactly the five hub modules, no hr or phantoms', () => {
    expect(suiteModules.map((m) => m.id)).toEqual([
      'remedial',
      'sis',
      'communications',
      'reports',
      'finance',
    ]);
    const ids = MODULE_LIST.map((m) => m.id);
    expect(ids).not.toContain('hr');
    expect(ids).not.toContain('sheets');
    expect(ids).not.toContain('avg');
    expect(ids).not.toContain('waitlist');
  });

  it('sis is the always-on hub; kernel is never provisioned', () => {
    expect(MODULES._sis.alwaysOn).toBe(true);
    expect(MODULES._sis.provisionable).toBe(false);

    expect(MODULES._platform.alwaysOn).toBe(true);
    expect(MODULES._platform.provisionable).toBe(false);
    expect(MODULES._auth.alwaysOn).toBe(true);
    expect(MODULES._auth.provisionable).toBe(false);

    const satellites: Array<keyof typeof MODULES> = ['_remedial', '_finance', '_communications', '_dashboard'];
    for (const key of satellites) {
      expect(MODULES[key].provisionable).toBe(true);
      expect(MODULES[key].alwaysOn).toBe(false);
    }

    expect(KERNEL_MODULES).toEqual(['_auth', '_platform']);
  });

  it('routeFor resolves owned routes and role-surface context', () => {
    expect(routeFor('/admin/students')).toBe('sis');
    expect(routeFor('/admin/subjects')).toBe('sis'); // subjects is SIS structure (Phase 2)
    expect(routeFor('/admin/settings')).toBe('platform');
    expect(routeFor('/admin/reports')).toBe('reports');
    expect(routeFor('/admin/finance/payroll')).toBe('finance');
    expect(routeFor('/admin/finance/receipts')).toBe('finance');
    expect(routeFor('/admin/remedial/receipts')).toBe('remedial');
    expect(routeFor('/admin/receipts')).toBe('finance');
    expect(routeFor('/teacher')).toBe('remedial');
    expect(routeFor('/teacher/timetable')).toBe('remedial');
    expect(routeFor('/parent/pay')).toBe('remedial');
    expect(routeFor('/bursar')).toBe('finance');
    expect(routeFor('/super-admin')).toBe('platform');
    expect(routeFor('/admin')).toBe('');
    expect(routeFor('/admin/modules')).toBe('');
    expect(routeFor('/account')).toBe('');
    expect(routeFor('/notifications')).toBe('');
  });

  it('boundaries: satellites may use kernel, never each other; reports reads across', () => {
    // Satellites may import kernel.
    expect(canImport('_remedial', '_platform')).toBe(true);
    expect(canImport('_finance', '_auth')).toBe(true);
    // Satellites never import each other.
    expect(canImport('_remedial', '_finance')).toBe(false);
    expect(canImport('_finance', '_remedial')).toBe(false);
    expect(canImport('_sis', '_finance')).toBe(false);
    expect(canImport('_communications', '_remedial')).toBe(false);
    // The read rollup may read every domain.
    expect(canImport('_dashboard', '_sis')).toBe(true);
    expect(canImport('_dashboard', '_finance')).toBe(true);
    expect(canImport('_dashboard', '_remedial')).toBe(true);
    expect(canImport('_dashboard', '_communications')).toBe(true);
    // Kernel-to-kernel is allowed.
    expect(canImport('_platform', '_auth')).toBe(true);
  });
});
