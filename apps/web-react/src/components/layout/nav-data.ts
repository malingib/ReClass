import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  GraduationCap,
  Wallet,
  BookOpen,
  Users,
  Building2,
  Megaphone,
  UserCog,
  ShieldCheck,
  BarChart3,
  Receipt,
  CalendarDays,
  ClipboardList,
  School,
} from 'lucide-react';
import type { Role } from '@/lib/rbac';

export type NavItem = {
  title: string;
  url?: string;
  icon?: LucideIcon;
  badge?: string;
  roles?: Role[];
  items?: NavItem[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

// Hybrid nav: satnaing's grouped structure + slash-admin's permission granularities
export const navGroups: NavGroup[] = [
  {
    title: 'General',
    items: [
      { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, roles: ['school_admin', 'super_admin', 'principal', 'bursar'] },
      { title: 'SIS', url: '/admin/sis', icon: School, roles: ['school_admin', 'super_admin', 'principal'] },
      { title: 'Students', url: '/admin/students', icon: GraduationCap, roles: ['school_admin', 'super_admin', 'principal'] },
      { title: 'Teachers', url: '/admin/teachers', icon: Users, roles: ['school_admin', 'super_admin', 'principal'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        title: 'Academics',
        icon: BookOpen,
        roles: ['school_admin', 'super_admin', 'principal'],
        items: [
          { title: 'Classes', url: '/admin/sis/classes', roles: ['school_admin', 'super_admin', 'principal'] },
          { title: 'Subjects', url: '/admin/subjects', roles: ['school_admin', 'super_admin', 'principal'] },
          { title: 'Admissions', url: '/admin/admissions', roles: ['school_admin', 'super_admin', 'principal'] },
          { title: 'Timetable', url: '/admin/scheduling', roles: ['school_admin', 'super_admin', 'principal'] },
        ],
      },
      {
        title: 'Finance',
        icon: Wallet,
        roles: ['school_admin', 'super_admin', 'bursar'],
        items: [
          { title: 'Overview', url: '/finance', roles: ['school_admin', 'super_admin', 'bursar'] },
          { title: 'Fees', url: '/admin/fees', roles: ['school_admin', 'super_admin', 'bursar'] },
          { title: 'Payroll', url: '/finance/payroll', roles: ['school_admin', 'super_admin', 'bursar'] },
          { title: 'Receipts', url: '/finance/receipts', roles: ['school_admin', 'super_admin', 'bursar', 'principal'] },
          { title: 'Unmatched', url: '/admin/payments/unmatched', roles: ['school_admin', 'super_admin', 'bursar'] },
        ],
      },
    ],
  },
  {
    title: 'ReClass',
    items: [
      { title: 'ReClass', url: '/reclass', icon: ClipboardList, roles: ['school_admin', 'super_admin', 'principal'] },
      { title: 'Attendance', url: '/admin/attendance', icon: CalendarDays, roles: ['school_admin', 'super_admin', 'principal', 'teacher'] },
      { title: 'Committee', url: '/admin/committee', icon: UserCog, roles: ['school_admin', 'super_admin', 'principal'] },
      { title: 'Reports', url: '/admin/reports', icon: BarChart3, roles: ['school_admin', 'super_admin', 'principal', 'bursar'] },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Communications', url: '/comms', icon: Megaphone, roles: ['school_admin', 'super_admin', 'principal'] },
      { title: 'Users', url: '/admin/users', icon: Users, roles: ['school_admin', 'super_admin'] },
      { title: 'Bursar', url: '/bursar', icon: Wallet, roles: ['bursar'] },
      { title: 'Super Admin', url: '/super-admin', icon: ShieldCheck, roles: ['super_admin'] },
    ],
  },
];

export function filterNavByRole(groups: NavGroup[], role?: string | null): NavGroup[] {
  if (!role) return [];
  return groups
    .map((g) => {
      const items = g.items.filter((it) => {
        if (it.roles && !it.roles.includes(role as Role)) return false;
        if (it.items) {
          const children = it.items.filter((c) => !c.roles || c.roles.includes(role as Role));
          return children.length > 0;
        }
        return true;
      }).map((it) => {
        if (it.items) return { ...it, items: it.items.filter((c) => !c.roles || c.roles.includes(role as Role)) };
        return it;
      });
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);
}
