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
    description: 'Cross-school SIS: admissions, records, parent contacts and everyday administration beyond the ReClass module.',
    status: 'coming-soon',
    icon: 'students',
    accent: 'blue',
  },
  {
    id: 'academics',
    name: 'Academics',
    description: 'Timetables, examinations and academic progress across the full curriculum.',
    status: 'coming-soon',
    icon: 'academics',
    accent: 'amber',
  },
  {
    id: 'hr-payroll',
    name: 'HR & Payroll',
    description: 'School-wide HR: staff, departments, leave and payroll administration across all modules.',
    status: 'coming-soon',
    icon: 'people',
    accent: 'cyan',
  },
  {
    id: 'communications',
    name: 'Communications',
    description: 'Announcements, notices, events, SMS and school messaging across all modules.',
    status: 'coming-soon',
    icon: 'communications',
    accent: 'orange',
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Cross-module academic, attendance, finance and leadership reporting.',
    status: 'coming-soon',
    icon: 'reports',
    accent: 'slate',
  },
];
