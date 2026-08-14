/**
 * eShule module registry — the single source of truth for what modules exist.
 *
 * Everything else derives from this file:
 *   - `suiteModules` / `moduleIcons`   → module hub cards, sidebar switcher, launcher
 *   - `routeFor()`                     → route → module context (switcher + audits)
 *   - `gatedModuleForPath()`           → route → owning module for the guard
 *   - `canImport()`                    → server import-boundary enforcement
 *   - provisioning semantics           → `provisionable` / `alwaysOn`
 *
 * Conventions:
 *   - Keys are the server folder names (`_remedial`); `id` is the provisioning id.
 *   - `alwaysOn` (kernel + hub) is never provisioned and never route-blocked.
 *   - `provisionable` modules appear in tenant_modules and on the super-admin page.
 *   - Routes are ordered longest-first within a module (prefix match wins).
 *   - The provisioning id for the remedial module is 'remedial' (renamed from
 *     the legacy 'reclass' in Phase 3); URL routes still use '/admin/reclass'.
 */

/** Server folders that every module may import freely. */
export const KERNEL_MODULES = ['_auth', '_platform'];

/**
 * Role-surface prefixes → module context for the switcher/accent. Context only:
 * the guard uses gatedModuleForPath() and never hard-404s these — portal shells
 * are always-on (ROLE_MODULE-as-gate died in Phase 2); features gate below.
 */
export const ROLE_SURFACE = [
  ['/super-admin', 'platform'],
  ['/teacher', 'remedial'],
  ['/parent', 'remedial'],
  ['/principal', 'remedial'],
  ['/bursar', 'finance'],
];

/** The canonical registry, keyed by server folder name. */
export const MODULES = {
  _remedial: {
    id: 'remedial',
    kind: 'satellite',
    name: 'eShule Remedial',
    description: 'Remedial classes management — groups, sessions, attendance, fees, parent payments, and reporting.',
    status: 'available',
    href: '/admin/reclass',
    icon: 'remedials',
    accent: 'emerald',
    provisionable: true,
    alwaysOn: false,
    serverDir: '_remedial',
    mayImport: ['_platform', '_auth'],
    ownsRouteGroups: ['admin/(remedial)', 'admin/reclass'],
    routes: [
      '/admin/reclass',
      '/admin/remedial/receipts',
      '/admin/remedial-fees',
      '/admin/parent-payments',
      '/admin/payroll',
      '/admin/scheduling',
      '/admin/attendance',
      // Portal feature routes keep their module gates (portal shells never do).
      '/teacher/timetable',
      '/parent/timetable',
      '/parent/fees',
      '/parent/payments',
      '/parent/pay',
      '/principal/effectiveness',
    ],
    dbDomain: 'remedial',
  },
  _sis: {
    id: 'sis',
    kind: 'hub',
    name: 'Student Information System',
    description: 'Cross-school SIS: admissions, records, parent contacts and everyday administration.',
    status: 'available',
    href: '/admin/sis',
    icon: 'students',
    accent: 'blue',
    provisionable: false,
    alwaysOn: true,
    serverDir: '_sis',
    mayImport: ['_platform', '_auth'],
    ownsRouteGroups: ['admin/(sis)'],
    // Subjects is SIS structure — the remedial program links to the catalog
    // but never owns it (Section 1 settlement). Portal feature routes below
    // keep their SIS gates (portal shells themselves are always-on).
    routes: [
      '/admin/sis', '/admin/students', '/admin/teachers', '/admin/parents', '/admin/subjects',
      '/teacher/classes',
      '/parent/child',
      '/principal/school',
    ],
    dbDomain: null,
  },
  _communications: {
    id: 'communications',
    kind: 'satellite',
    name: 'Communications',
    description: 'Announcements, notices, events, SMS and school messaging across all modules.',
    status: 'available',
    href: '/admin/communications',
    icon: 'communications',
    accent: 'orange',
    provisionable: true,
    alwaysOn: false,
    serverDir: '_communications',
    mayImport: ['_platform', '_auth'],
    ownsRouteGroups: ['admin/(communications)', 'notifications'],
    routes: ['/admin/communications'],
    dbDomain: null,
  },
  _dashboard: {
    id: 'reports',
    kind: 'rollup',
    name: 'Reports & Analytics',
    description: 'Cross-module academic, attendance, finance and leadership reporting.',
    status: 'available',
    href: '/admin/reports',
    icon: 'reports',
    accent: 'slate',
    provisionable: true,
    alwaysOn: false,
    serverDir: '_dashboard',
    // The read rollup may read every domain (kernel is always importable).
    // Latent today: cross-module server imports must target the target's
    // public surface (index/contracts/api), which lands with the SIS
    // contracts work — until then no satellite folder exposes one.
    mayImport: ['_sis', '_finance', '_remedial', '_communications'],
    ownsRouteGroups: [],
    routes: ['/admin/reports', '/principal/reports'],
    dbDomain: null,
  },
  _finance: {
    id: 'finance',
    kind: 'satellite',
    name: 'Bursar & Finance',
    description: 'School income and expense tracking, M-Pesa reconciliation and financial reports.',
    status: 'available',
    href: '/admin/finance',
    icon: 'finance',
    accent: 'rose',
    provisionable: true,
    alwaysOn: false,
    serverDir: '_finance',
    mayImport: ['_platform', '_auth'],
    ownsRouteGroups: ['admin/(finance)', 'bursar'],
    routes: [
      '/admin/payments/unmatched',
      '/admin/finance/payroll',
      '/admin/finance/receipts',
      '/admin/finance',
      '/admin/fees',
      '/admin/receipts',
      '/bursar/receipts',
      '/bursar/csv',
      '/bursar/export',
    ],
    dbDomain: 'school',
  },
  _platform: {
    id: 'platform',
    kind: 'kernel',
    name: 'Platform',
    description: 'Kernel: settings, integrations, users, audit.',
    status: 'available',
    icon: 'reports',
    accent: 'slate',
    provisionable: false,
    alwaysOn: true,
    serverDir: '_platform',
    mayImport: [],
    ownsRouteGroups: ['admin/modules'],
    routes: ['/admin/settings', '/admin/notifications', '/admin/users'],
    dbDomain: null,
  },
  _auth: {
    id: 'auth',
    kind: 'kernel',
    name: 'Auth',
    description: 'Kernel: sessions, roles, impersonation, ownership.',
    status: 'available',
    icon: 'reports',
    accent: 'slate',
    provisionable: false,
    alwaysOn: true,
    serverDir: '_auth',
    mayImport: [],
    ownsRouteGroups: ['login', 'account'],
    routes: [],
    dbDomain: null,
  },
};

/** Ordered module list (display order; route prefixes are disjoint across modules). */
export const MODULE_LIST = Object.values(MODULES);

/** Module hub cards — every module with a landing page (kernel excluded). */
export const suiteModules = MODULE_LIST.filter((m) => m.href && m.status === 'available').map((m) => ({
  id: m.id,
  name: m.name,
  description: m.description,
  status: m.status,
  href: m.href,
  icon: m.icon,
  accent: m.accent,
}));

export const moduleIcons = {
  remedials: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
  students: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  finance: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m13.5-1.5v.75a.75.75 0 0 1-.75.75h-.75m-12.75 12h15a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v9a1.5 1.5 0 0 0 1.5 1.5ZM6.75 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5.25-6a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z',
  reports: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  communications: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75',
};

/**
 * Route → owning module id for module CONTEXT (switcher, sidebar, audits).
 * Module-owned routes win, then role-surface context; '' = shared/ungated.
 * @param {string} pathname
 * @returns {import('./modules.d.ts').ModuleId | ''}
 */
export function routeFor(pathname) {
  if (pathname === '/admin' || pathname === '/admin/modules') return '';
  const owned = ownedModuleFor(pathname);
  if (owned) return owned;
  for (const [prefix, id] of ROLE_SURFACE) {
    if (pathname.startsWith(prefix)) return id;
  }
  return '';
}

/**
 * The route-guard question: module-owned routes only, never role surfaces.
 * Portal shells and shared pages resolve to '' so the guard never hard-404s
 * them — shells are always-on; feature routes gate through their owning module.
 * @param {string} pathname
 * @returns {import('./modules.d.ts').ModuleId | ''}
 */
export function gatedModuleForPath(pathname) {
  if (pathname === '/admin' || pathname === '/admin/modules') return '';
  return ownedModuleFor(pathname);
}

/** First module-owned prefix match (longest-first within each module). */
function ownedModuleFor(pathname) {
  for (const mod of MODULE_LIST) {
    for (const prefix of mod.routes) {
      if (pathname.startsWith(prefix)) return mod.id;
    }
  }
  return '';
}

const MODULE_BY_ID = new Map(MODULE_LIST.map((m) => [m.id, m]));

/**
 * True when the provisioning id belongs to a never-disabled module
 * (sis, platform, auth). The guard consults this instead of hard-coding ids.
 * @param {string} id
 * @returns {boolean}
 */
export function isAlwaysOn(id) {
  return MODULE_BY_ID.get(id)?.alwaysOn ?? false;
}

/**
 * @param {string} mod
 * @returns {boolean}
 */
export function isKernel(mod) {
  return KERNEL_MODULES.includes(mod);
}

/**
 * True when `from` may import from `to` per the registry (kernel always allowed).
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canImport(from, to) {
  if (from === to) return true;
  if (isKernel(to)) return true;
  const m = MODULES[from];
  return !!m && m.mayImport.includes(to);
}
