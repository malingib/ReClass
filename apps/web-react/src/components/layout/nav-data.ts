import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  GraduationCap,
  Heart,
  Shield,
  Users,
  UserCog,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  CheckSquare,
  Coins,
  ReceiptText,
  Wallet,
  BarChart3,
  Calendar,
  Settings,
  Lock,
  Landmark,
  BookUser,
  UsersRound,
  LayoutList,
  BookMarked,
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
  icon: LucideIcon;
  items: NavItem[];
};

const ADMIN: Role[] = ['school_admin', 'super_admin'];
const ALL_ADMIN: Role[] = ['school_admin', 'super_admin', 'principal', 'bursar'];
const TEACHER_ROLES: Role[] = ['teacher', 'remedial_teacher', 'school_admin', 'super_admin', 'principal'];
const TEACHER_ONLY: Role[] = ['teacher', 'remedial_teacher'];
const TEACHER_OVERSIGHT: Role[] = ['teacher', 'remedial_teacher', 'school_admin', 'super_admin', 'principal'];
const RECLASS_ALL: Role[] = ['reclass_chair', 'reclass_secretary', 'reclass_treasurer', 'reclass_member', 'remedial_teacher', 'school_admin', 'super_admin', 'principal'];
const RECLASS_FINANCE: Role[] = ['reclass_treasurer', 'reclass_chair', 'school_admin', 'super_admin', 'principal'];
const RECLASS_COMMITTEE: Role[] = ['reclass_chair', 'reclass_secretary', 'reclass_treasurer', 'reclass_member', 'school_admin', 'super_admin', 'principal'];
const FINANCE_ALL: Role[] = ['school_admin', 'super_admin', 'bursar', 'payroll', 'principal'];

export const navGroups: NavGroup[] = [
  {
    title: 'Main',
    icon: LayoutDashboard,
    items: [
      {
        title: 'Dashboard',
        icon: LayoutDashboard,
        roles: ALL_ADMIN,
        items: [
          { title: 'Admin Dashboard', url: '/admin', roles: ADMIN },
          { title: 'Teacher Workspace', url: '/teacher', roles: TEACHER_ROLES },
        ],
      },
    ],
  },
  {
    title: 'Parent',
    icon: Heart,
    items: [
      { title: 'Dashboard', url: '/parent', icon: LayoutDashboard, roles: ['parent'] },
      { title: 'Pay Fees', url: '/parent/pay', icon: Wallet, roles: ['parent'] },
      { title: 'Payments', url: '/parent/payments', icon: ReceiptText, roles: ['parent'] },
      { title: 'Timetable', url: '/parent/timetable', icon: CalendarClock, roles: ['parent'] },
    ],
  },
  {
    title: 'My Workspace',
    icon: GraduationCap,
    items: [
      { title: 'Dashboard', url: '/teacher', icon: LayoutDashboard, roles: TEACHER_ONLY },
      { title: 'Mark Attendance', url: '/teacher/attendance', icon: CheckSquare, roles: TEACHER_ONLY },
      { title: 'My Timetable', url: '/teacher/timetable', icon: CalendarClock, roles: TEACHER_ONLY },
      { title: 'My Routine', url: '/teacher/routine', icon: Calendar, roles: TEACHER_ONLY },
      { title: 'My Classes', url: '/teacher/classes', icon: BookOpen, roles: TEACHER_ONLY },
      { title: 'My Tasks', url: '/teacher/tasks', icon: CheckSquare, roles: TEACHER_ONLY },
    ],
  },
  {
    title: 'ReClass',
    icon: BookMarked,
    items: [
      { title: 'Dashboard', url: '/reclass', icon: LayoutDashboard, roles: RECLASS_ALL },
      { title: 'Attendance', url: '/admin/attendance', icon: CheckSquare, roles: RECLASS_ALL },
      { title: 'Review Queue', url: '/admin/attendance/review', icon: ClipboardCheck, roles: RECLASS_COMMITTEE },
      { title: 'Committee', url: '/admin/committee', icon: Users, roles: RECLASS_COMMITTEE },
      { title: 'Fees', url: '/admin/fee', icon: Coins, roles: RECLASS_FINANCE },
      { title: 'Parent Payments', url: '/admin/parent-payments', icon: ReceiptText, roles: RECLASS_FINANCE },
      { title: 'Payroll', url: '/admin/payroll', icon: Wallet, roles: RECLASS_FINANCE },
      { title: 'Scheduling', url: '/admin/scheduling', icon: CalendarClock, roles: RECLASS_ALL },
    ],
  },
  {
    title: 'People & Admission',
    icon: Users,
    items: [
      {
        title: 'Students',
        icon: GraduationCap,
        roles: ALL_ADMIN,
        items: [
          { title: 'Students', url: '/admin/students', roles: ALL_ADMIN },
          { title: 'Admissions', url: '/admin/admissions', roles: ALL_ADMIN },
          { title: 'Student Promotion', url: '/admin/student-promotion', roles: ADMIN },
          { title: 'Alumni', url: '/admin/alumni', roles: ALL_ADMIN },
          { title: 'Student Documents', url: '/admin/student-documents', roles: ALL_ADMIN },
        ],
      },
      {
        title: 'Teachers',
        icon: BookUser,
        roles: ALL_ADMIN,
        items: [
          { title: 'Teachers', url: '/admin/teachers', roles: ALL_ADMIN },
          { title: 'Add Teacher', url: '/admin/teachers/add', roles: ADMIN },
          { title: 'Routine', url: '/admin/teachers/routine', roles: ALL_ADMIN },
        ],
      },
      { title: 'Parents', url: '/admin/parents', icon: Heart, roles: ALL_ADMIN },
      {
        title: 'Staff',
        icon: UsersRound,
        roles: ALL_ADMIN,
        items: [
          { title: 'Staff List', url: '/admin/staff', roles: ALL_ADMIN },
          { title: 'Departments', url: '/admin/departments', roles: ALL_ADMIN },
          { title: 'Designation', url: '/admin/designation', roles: ALL_ADMIN },
        ],
      },
      {
        title: 'Users',
        icon: UserCog,
        roles: ADMIN,
        items: [
          { title: 'Users', url: '/admin/users', roles: ADMIN },
          { title: 'Roles & Permissions', url: '/admin/roles-permission', roles: ADMIN },
          { title: 'Delete Account Request', url: '/admin/delete-account', roles: ADMIN },
        ],
      },
    ],
  },
  {
    title: 'Academic',
    icon: BookOpen,
    items: [
      {
        title: 'Classes & Sections',
        icon: LayoutList,
        roles: ALL_ADMIN,
        items: [
          { title: 'Classes', url: '/admin/classes', roles: ALL_ADMIN },
          { title: 'Academic Calendar', url: '/admin/academic-calendar', roles: ALL_ADMIN },
        ],
      },
      {
        title: 'Subjects & Curriculum',
        icon: BookMarked,
        roles: ALL_ADMIN,
        items: [
          { title: 'Subjects', url: '/admin/subjects', roles: ALL_ADMIN },
        ],
      },
    ],
  },
  {
    title: 'Attendance',
    icon: CheckSquare,
    items: [
      { title: 'Remedial Attendance', url: '/admin/attendance', icon: CheckSquare, roles: TEACHER_OVERSIGHT },
      { title: 'Teacher Attendance', url: '/admin/teacher-attendance', icon: CheckSquare, roles: TEACHER_OVERSIGHT },
    ],
  },
  {
    title: 'Finance & Accounts',
    icon: Wallet,
    items: [
      { title: 'Dashboard', url: '/bursar', icon: LayoutDashboard, roles: ['bursar', 'payroll'] },
      {
        title: 'Fees',
        icon: Coins,
        roles: FINANCE_ALL,
        items: [
          { title: 'Fee Structure', url: '/admin/fees/structure', roles: ['school_admin', 'super_admin', 'bursar'] },
          { title: 'Fee Collection', url: '/admin/fees', roles: ['school_admin', 'super_admin', 'bursar'] },
          { title: 'Due Reports', url: '/admin/due-reports', roles: FINANCE_ALL },
          { title: 'Receipts', url: '/finance/receipts', roles: FINANCE_ALL },
        ],
      },
      {
        title: 'Billing',
        icon: ReceiptText,
        roles: ['school_admin', 'super_admin', 'bursar', 'payroll'],
        items: [
          { title: 'Invoices', url: '/finance/invoices', roles: ['school_admin', 'super_admin', 'bursar', 'payroll'] },
          { title: 'Invoice Details', url: '/finance/invoice-details', roles: ['school_admin', 'super_admin', 'bursar', 'payroll'] },
          { title: 'Payment History', url: '/finance/payment-history', roles: ['school_admin', 'super_admin', 'bursar', 'payroll'] },
        ],
      },
      {
        title: 'Accounts',
        icon: Wallet,
        roles: ['school_admin', 'super_admin', 'bursar', 'payroll'],
        items: [
          { title: 'Expenses', url: '/finance/expenses', roles: ['school_admin', 'super_admin', 'bursar'] },
          { title: 'Income', url: '/finance/income', roles: ['school_admin', 'super_admin', 'bursar'] },
          { title: 'Financial Reports', url: '/finance/financial-reports', roles: ['school_admin', 'super_admin', 'bursar', 'payroll'] },
        ],
      },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    items: [
      {
        title: 'Reports & Analytics',
        icon: BarChart3,
        roles: ALL_ADMIN,
        items: [
          { title: 'Fee Collection', url: '/admin/reports/fee-collection', roles: ALL_ADMIN },
          { title: 'Teacher Performance', url: '/admin/reports/teacher-performance', roles: ALL_ADMIN },
          { title: 'Custom Reports', url: '/admin/reports/custom', roles: ADMIN },
        ],
      },
    ],
  },
  {
    title: 'Administration',
    icon: Settings,
    items: [
      {
        title: 'Events',
        icon: Calendar,
        roles: ALL_ADMIN,
        items: [
          { title: 'Events', url: '/admin/events', roles: ALL_ADMIN },
          { title: 'Activities', url: '/admin/activities', roles: ALL_ADMIN },
        ],
      },
      { title: 'Audit Log', url: '/admin/audit', icon: Shield, roles: ['school_admin', 'super_admin', 'principal'] },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    items: [
      {
        title: 'General',
        icon: Settings,
        roles: ADMIN,
        items: [
          { title: 'School Profile', url: '/admin/settings/school', roles: ADMIN },
          { title: 'Academic Year', url: '/admin/settings/academic-year', roles: ADMIN },
        ],
      },
      {
        title: 'Account',
        icon: Lock,
        roles: ALL_ADMIN,
        items: [
          { title: 'My Profile', url: '/admin/settings/profile', roles: ALL_ADMIN },
        ],
      },
      {
        title: 'Financial Settings',
        icon: Landmark,
        roles: ['school_admin', 'super_admin', 'bursar'],
        items: [
          { title: 'Payment Settings', url: '/admin/settings/payment', roles: ['school_admin', 'super_admin', 'bursar'] },
        ],
      },
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
