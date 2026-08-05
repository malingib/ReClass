export type Role = 'super_admin' | 'school_admin' | 'principal' | 'teacher' | 'bursar' | 'parent';

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  school_admin: 'Admin',
  principal: 'Principal',
  teacher: 'Teacher',
  bursar: 'Bursar',
  parent: 'Parent',
};

export const roleRoutes: Record<Role, string> = {
  super_admin: '/super-admin',
  school_admin: '/admin',
  principal: '/principal',
  teacher: '/teacher',
  bursar: '/bursar',
  parent: '/parent',
};

export function isRole(r: string): r is Role {
  return Object.prototype.hasOwnProperty.call(roleRoutes, r as Role);
}
