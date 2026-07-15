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
    href: '/remedials',
    icon: 'remedials',
    accent: 'emerald',
  },
  {
    id: 'student-information',
    name: 'Student Information',
    description: 'Admissions, student records, parent contacts, and everyday school administration.',
    status: 'coming-soon',
    icon: 'students',
    accent: 'blue',
  },
  {
    id: 'academics',
    name: 'Academics',
    description: 'Classes, subjects, timetables, examinations, and academic progress.',
    status: 'coming-soon',
    icon: 'academics',
    accent: 'amber',
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'School-wide registers for students, teachers, and staff.',
    status: 'coming-soon',
    icon: 'attendance',
    accent: 'rose',
  },
  {
    id: 'fees-finance',
    name: 'Fees & Finance',
    description: 'Fee collection, invoices, expenses, income, and account reconciliation.',
    status: 'coming-soon',
    icon: 'finance',
    accent: 'indigo',
  },
  {
    id: 'hr-payroll',
    name: 'HR & Payroll',
    description: 'Staff, departments, leave, payroll, and workforce records.',
    status: 'coming-soon',
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
    status: 'coming-soon',
    icon: 'reports',
    accent: 'slate',
  },
];
