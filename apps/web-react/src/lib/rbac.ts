export type Role = 'super_admin' | 'school_admin' | 'principal' | 'teacher' | 'bursar' | 'parent';

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  school_admin: 'Admin',
  principal: 'Principal',
  teacher: 'Teacher',
  bursar: 'Bursar',
  parent: 'Parent',
};

export const roleHome: Record<Role, string> = {
  super_admin: '/super-admin',
  school_admin: '/admin',
  principal: '/principal',
  teacher: '/teacher',
  bursar: '/bursar',
  parent: '/parent',
};

export function isRole(r: string): r is Role {
  return r in roleHome;
}

export const ADMIN_ROLES: Role[] = ['school_admin', 'super_admin', 'principal', 'bursar'];
export const MEMBER_MANAGEMENT_ROLES: Role[] = ['school_admin', 'super_admin', 'principal'];
export const FINANCE_ROLES: Role[] = ['school_admin', 'super_admin', 'bursar'];
export const COMPLIANCE_ROLES: Role[] = ['school_admin', 'super_admin', 'principal'];
export const REPORTS_ROLES: Role[] = ['school_admin', 'super_admin', 'principal', 'bursar'];
export const SETTINGS_ROLES: Role[] = ['school_admin', 'super_admin'];
export const USER_MANAGEMENT_ROLES: Role[] = ['school_admin', 'super_admin'];
export const TRANSACTION_VIEW_ROLES: Role[] = ['school_admin', 'super_admin', 'bursar', 'principal'];
export const TEACHER_ROLES: Role[] = ['teacher', 'school_admin', 'super_admin', 'principal'];
export const PARENT_ROLES: Role[] = ['parent'];
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
