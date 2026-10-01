/**
 * Legacy redirect table for the React SPA.
 *
 * Previously App.tsx carried ~134 individual `<Route path … element={<Navigate …>} />`
 * entries acting as a redirect registry. They are collapsed here into a single
 * lookup table plus a small set of wildcard prefix rules, served by
 * `<LegacyRedirect />` behind scoped `/*` routes.
 *
 * React Router v6 ranks static routes above splats, so canonical routes
 * (e.g. `/admin/settings/profile`) always win over `/admin/*`. Only paths
 * with no canonical match reach the legacy handler.
 *
 * Two entries point at a second legacy hop in the old table
 * (`/admin/class-routine` and `/admin/class-schedule` → `/admin/timetable`,
 * which itself redirects). They are mapped directly to the final canonical
 * target (`/admin/scheduling`) to avoid a double redirect.
 */

export const LEGACY_REDIRECTS: Record<string, string> = {
  '/admin/login': '/login',
  '/admin/teacher-dashboard': '/teacher',
  '/admin/student-dashboard': '/admin/students',
  '/admin/parent-dashboard': '/parent',
  '/admin/sis': '/admin/students',
  '/admin/sis/classes': '/admin/classes',
  '/admin/student-attendance-history': '/admin/teacher-attendance',
  '/admin/guardians': '/admin/parents',
  '/admin/classrooms': '/admin/classes',
  '/admin/class-section': '/admin/classes',
  '/admin/class-routine': '/admin/scheduling',
  '/admin/class-schedule': '/admin/scheduling',
  '/admin/curriculum': '/admin/subjects',
  '/admin/syllabus': '/admin/subjects',
  '/admin/timetable': '/admin/scheduling',
  '/admin/teacher-timetable': '/admin/scheduling',
  '/admin/homework': '/teacher/tasks',
  '/admin/lesson-planning': '/admin/scheduling',
  '/admin/study-materials': '/admin/scheduling',
  // Examinations removed — no exam tables shipped yet.
  '/admin/exams': '/admin/classes',
  '/admin/exam-types': '/admin/classes',
  '/admin/schedule-exam': '/admin/classes',
  '/admin/admit-card': '/admin/classes',
  '/admin/marks-entry': '/admin/classes',
  '/admin/grade-setup': '/admin/classes',
  '/admin/exam-attendance': '/admin/classes',
  '/admin/exam-results': '/admin/classes',
  '/admin/report-cards': '/admin/classes',
  '/admin/performance-analytics': '/admin/classes',
  '/admin/subject-performance': '/admin/classes',
  '/admin/progress-reports': '/admin/classes',
  '/admin/ranking-system': '/admin/classes',
  // HRM: payroll lives under Finance; holidays under the School Calendar.
  '/admin/employee-payroll': '/finance/payroll',
  '/admin/salary-structure': '/finance/payroll',
  '/admin/payslips': '/finance/payroll',
  '/admin/leave-policies': '/admin/settings',
  '/admin/attendance-rules': '/admin/teacher-attendance',
  '/admin/holidays': '/admin/calendar',
  '/admin/student-attendance': '/admin/teacher-attendance',
  '/admin/staff-attendance': '/admin/teacher-attendance',
  '/admin/biometric-rfid': '/admin/teacher-attendance',
  '/admin/leave-list': '/admin/settings',
  // Finance aliases.
  '/admin/fees-assign': '/admin/fees',
  '/admin/collect-fees': '/admin/fees',
  '/admin/fees-type': '/admin/fees',
  '/admin/fees-group': '/admin/fees',
  '/admin/fine-management': '/admin/fees',
  '/admin/scholarships': '/admin/fees',
  '/finance/bank-transactions': '/finance/payment-history',
  '/finance/online-payments': '/finance/payment-history',
  '/finance/refunds': '/finance/payment-history',
  '/finance/expense-category': '/admin/fees/structure',
  '/finance/ledger': '/finance/reports',
  '/finance/tax-reports': '/admin/reports/fee-collection',
  // Campus Operations removed — outside remedial + finance scope.
  '/admin/sports': '/admin',
  '/admin/players': '/admin',
  '/admin/assets': '/admin',
  '/admin/asset-allocation': '/admin',
  '/admin/asset-maintenance': '/admin',
  '/admin/stock-management': '/admin',
  // Communication removed — no messaging backend ships with this deployment.
  '/comms': '/',
  '/admin/notice-board': '/',
  '/admin/broadcast-scheduler': '/',
  '/notifications': '/',
  '/admin/workflow-rules': '/',
  '/admin/trigger-actions': '/',
  '/admin/scheduled-tasks': '/',
  // Reports aliases — live data only.
  '/admin/reports/attendance': '/admin/teacher-attendance',
  '/admin/reports/academic': '/admin/reports',
  '/admin/reports/student-performance': '/admin/reports',
  '/admin/reports/class-analytics': '/admin/reports',
  '/admin/reports/grade': '/admin/reports',
  // Achievements & Certificates removed — use student records.
  '/admin/student-awards': '/admin/students',
  '/admin/competitions': '/admin/students',
  '/admin/certificate-records': '/admin/students',
  '/admin/generate-certificates': '/admin/students',
  '/admin/student-id-cards': '/admin/students',
  '/admin/bonafide-certificate': '/admin/students',
  '/admin/transfer-certificate': '/admin/students',
  // Multi-school administration consolidated under super-admin.
  '/admin/subscription-plans': '/super-admin',
  '/admin/plan-features': '/super-admin',
  '/admin/usage-limits': '/super-admin',
  '/admin/branch-management': '/super-admin',
  '/admin/franchise-setup': '/super-admin',
  '/admin/app-settings': '/admin/settings',
  '/admin/api-keys': '/admin/settings',
  '/admin/push-configurations': '/admin/settings',
  // Settings aliases — only non-canonical sub-pages are listed here.
  '/admin/settings/security': '/admin/settings/profile',
  '/admin/settings/preferences': '/admin/settings',
  '/admin/settings/grading-rules': '/admin/settings',
  '/admin/settings/email': '/admin/settings',
  '/admin/settings/sms': '/admin/settings',
  '/admin/settings/localization': '/admin/settings',
  '/admin/settings/integrations': '/admin/settings',
  '/admin/settings/otp': '/admin/settings',
  '/admin/settings/social-auth': '/admin/settings',
  '/admin/settings/sessions': '/admin/settings',
  '/admin/settings/login-activity': '/admin/settings',
  '/admin/settings/activity-logs': '/admin/settings',
  '/admin/settings/class-settings': '/admin/settings',
  '/admin/settings/subject-settings': '/admin/settings',
  '/admin/settings/academic-general': '/admin/settings',
  '/admin/settings/religion': '/admin/settings',
  '/admin/settings/section-settings': '/admin/settings',
  '/admin/settings/timetable-settings': '/admin/settings',
  '/admin/settings/exam-settings': '/admin/settings',
  '/admin/settings/payment-gateways': '/admin/settings',
  '/admin/settings/tax-rates': '/admin/settings',
  '/admin/settings/invoice-settings': '/admin/settings',
  '/admin/settings/fee-rules': '/admin/settings',
  '/admin/settings/discount-rules': '/admin/settings',
  '/admin/settings/email-templates': '/admin/settings',
  '/admin/settings/gdpr': '/admin/settings',
  '/admin/settings/language': '/admin/settings',
  '/admin/settings/prefixes': '/admin/settings',
  '/admin/settings/api-keys': '/admin/settings',
  // ReClass alias.
  '/admin/remedial-fees': '/admin/fee',
  // Operations (legacy productivity surfaces).
  '/admin/chat': '/admin',
  '/admin/call': '/admin',
  '/admin/email': '/admin',
  '/admin/notes': '/admin',
  '/admin/todo': '/admin',
  '/admin/files': '/admin',
};

/** Prefix rules backing the old `<Route path="…/*">` entries. Trailing slash required. */
export const LEGACY_PREFIX_REDIRECTS: { prefix: string; to: string }[] = [
  { prefix: '/admin/library/', to: '/admin' },
  { prefix: '/admin/transport/', to: '/admin' },
  { prefix: '/admin/hostel/', to: '/admin' },
  { prefix: '/admin/cafeteria/', to: '/admin' },
  { prefix: '/admin/security/', to: '/admin' },
  { prefix: '/admin/medical/', to: '/admin' },
  { prefix: '/admin/communications/', to: '/' },
  { prefix: '/admin/sms/', to: '/' },
  { prefix: '/admin/whatsapp/', to: '/' },
  { prefix: '/admin/notifications/', to: '/' },
  { prefix: '/admin/ai/', to: '/admin/reports' },
];

/** Exact base paths for the wildcard groups above (so `/admin/library` also matches). */
export const LEGACY_PREFIX_BASES: Record<string, string> = {
  '/admin/library': '/admin',
  '/admin/transport': '/admin',
  '/admin/hostel': '/admin',
  '/admin/cafeteria': '/admin',
  '/admin/security': '/admin',
  '/admin/medical': '/admin',
  '/admin/communications': '/',
  '/admin/sms': '/',
  '/admin/whatsapp': '/',
  '/admin/notifications': '/',
  '/admin/ai': '/admin/reports',
};

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

/** Resolve a legacy path to its redirect target, or null when not a legacy path. */
export function resolveLegacyRedirect(pathname: string): string | null {
  const path = normalize(pathname);
  const exact = LEGACY_REDIRECTS[path] ?? LEGACY_PREFIX_BASES[path];
  if (exact) return exact;
  for (const { prefix, to } of LEGACY_PREFIX_REDIRECTS) {
    if (path.startsWith(prefix)) return to;
  }
  return null;
}
