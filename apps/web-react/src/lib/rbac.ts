export type Role =
  | 'super_admin'
  | 'school_admin'
  | 'principal'
  | 'teacher'
  | 'remedial_teacher'
  | 'bursar'
  | 'payroll'
  | 'reclass_chair'
  | 'reclass_secretary'
  | 'reclass_treasurer'
  | 'reclass_member'
  | 'parent';

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  school_admin: 'Admin',
  principal: 'Principal',
  teacher: 'Teacher',
  remedial_teacher: 'Remedial Teacher',
  bursar: 'Bursar',
  payroll: 'Payroll',
  reclass_chair: 'ReClass Chair',
  reclass_secretary: 'ReClass Secretary',
  reclass_treasurer: 'ReClass Treasurer',
  reclass_member: 'ReClass Committee Member',
  parent: 'Parent',
};

export const roleHome: Record<Role, string> = {
  super_admin: '/super-admin',
  school_admin: '/admin',
  principal: '/principal',
  teacher: '/teacher',
  remedial_teacher: '/teacher',
  bursar: '/bursar',
  payroll: '/payroll',
  reclass_chair: '/teacher/committee',
  reclass_secretary: '/teacher/committee',
  reclass_treasurer: '/teacher/committee/payroll',
  reclass_member: '/teacher/committee',
  parent: '/parent',
};

export function isRole(r: string): r is Role {
  return r in roleHome;
}

export const ADMIN_ROLES: Role[] = ['school_admin', 'super_admin', 'principal', 'bursar'];
export const MEMBER_MANAGEMENT_ROLES: Role[] = ['school_admin', 'super_admin', 'principal'];
export const FINANCE_ROLES: Role[] = ['school_admin', 'super_admin', 'bursar', 'payroll', 'reclass_treasurer'];
export const COMPLIANCE_ROLES: Role[] = ['school_admin', 'super_admin', 'principal'];
export const REPORTS_ROLES: Role[] = ['school_admin', 'super_admin', 'principal', 'bursar', 'payroll', 'reclass_treasurer'];
export const SETTINGS_ROLES: Role[] = ['school_admin', 'super_admin'];
export const USER_MANAGEMENT_ROLES: Role[] = ['school_admin', 'super_admin'];
export const TRANSACTION_VIEW_ROLES: Role[] = ['school_admin', 'super_admin', 'bursar', 'principal', 'reclass_treasurer'];
export const TEACHER_ROLES: Role[] = ['teacher', 'remedial_teacher', 'school_admin', 'super_admin', 'principal'];
export const PARENT_ROLES: Role[] = ['parent'];
export const RECLASS_ROLES: Role[] = ['reclass_chair', 'reclass_secretary', 'reclass_treasurer', 'reclass_member', 'remedial_teacher', 'school_admin', 'super_admin', 'principal'];
export const RECLASS_FINANCE_ROLES: Role[] = ['reclass_treasurer', 'school_admin', 'super_admin', 'principal'];
export const SUPER_ADMIN_ROLES: Role[] = ['super_admin'];

const ACTIVE_ROLE_KEY = 'eshule_active_role';

export function getStoredActiveRole(): Role | null {
  const v = localStorage.getItem(ACTIVE_ROLE_KEY);
  return v && isRole(v) ? v : null;
}

export function setStoredActiveRole(role: Role) {
  localStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export function clearStoredActiveRole() {
  localStorage.removeItem(ACTIVE_ROLE_KEY);
}
