// Route → module ownership map. Single source of truth for BOTH the client
// sidebar (AppShell module switcher + group filtering) and the server route
// guard (hard 404 for disabled modules). Keep this in sync with ROUTE_MODULE
// usage — first prefix match wins, so order most-specific first.
export const ROUTE_MODULE: Array<[string, string]> = [
  ['/admin/reclass', 'reclass'],
  ['/admin/payments/unmatched', 'finance'],
  ['/admin/finance/payroll', 'finance'],
  ['/admin/finance/receipts', 'finance'],
  ['/admin/finance', 'finance'],
  ['/admin/fees', 'finance'],
  ['/admin/remedial/receipts', 'reclass'],
  ['/admin/remedial-fees', 'reclass'],
  ['/admin/parent-payments', 'reclass'],
  ['/admin/payroll', 'reclass'],
  ['/admin/receipts', 'finance'],
  ['/admin/reports', 'reports'],
  ['/admin/sis', 'sis'],
  ['/admin/communications', 'communications'],
  ['/admin/students', 'sis'],
  ['/admin/teachers', 'sis'],
  ['/admin/parents', 'sis'],
  ['/admin/subjects', 'sis'],
  ['/admin/scheduling', 'reclass'],
  ['/admin/attendance', 'reclass'],
  ['/admin/credentials', 'platform'],
  ['/admin/settings', 'platform'],
  ['/admin/notifications', 'platform'],
  ['/admin/users', 'platform'],
];

/** Module id owning a path, or '' when no module owns it (launcher, shared pages). */
export function moduleForPath(pathname: string): string {
  if (pathname === '/admin' || pathname === '/admin/modules') return '';
  for (const [prefix, mod] of ROUTE_MODULE) {
    if (pathname.startsWith(prefix)) return mod;
  }
  for (const [prefix, mod] of ROLE_MODULE) {
    if (pathname.startsWith(prefix)) return mod;
  }
  return '';
}

/**
 * Role-surface → module. Gates the non-admin role portals (teacher/parent/
 * principal/bursar) behind their owning module so a tenant with that module
 * disabled gets a hard 404 instead of an orphaned portal. Kept SEPARATE from
 * ROUTE_MODULE (AppShell uses only ROUTE_MODULE for the module switcher /
 * "All modules" back-link — role pages must not show those).
 * super-admin → platform (never provisioned, never blocked).
 */
export const ROLE_MODULE: Array<[string, string]> = [
  ['/super-admin', 'platform'],
  ['/teacher', 'reclass'],
  ['/parent', 'reclass'],
  ['/principal', 'reclass'],
  ['/bursar', 'finance'],
];
