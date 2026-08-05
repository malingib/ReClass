/**
 * Module boundary map — single source of truth.
 *
 * Rule: src/lib/server/_<mod>/ may ONLY import from modules listed here,
 * and cross-module imports must target the target module's PUBLIC surface:
 *   - `_<mod>/index.ts`       (module barrel / api)
 *   - `_<mod>/contracts.ts`   (shared types/schemas — always allowed)
 * Anything deeper (_<mod>/<file>.ts) is private and rejected by the checker.
 *
 * `_platform` and `_auth` are kernel modules: everyone may use them.
 * `_dashboard` is a read-rollup module: allowed to read across boundaries.
 * Horizontal domain modules (_sis, _finance, _remedial, _communications)
 * NEVER import each other's internals — communicate via contracts or
 * _platform rollups.
 */

export type ModuleKey =
  | 'auth'
  | 'platform'
  | 'sis'
  | 'sheets'
  | 'finance'
  | 'remedial'
  | 'communications'
  | 'avg'
  | 'waitlist'
  | 'dashboard';

export const MODULES: readonly ModuleKey[] = [
  'auth',
  'platform',
  'sis',
  'sheets',
  'finance',
  'remedial',
  'communications',
  'avg',
  'waitlist',
  'dashboard',
] as const;

export const KERNEL_MODULES: readonly ModuleKey[] = ['auth', 'platform'] as const;

/**
 * mayImport — *additional* allowed modules beyond the kernel set.
 * Routes (src/routes/**) may import any module's public surface; the
 * checker enforces the deeper rule on server modules only.
 */
export const BOUNDARIES: Record<ModuleKey, readonly ModuleKey[]> = {
  auth: [],
  platform: [],
  sis: [],
  sheets: [],
  finance: [],
  remedial: [],
  communications: [],
  avg: [],
  waitlist: [],
  // dashboard is the cross-module read rollup — allowed to read others.
  dashboard: ['sis', 'sheets', 'finance', 'remedial', 'communications', 'avg', 'waitlist'],
} as const;

/** Files that are always "public surface" for cross-module import. */
export const PUBLIC_SURFACE = ['index.ts', 'contracts.ts', 'api.ts'] as const;

export function isKernel(mod: ModuleKey): boolean {
  return (KERNEL_MODULES as readonly string[]).includes(mod);
}

export function mayImport(from: ModuleKey, to: ModuleKey): boolean {
  if (from === to) return true;
  if (isKernel(to)) return true;
  return (BOUNDARIES[from] as readonly string[]).includes(to);
}
