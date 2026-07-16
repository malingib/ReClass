export type ModuleStatus = 'available' | 'coming-soon';

export type ModuleIcon =
  | 'remedials'
  | 'students'
  | 'academics'
  | 'attendance'
  | 'finance'
  | 'people'
  | 'communications'
  | 'reports';

export interface SuiteModule {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  href?: string;
  icon: ModuleIcon;
  accent: 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'orange' | 'slate';
}

export const suiteModules: SuiteModule[] = [
  {
    id: 'remedials',
    name: 'Remedials',
    description: 'Groups, sessions, attendance, fees, and parent progress for remedial classes.',
    status: 'available',
    href: '/admin',
    icon: 'remedials',
    accent: 'emerald',
  },
  {
    id: 'student-information',
    name: 'Student Information',
    description: 'Admissions, student records, parent contacts, and everyday school administration.',
    status: 'available',
    href: '/admin/students',
    icon: 'students',
    accent: 'blue',
  },
  {
    id: 'academics',
    name: 'Academics',
    description: 'Classes, subjects, timetables, examinations, and academic progress.',
    status: 'available',
    href: '/admin/subjects',
    icon: 'academics',
    accent: 'amber',
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'School-wide registers for students, teachers, and staff.',
    status: 'available',
    href: '/admin/attendance',
    icon: 'attendance',
    accent: 'rose',
  },
  {
    id: 'fees-finance',
    name: 'Fees & Finance',
    description: 'Fee collection, invoices, expenses, income, and account reconciliation.',
    status: 'available',
    href: '/admin/invoices',
    icon: 'finance',
    accent: 'indigo',
  },
  {
    id: 'hr-payroll',
    name: 'HR & Payroll',
    description: 'Staff, departments, leave, payroll, and workforce records.',
    status: 'available',
    href: '/admin/payroll',
    icon: 'people',
    accent: 'cyan',
  },
  {
    id: 'communications',
    name: 'Communications',
    description: 'Announcements, notices, events, SMS, and school messages.',
    status: 'coming-soon',
    icon: 'communications',
    accent: 'orange',
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Academic, attendance, finance, and leadership reporting.',
    status: 'available',
    href: '/admin/reports',
    icon: 'reports',
    accent: 'slate',
  },
];
