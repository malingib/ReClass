/**
 * Module boundary map — single source of truth (Phase B1).
 *
 * One object per server domain under `src/lib/server/_<key>`.
 *
 *   key        directory name without the leading underscore
 *   label      human name
 *   mayImport  other module keys this module is allowed to import from.
 *              Cross-module imports are additionally restricted to the
 *              target module's `api.ts` surface, enforced by
 *              scripts/check-module-boundaries.mjs.
 *   ownsRoutes route groups under src/routes/ whose server logic belongs
 *              to this module (used by the boundary checker + docs parity)
 *   dbDomain   value stamped into `payments.domain` / `payroll_runs.domain`
 *              for money-writing modules (finance | remedial), or null
 *              for read/platform modules (sis, communications, dashboard…).
 */
export const MODULE_KEYS = [
	'_auth',
	'_platform',
	'_sis',
	'_finance',
	'_remedial',
	'_communications',
	'_dashboard',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleBoundary = {
	key: ModuleKey;
	label: string;
	mayImport: ReadonlyArray<ModuleKey>;
	ownsRoutes: ReadonlyArray<string>;
	dbDomain: 'school' | 'remedial' | null;
};

export const MODULES: Record<ModuleKey, ModuleBoundary> = {
	// Cross-cutting auth/session/impersonation. Leaf — never reaches into
	// another module. Other modules call it via its api surface.
	_auth: {
		key: '_auth',
		label: 'Auth',
		mayImport: [],
		ownsRoutes: ['login', 'account'],
		dbDomain: null,
	},

	// Shared kernel: tenant context, paginatedQuery, credentials, modules
	// registry, audit log, contracts/. Leaf — never reaches into a domain.
	_platform: {
		key: '_platform',
		label: 'Platform',
		mayImport: [],
		ownsRoutes: ['admin/modules', 'admin/credentials'],
		dbDomain: null,
	},

	// School information system: students, teachers, parents, subjects,
	// classes, guardians. Writes identity/structure, no money.
	_sis: {
		key: '_sis',
		label: 'SIS',
		mayImport: ['_platform', '_auth'],
		ownsRoutes: ['admin/(sis)'],
		dbDomain: null,
	},

	// School fees + payroll + expenses — bank/KCB rail only.
	_finance: {
		key: '_finance',
		label: 'Finance (school fees)',
		mayImport: ['_platform', '_auth'],
		ownsRoutes: ['admin/(finance)', 'bursar'],
		dbDomain: 'school',
	},

	// Remedial classes: groups, sessions, attendance, M-Pesa rail.
	_remedial: {
		key: '_remedial',
		label: 'eShule Remedial',
		mayImport: ['_platform', '_auth'],
		ownsRoutes: ['admin/(remedial)', 'admin/reclass'],
		dbDomain: 'remedial',
	},

	// Notifications, announcements, templates, SMS drain.
	_communications: {
		key: '_communications',
		label: 'Communications',
		mayImport: ['_platform', '_auth'],
		ownsRoutes: ['admin/(communications)', 'notifications'],
		dbDomain: null,
	},

	// Cross-module read-only rollups. May read every domain, writes nothing.
	// Anything that would write from _dashboard is architecture smell.
	_dashboard: {
		key: '_dashboard',
		label: 'Dashboard rollups',
		mayImport: ['_platform'],
		ownsRoutes: [],
		dbDomain: null,
	},
} as const;

/** Money-writing modules — used by the boundary checker to flag a domain
 * mismatch (e.g., _finance code stamping `domain: 'remedial'`). */
export const MONEY_MODULES: ReadonlyArray<ModuleKey> = ['_finance', '_remedial'];

/** True when `from` may import anything from `to` per the table above. */
export function canImport(from: ModuleKey, to: ModuleKey): boolean {
	if (from === to) return true;
	return MODULES[from].mayImport.includes(to);
}
