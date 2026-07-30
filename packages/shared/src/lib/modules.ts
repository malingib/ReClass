export type ModuleStatus = 'available' | 'coming-soon';

export type ModuleIconId =
  | 'remedials'
  | 'students'
  | 'hr'
  | 'finance'
  | 'payroll'
  | 'reports'
  | 'communications';

export interface SuiteModule {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  href?: string;
  icon: ModuleIconId;
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
    description: 'Cross-school SIS: admissions, records, parent contacts and everyday administration.',
    status: 'available',
    href: '/admin/sis',
    icon: 'students',
    accent: 'blue',
  },
  {
    id: 'hr',
    name: 'HR',
    description: 'School-wide HR: staff, departments, leave administration.',
    status: 'coming-soon',
    icon: 'hr',
    accent: 'cyan',
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Teacher payroll generation, invoice tracking and payment reconciliation.',
    status: 'available',
    href: '/admin/payroll',
    icon: 'payroll',
    accent: 'indigo',
  },
  {
    id: 'communications',
    name: 'Communications',
    description: 'Announcements, notices, events, SMS and school messaging across all modules.',
    status: 'available',
    href: '/admin/communications',
    icon: 'communications',
    accent: 'orange',
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Cross-module academic, attendance, finance and leadership reporting.',
    status: 'available',
    href: '/admin/reports',
    icon: 'reports',
    accent: 'slate',
  },
  {
    id: 'finance',
    name: 'Bursar & Finance',
    description: 'School income and expense tracking, M-Pesa reconciliation and financial reports.',
    status: 'available',
    href: '/admin/finance',
    icon: 'finance',
    accent: 'rose',
  },
];

export const moduleIcons: Record<ModuleIconId, string> = {
  remedials: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
  students: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  hr: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  finance: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m13.5-1.5v.75a.75.75 0 0 1-.75.75h-.75m-12.75 12h15a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v9a1.5 1.5 0 0 0 1.5 1.5ZM6.75 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5.25-6a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z',
  payroll: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  reports: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  communications: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75',
};
