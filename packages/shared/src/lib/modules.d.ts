export type ModuleStatus = 'available' | 'coming-soon';

export type ModuleKind = 'kernel' | 'hub' | 'satellite' | 'rollup';

export type ServerModuleKey =
  | '_auth'
  | '_platform'
  | '_sis'
  | '_remedial'
  | '_finance'
  | '_communications'
  | '_dashboard';

/** Provisioning ids — the values stored in tenant_modules.module_id. */
export type ModuleId =
  | 'auth'
  | 'platform'
  | 'sis'
  | 'remedial'
  | 'finance'
  | 'communications'
  | 'reports';

export type ModuleIconId = 'remedials' | 'students' | 'finance' | 'reports' | 'communications';

export type ModuleAccent = 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'orange' | 'slate';

export interface ModuleDef {
  id: ModuleId;
  kind: ModuleKind;
  name: string;
  description: string;
  status: ModuleStatus;
  href?: string;
  icon: ModuleIconId;
  accent: ModuleAccent;
  /** Kernel + hub (sis) are never provisioned and never route-blocked. */
  provisionable: boolean;
  alwaysOn: boolean;
  serverDir: ServerModuleKey;
  /** Additional server folders this module may import (kernel always allowed). */
  mayImport: readonly ServerModuleKey[];
  ownsRouteGroups: readonly string[];
  /** Ordered longest-first; first prefix match wins in routeFor(). */
  routes: readonly string[];
  dbDomain: 'school' | 'remedial' | null;
}

export interface SuiteModule {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  href?: string;
  icon: ModuleIconId;
  accent: ModuleAccent;
}

export const MODULES: Record<ServerModuleKey, ModuleDef>;

export const MODULE_LIST: readonly ModuleDef[];

export const KERNEL_MODULES: readonly ServerModuleKey[];

/** Ungated kernel pages, classified as platform for reporting/audits. */
export const KERNEL_ROUTES: readonly string[];

export const PUBLIC_SURFACE: readonly string[];

export const ROLE_SURFACE: ReadonlyArray<readonly [string, ModuleId]>;

export const suiteModules: readonly SuiteModule[];

export const moduleIcons: Record<ModuleIconId, string>;

export function routeFor(pathname: string): ModuleId | '';

/** Module-owned routes only (never role surfaces); the guard's gate question. */
export function gatedModuleForPath(pathname: string): ModuleId | '';

/** True for never-disabled provisioning ids (sis, platform, auth). */
export function isAlwaysOn(id: string): boolean;

export function isKernel(mod: string): boolean;

export function canImport(from: string, to: string): boolean;
