export { ROUTE_LOGIN, PUBLIC_ROUTES, CONTENT_SECURITY_POLICY,
  COOKIE_USER_TTL_SECONDS, COOKIE_USER_NAME, COOKIE_ROLE_NAME,
  TENANT_ID, EXPORT_MAX_ROWS, EXPORT_BURSA_MAX_ROWS,
  PAGE_LIST_LARGE, PAGE_LIST_MEDIUM, PAGE_LIST_SMALL, PAGE_OVERVIEW,
  WAIVERS_LIST_LIMIT, WAIVERS_SEARCH_LIMIT, NOTIFICATION_RETRY_MAX } from './config.js';

export {
  suiteModules,
  moduleIcons,
  MODULES,
  MODULE_LIST,
  KERNEL_MODULES,
  ROLE_SURFACE,
  routeFor,
  gatedModuleForPath,
  isAlwaysOn,
  isKernel,
  canImport,
} from './modules.js';
export type {
  SuiteModule,
  ModuleStatus,
  ModuleIconId,
  ModuleId,
  ModuleKind,
  ModuleAccent,
  ModuleDef,
  ServerModuleKey,
} from './modules.js';

export { roleLabels, roleRoutes, isRole } from './auth.js';
export type { Role } from './auth.js';

export { formatNotificationDate, getStoredReadNotificationIds,
  markNotificationAsRead, markAllNotificationsRead, normalizeNotification,
  getNotificationToneClass, shouldSurfaceToast, dispatchNotificationToast,
  getStoredSeenNotificationIds, markNotificationSeen, surfaceNotificationToast,
  dispatchToast } from './notifications.js';
export type { NotificationItem, NotificationPriority } from './notifications.js';

export { default as DashboardContent } from './components/DashboardContent.svelte';
export { default as LoadingButton } from './components/LoadingButton.svelte';
export { default as KpiCard } from './components/KpiCard.svelte';
export { default as EnhancedKpiCard } from './components/EnhancedKpiCard.svelte';
export { default as RecentActivity } from './components/RecentActivity.svelte';
export { default as LineChart } from './components/charts/LineChart.svelte';
export { chartTheme } from './components/charts/theme';
export { default as Button } from './components/ui/button.svelte';
export { default as Card } from './components/ui/card.svelte';
export { default as CardContent } from './components/ui/card-content.svelte';
export { default as CardHeader } from './components/ui/card-header.svelte';
export { default as Skeleton } from './components/ui/skeleton.svelte';
export { cn } from './components/ui/utils.js';
