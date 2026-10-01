export type Role = 'super_admin' | 'school_admin' | 'principal' | 'teacher' | 'remedial_teacher' | 'bursar' | 'payroll' | 'reclass_chair' | 'reclass_secretary' | 'reclass_treasurer' | 'reclass_member' | 'parent';

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin', school_admin: 'Admin', principal: 'Principal', teacher: 'Teacher', remedial_teacher: 'Remedial Teacher', bursar: 'Bursar', payroll: 'Payroll',
  reclass_chair: 'ReClass Chair', reclass_secretary: 'ReClass Secretary', reclass_treasurer: 'ReClass Treasurer', reclass_member: 'ReClass Committee Member', parent: 'Parent',
};
export const roleHome: Record<Role, string> = {
  super_admin: '/super-admin', school_admin: '/admin', principal: '/principal', teacher: '/teacher', remedial_teacher: '/teacher', bursar: '/bursar', payroll: '/payroll',
  reclass_chair: '/teacher/committee', reclass_secretary: '/teacher/committee', reclass_treasurer: '/teacher/committee/payroll', reclass_member: '/teacher/committee', parent: '/parent',
};
export function isRole(r: string): r is Role { return r in roleHome; }

export type Permission =
  | 'school.finance.view' | 'school.finance.manage' | 'school.finance.approve' | 'school.finance.reconcile' | 'school.finance.report'
  | 'reclass.programme.view' | 'reclass.programme.manage'
  | 'reclass.teaching.view' | 'reclass.teaching.manage'
  | 'reclass.attendance.view' | 'reclass.attendance.manage'
  | 'reclass.committee.view' | 'reclass.committee.manage'
  | 'reclass.finance.view' | 'reclass.finance.manage' | 'reclass.finance.approve' | 'reclass.finance.reconcile' | 'reclass.finance.report'
  | 'reclass.payments.view' | 'reclass.payments.manage'
  | 'reclass.reports.view'
  | 'users.manage' | 'settings.manage' | 'audit.view';

export const PERMISSIONS = {
  schoolFinance: { view: 'school.finance.view', manage: 'school.finance.manage', approve: 'school.finance.approve', reconcile: 'school.finance.reconcile', report: 'school.finance.report' },
  reclassProgramme: { view: 'reclass.programme.view', manage: 'reclass.programme.manage' },
  reclassTeaching: { view: 'reclass.teaching.view', manage: 'reclass.teaching.manage' },
  reclassAttendance: { view: 'reclass.attendance.view', manage: 'reclass.attendance.manage' },
  reclassCommittee: { view: 'reclass.committee.view', manage: 'reclass.committee.manage' },
  reclassFinance: { view: 'reclass.finance.view', manage: 'reclass.finance.manage', approve: 'reclass.finance.approve', reconcile: 'reclass.finance.reconcile', report: 'reclass.finance.report' },
  reclassPayments: { view: 'reclass.payments.view', manage: 'reclass.payments.manage' },
  reclassReports: { view: 'reclass.reports.view' },
  users: { manage: 'users.manage' }, settings: { manage: 'settings.manage' }, audit: { view: 'audit.view' },
} as const;
export function hasPermission(permissions: readonly string[], permission: Permission) { return permissions.includes(permission); }
export function hasAnyPermission(permissions: readonly string[], required: readonly Permission[]) { return required.some((permission) => permissions.includes(permission)); }

const ALL_PERMISSIONS: Permission[] = [
  'school.finance.view', 'school.finance.manage', 'school.finance.approve', 'school.finance.reconcile', 'school.finance.report',
  'reclass.programme.view', 'reclass.programme.manage',
  'reclass.teaching.view', 'reclass.teaching.manage',
  'reclass.attendance.view', 'reclass.attendance.manage',
  'reclass.committee.view', 'reclass.committee.manage',
  'reclass.finance.view', 'reclass.finance.manage', 'reclass.finance.approve', 'reclass.finance.reconcile', 'reclass.finance.report',
  'reclass.payments.view', 'reclass.payments.manage',
  'reclass.reports.view',
  'users.manage', 'settings.manage', 'audit.view',
];

/**
 * Canonical role → permission map. The `role_permissions` / `permissions`
 * contractor tables do not exist in the database (referenced by RLS helpers
 * but never created), so code is the source of truth until a migration ships
 * them. Keep in sync with route guards in App.tsx.
 */
export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  school_admin: ['school.finance.view', 'school.finance.manage', 'school.finance.report', 'reclass.programme.view', 'reclass.programme.manage', 'reclass.teaching.view', 'reclass.teaching.manage', 'reclass.attendance.view', 'reclass.attendance.manage', 'reclass.committee.view', 'reclass.committee.manage', 'reclass.finance.view', 'reclass.finance.manage', 'reclass.finance.report', 'reclass.payments.view', 'reclass.payments.manage', 'reclass.reports.view', 'users.manage', 'settings.manage', 'audit.view'],
  principal: ['school.finance.view', 'school.finance.report', 'reclass.programme.view', 'reclass.teaching.view', 'reclass.attendance.view', 'reclass.committee.view', 'reclass.finance.view', 'reclass.finance.report', 'reclass.payments.view', 'reclass.reports.view', 'audit.view'],
  teacher: ['reclass.teaching.view', 'reclass.attendance.view'],
  remedial_teacher: ['reclass.programme.view', 'reclass.teaching.view', 'reclass.teaching.manage', 'reclass.attendance.view', 'reclass.attendance.manage'],
  bursar: ['school.finance.view', 'school.finance.manage', 'school.finance.approve', 'school.finance.reconcile', 'school.finance.report'],
  payroll: ['school.finance.view', 'school.finance.report'],
  reclass_chair: ['reclass.programme.view', 'reclass.programme.manage', 'reclass.teaching.view', 'reclass.attendance.view', 'reclass.attendance.manage', 'reclass.committee.view', 'reclass.committee.manage', 'reclass.finance.view', 'reclass.finance.approve', 'reclass.finance.report', 'reclass.payments.view', 'reclass.reports.view'],
  reclass_secretary: ['reclass.programme.view', 'reclass.attendance.view', 'reclass.committee.view', 'reclass.committee.manage', 'reclass.reports.view'],
  reclass_treasurer: ['reclass.programme.view', 'reclass.finance.view', 'reclass.finance.manage', 'reclass.finance.reconcile', 'reclass.finance.report', 'reclass.payments.view', 'reclass.payments.manage', 'reclass.reports.view'],
  reclass_member: ['reclass.programme.view', 'reclass.attendance.view', 'reclass.committee.view', 'reclass.reports.view'],
  parent: [],
};

export function permissionsForRoles(roles: readonly Role[]): Permission[] {
  return [...new Set(roles.flatMap((r) => rolePermissions[r] ?? []))];
}

export const ADMIN_ROLES: Role[] = ['school_admin', 'super_admin', 'principal', 'bursar'];
export const MEMBER_MANAGEMENT_ROLES: Role[] = ['school_admin', 'super_admin', 'principal'];
export const FINANCE_ROLES: Role[] = ['school_admin', 'super_admin', 'bursar', 'payroll'];
export const COMPLIANCE_ROLES: Role[] = ['school_admin', 'super_admin', 'principal'];
export const REPORTS_ROLES: Role[] = ['school_admin', 'super_admin', 'principal', 'bursar', 'payroll'];
export const SETTINGS_ROLES: Role[] = ['school_admin', 'super_admin'];
export const USER_MANAGEMENT_ROLES: Role[] = ['school_admin', 'super_admin'];
export const TRANSACTION_VIEW_ROLES: Role[] = ['school_admin', 'super_admin', 'bursar', 'principal'];
export const TEACHER_ROLES: Role[] = ['teacher', 'remedial_teacher', 'school_admin', 'super_admin', 'principal'];
export const PARENT_ROLES: Role[] = ['parent'];
export const RECLASS_ROLES: Role[] = ['reclass_chair', 'reclass_secretary', 'reclass_treasurer', 'reclass_member', 'remedial_teacher', 'school_admin', 'super_admin', 'principal'];
export const RECLASS_FINANCE_ROLES: Role[] = ['reclass_treasurer', 'school_admin', 'super_admin', 'principal'];
export const RECLASS_COMMITTEE_ROLES: Role[] = ['reclass_chair', 'reclass_secretary', 'reclass_treasurer', 'reclass_member', 'school_admin', 'super_admin', 'principal'];
export const SUPER_ADMIN_ROLES: Role[] = ['super_admin'];
const ACTIVE_ROLE_KEY = 'eshule_active_role';
export function getStoredActiveRole(): Role | null { const v = localStorage.getItem(ACTIVE_ROLE_KEY); return v && isRole(v) ? v : null; }
export function setStoredActiveRole(role: Role) { localStorage.setItem(ACTIVE_ROLE_KEY, role); }
export function clearStoredActiveRole() { localStorage.removeItem(ACTIVE_ROLE_KEY); }
