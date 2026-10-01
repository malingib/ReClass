import { describe, expect, it } from 'vitest';
import {
  ADMIN_ROLES, COMPLIANCE_ROLES, FINANCE_ROLES, MEMBER_MANAGEMENT_ROLES,
  PARENT_ROLES, RECLASS_COMMITTEE_ROLES, RECLASS_FINANCE_ROLES, RECLASS_ROLES,
  REPORTS_ROLES, SETTINGS_ROLES, SUPER_ADMIN_ROLES, TEACHER_ROLES,
  TRANSACTION_VIEW_ROLES, USER_MANAGEMENT_ROLES,
  hasAnyPermission, hasPermission, isRole, permissionsForRoles,
  roleHome, roleLabels, rolePermissions, type Permission, type Role,
} from './rbac';

const ALL_ROLES: Role[] = [
  'super_admin', 'school_admin', 'principal', 'teacher', 'remedial_teacher',
  'bursar', 'payroll', 'reclass_chair', 'reclass_secretary', 'reclass_treasurer',
  'reclass_member', 'parent',
];

describe('role registry', () => {
  it('covers exactly 12 roles with labels, homes and permission lists', () => {
    expect(ALL_ROLES).toHaveLength(12);
    for (const role of ALL_ROLES) {
      expect(isRole(role)).toBe(true);
      expect(roleLabels[role]).toBeTruthy();
      expect(roleHome[role]).toMatch(/^\//);
      expect(Array.isArray(rolePermissions[role])).toBe(true);
    }
  });

  it('rejects unknown roles', () => {
    expect(isRole('student')).toBe(false);
    expect(isRole('')).toBe(false);
    expect(isRole('ADMIN')).toBe(false);
  });

  it('gives every role group only registered roles', () => {
    const groups = [
      ADMIN_ROLES, MEMBER_MANAGEMENT_ROLES, FINANCE_ROLES, COMPLIANCE_ROLES,
      REPORTS_ROLES, SETTINGS_ROLES, USER_MANAGEMENT_ROLES, TRANSACTION_VIEW_ROLES,
      TEACHER_ROLES, PARENT_ROLES, RECLASS_ROLES, RECLASS_FINANCE_ROLES,
      RECLASS_COMMITTEE_ROLES, SUPER_ADMIN_ROLES,
    ];
    for (const group of groups) {
      expect(group.length).toBeGreaterThan(0);
      for (const role of group) expect(isRole(role)).toBe(true);
    }
  });
});

describe('permission map', () => {
  it('grants super_admin the full permission set', () => {
    const all = permissionsForRoles(ALL_ROLES);
    expect(rolePermissions.super_admin).toEqual(expect.arrayContaining(all));
  });

  it('grants parent no permissions (portal is identity-scoped, not permission-scoped)', () => {
    expect(rolePermissions.parent).toEqual([]);
    expect(permissionsForRoles(['parent'])).toEqual([]);
  });

  it('keeps school finance under finance roles', () => {
    expect(hasPermission(rolePermissions.bursar, 'school.finance.manage')).toBe(true);
    expect(hasPermission(rolePermissions.teacher, 'school.finance.view')).toBe(false);
    expect(hasPermission(rolePermissions.parent, 'school.finance.view')).toBe(false);
  });

  it('keeps remedial finance under committee finance roles', () => {
    expect(hasPermission(rolePermissions.reclass_treasurer, 'reclass.finance.manage')).toBe(true);
    expect(hasPermission(rolePermissions.reclass_member, 'reclass.finance.manage')).toBe(false);
  });

  it('requires manage for attendance review, view for marking', () => {
    expect(hasPermission(rolePermissions.remedial_teacher, 'reclass.attendance.manage')).toBe(true);
    expect(hasPermission(rolePermissions.teacher, 'reclass.attendance.view')).toBe(true);
    expect(hasPermission(rolePermissions.teacher, 'reclass.attendance.manage')).toBe(false);
  });
});

describe('permission helpers', () => {
  const perms: Permission[] = ['school.finance.view', 'reclass.attendance.view'];

  it('hasPermission matches exact permission strings', () => {
    expect(hasPermission(perms, 'school.finance.view')).toBe(true);
    expect(hasPermission(perms, 'school.finance.manage')).toBe(false);
  });

  it('hasAnyPermission passes when any requirement is held', () => {
    expect(hasAnyPermission(perms, ['school.finance.manage', 'reclass.attendance.view'])).toBe(true);
    expect(hasAnyPermission(perms, ['school.finance.manage'])).toBe(false);
    expect(hasAnyPermission(perms, [])).toBe(false);
  });

  it('permissionsForRoles unions and dedupes across roles', () => {
    const merged = permissionsForRoles(['bursar', 'teacher']);
    expect(merged).toContain('school.finance.view');
    expect(merged).toContain('reclass.attendance.view');
    expect(new Set(merged).size).toBe(merged.length);
  });
});
