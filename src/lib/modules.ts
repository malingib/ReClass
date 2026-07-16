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
    id: 'reclass',
    name: 'ReClass',
    description: 'Remedial classes management — groups, sessions, attendance, fees, parent payments, and reporting.',
    status: 'available',
    href: '/admin/reclass',
    icon: 'remedials',
    accent: 'emerald',
  },
  {
    id: 'student-information',
    name: 'Student Information System',
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
